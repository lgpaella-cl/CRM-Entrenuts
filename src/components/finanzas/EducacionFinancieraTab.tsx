import { useState, useMemo } from 'react'
import {
  Activity, Award, Sunset, TrendingUp, CreditCard, Flag,
  Bot, BookOpen, LayoutDashboard, ChevronDown, ChevronUp,
  Plus, Trash2, Info, Target, Lightbulb, Sparkles, Brain
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts'
import { useStore } from '../../store'
import { useFmt } from '../../hooks/useExchangeRate'
import { Modal } from '../shared/Modal'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { buildFinancialProfile } from '../../utils/financialProfile'
import type { FinancialGoal } from '../../types'

// ── Helpers ─────────────────────────────────────────────────────────────────

function sum(items: { amount_CLP: number }[]) {
  return items.reduce((s, i) => s + i.amount_CLP, 0)
}

function pct(val: number, total: number) {
  return total > 0 ? (val / total) * 100 : 0
}

function fv(pv: number, pmt: number, r: number, n: number) {
  if (r === 0) return pv + pmt * n
  return pv * Math.pow(1 + r, n) + pmt * ((Math.pow(1 + r, n) - 1) / r)
}

function monthsUntil(ym: string): number | null {
  if (!ym) return null
  const [y, m] = ym.split('-').map(Number)
  const now = new Date()
  return (y - now.getFullYear()) * 12 + (m - now.getMonth() - 1)
}

// ── Score calculation ────────────────────────────────────────────────────────

interface ScoreResult {
  total: number
  savingsRatePts: number
  debtRatioPts: number
  emergencyPts: number
  wealthPts: number
}

function calcScore(savingsRate: number, debtRatio: number, emergencyMonths: number, netWorth: number, savingsCount: number): ScoreResult {
  const savingsRatePts = savingsRate >= 20 ? 25 : savingsRate >= 10 ? 17 : savingsRate >= 5 ? 8 : 0
  const debtRatioPts   = debtRatio < 1 ? 25 : debtRatio < 2 ? 17 : debtRatio < 3 ? 8 : 0
  const emergencyPts   = emergencyMonths > 6 ? 25 : emergencyMonths >= 3 ? 17 : emergencyMonths >= 1 ? 8 : 0
  const wealthPts      = netWorth > 0 && savingsCount >= 3 ? 25 : netWorth > 0 && savingsCount >= 1 ? 17 : netWorth > 0 ? 8 : 0
  return { total: savingsRatePts + debtRatioPts + emergencyPts + wealthPts, savingsRatePts, debtRatioPts, emergencyPts, wealthPts }
}

// ── Semáforo helper ──────────────────────────────────────────────────────────

function Semaforo({ status }: { status: 'green' | 'yellow' | 'red' }) {
  const colors = { green: '#22c55e', yellow: '#f59e0b', red: '#ef4444' }
  const labels = { green: 'Óptimo', yellow: 'Mejorable', red: 'Crítico' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: colors[status] + '22', color: colors[status],
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: colors[status], display: 'inline-block' }} />
      {labels[status]}
    </span>
  )
}

// ── SVG Gauge ────────────────────────────────────────────────────────────────

function Gauge({ score }: { score: number }) {
  const radius = 70, cx = 90, cy = 90
  const circumference = Math.PI * radius
  const dashOffset = circumference * (1 - score / 100)
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444'
  const label = score >= 70 ? 'Sólido' : score >= 40 ? 'En desarrollo' : 'Requiere atención'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={180} height={110} viewBox="0 0 180 110">
        <path d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none" stroke="#e2e8f0" strokeWidth={14} />
        <path d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none" stroke={color} strokeWidth={14}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <text x={cx} y={cy - 12} textAnchor="middle" fontSize={32} fontWeight={800} fill={color}>{score}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize={12} fill="#64748b">/100</text>
        <text x={cx} y={cy + 28} textAnchor="middle" fontSize={11} fontWeight={600} fill={color}>{label}</text>
      </svg>
    </div>
  )
}

// ── MODULE 1: DIAGNÓSTICO ────────────────────────────────────────────────────

function DiagnosticoModule({ profile }: { profile: ReturnType<typeof buildFinancialProfile> }) {
  const { clp } = useFmt()
  const { summary } = profile
  const srStatus: 'green' | 'yellow' | 'red' = summary.savingsRate >= 20 ? 'green' : summary.savingsRate >= 10 ? 'yellow' : 'red'
  const drStatus: 'green' | 'yellow' | 'red' = summary.debtRatio < 1 ? 'green' : summary.debtRatio < 2 ? 'yellow' : 'red'
  const efStatus: 'green' | 'yellow' | 'red' = summary.emergencyFundMonths > 6 ? 'green' : summary.emergencyFundMonths >= 3 ? 'yellow' : 'red'

  const diagnostics = [
    {
      title: 'Patrimonio Neto',
      value: clp(summary.netWorth),
      sub: `Activos ${clp(summary.totalAssets)} − Pasivos ${clp(summary.totalLiabilities)}`,
      status: (summary.netWorth >= 0 ? 'green' : 'red') as 'green' | 'yellow' | 'red',
      why: 'El patrimonio neto mide tu riqueza real. Crecer este número mes a mes es el objetivo central.',
      icon: '🏛️',
    },
    {
      title: 'Tasa de Ahorro',
      value: `${summary.savingsRate.toFixed(1)}%`,
      sub: 'Inversión / Ingreso mensual',
      status: srStatus,
      why: 'Menos del 10%: difícil construir riqueza. 10-20%: buen ritmo. +20%: excelente.',
      icon: '💰',
    },
    {
      title: 'Ratio de Endeudamiento',
      value: `${summary.debtRatio.toFixed(2)}x`,
      sub: 'Deuda total / Ingreso anual',
      status: drStatus,
      why: 'Menor a 1x: saludable. 1-2x: moderado. Mayor a 2x: requiere plan de reducción activo.',
      icon: '⚖️',
    },
    {
      title: 'Fondo de Emergencia',
      value: `${summary.emergencyFundMonths.toFixed(1)} meses`,
      sub: 'Ahorro líquido / Gastos mensuales',
      status: efStatus,
      why: 'Protección ante imprevistos. Menos de 3 meses: vulnerable. Más de 6: bien protegido.',
      icon: '🛡️',
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Diagnóstico Financiero</h3>
        <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Evaluación automática de tu salud financiera basada en tus datos reales</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
        {diagnostics.map(d => (
          <div key={d.title} className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22 }}>{d.icon}</span>
                <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{d.title}</span>
              </div>
              <Semaforo status={d.status} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>{d.value}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10 }}>{d.sub}</div>
            <div style={{ fontSize: 12, color: '#475569', background: '#f8fafc', borderRadius: 8, padding: '8px 10px', borderLeft: '3px solid #e2e8f0' }}>
              <Info size={11} style={{ display: 'inline', marginRight: 5, color: '#94a3b8' }} />
              {d.why}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── MODULE 2: SCORE ──────────────────────────────────────────────────────────

function ScoreModule({ profile, savingsCount }: { profile: ReturnType<typeof buildFinancialProfile>; savingsCount: number }) {
  const { summary } = profile
  const score = calcScore(summary.savingsRate, summary.debtRatio, summary.emergencyFundMonths, summary.netWorth, savingsCount)

  const factors = [
    { label: 'Tasa de ahorro', pts: score.savingsRatePts, max: 25, desc: `${summary.savingsRate.toFixed(1)}%` },
    { label: 'Ratio de deuda', pts: score.debtRatioPts, max: 25, desc: `${summary.debtRatio.toFixed(2)}x` },
    { label: 'Fondo emergencia', pts: score.emergencyPts, max: 25, desc: `${summary.emergencyFundMonths.toFixed(1)} meses` },
    { label: 'Patrimonio e inversiones', pts: score.wealthPts, max: 25, desc: savingsCount > 0 ? `${savingsCount} ítems` : 'Sin inversiones' },
  ]

  const strengths: string[] = []
  const improvements: string[] = []

  if (score.savingsRatePts >= 17) strengths.push(`Excelente tasa de ahorro (${summary.savingsRate.toFixed(1)}%). Estás construyendo patrimonio activamente.`)
  else improvements.push(`Aumentar tasa de ahorro del ${summary.savingsRate.toFixed(1)}% actual hacia el 20%. Cada punto extra acelera tu libertad financiera.`)

  if (score.debtRatioPts >= 17) strengths.push(`Deuda bajo control (${summary.debtRatio.toFixed(2)}x ingreso anual). Buen manejo del crédito.`)
  else improvements.push(`Reducir deuda del ${summary.debtRatio.toFixed(2)}x actual. Prioriza pagar la deuda con mayor tasa de interés primero.`)

  if (score.emergencyPts >= 17) strengths.push(`Fondo de emergencia sólido (${summary.emergencyFundMonths.toFixed(1)} meses). Bien protegido ante imprevistos.`)
  else improvements.push(`Fortalecer fondo de emergencia a mínimo 3 meses (actual: ${summary.emergencyFundMonths.toFixed(1)}). Es tu primera línea de defensa.`)

  if (score.wealthPts >= 17) strengths.push('Patrimonio positivo y diversificado. Vas por buen camino hacia la independencia financiera.')
  else improvements.push('Diversificar inversiones. Tener capital en distintos instrumentos reduce riesgo y maximiza retorno.')

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Score Financiero</h3>
        <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Indicador global de tu salud financiera — de 0 a 100</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16, alignItems: 'start' }}>
        <div className="card" style={{ padding: 20, textAlign: 'center' }}>
          <Gauge score={score.total} />
          <p style={{ margin: '12px 0 0', fontSize: 12, color: '#64748b' }}>
            {score.total >= 70 ? 'Finanzas sólidas. Mantén el rumbo.' : score.total >= 40 ? 'Buen progreso. Hay áreas por mejorar.' : 'Atención requerida. Prioriza los fundamentos.'}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Desglose del score</p>
            {factors.map(f => (
              <div key={f.label} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: '#334155' }}>{f.label}</span>
                  <span style={{ fontWeight: 700, color: f.pts >= 17 ? '#16a34a' : f.pts >= 8 ? '#d97706' : '#dc2626' }}>
                    {f.pts}/{f.max} pts · {f.desc}
                  </span>
                </div>
                <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${(f.pts / f.max) * 100}%`, borderRadius: 3, background: f.pts >= 17 ? '#22c55e' : f.pts >= 8 ? '#f59e0b' : '#ef4444', transition: 'width 0.5s' }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="card" style={{ padding: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>✅ Fortalezas</p>
              {strengths.length === 0 ? <p style={{ fontSize: 12, color: '#94a3b8' }}>Ingresa más datos para ver fortalezas</p>
                : strengths.map((s, i) => <p key={i} style={{ fontSize: 12, color: '#334155', marginBottom: 6, lineHeight: 1.5 }}>• {s}</p>)}
            </div>
            <div className="card" style={{ padding: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>🎯 Áreas de mejora</p>
              {improvements.length === 0 ? <p style={{ fontSize: 12, color: '#94a3b8' }}>¡Sin áreas críticas!</p>
                : improvements.map((s, i) => <p key={i} style={{ fontSize: 12, color: '#334155', marginBottom: 6, lineHeight: 1.5 }}>• {s}</p>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── MODULE 3: LIBERTAD FINANCIERA ────────────────────────────────────────────

function LibertadModule({ profile }: { profile: ReturnType<typeof buildFinancialProfile> }) {
  const { clp } = useFmt()
  const { summary } = profile
  const monthlyExpenses = summary.monthlyExpenses
  const annualExpenses = monthlyExpenses * 12
  const capitalNeeded = annualExpenses / 0.04
  const netWorth = summary.netWorth
  const progress = capitalNeeded > 0 ? Math.min(100, (netWorth / capitalNeeded) * 100) : 0
  const remaining = Math.max(0, capitalNeeded - netWorth)

  const yearsToFreedom = summary.monthlyInvestments > 0 && capitalNeeded > 0
    ? Math.ceil(Math.log(capitalNeeded / Math.max(1, netWorth)) / Math.log(1 + summary.savingsRate / 100 / 12) / 12)
    : null

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>🏝️ Calculadora de Libertad Financiera</h3>
        <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Basada en la Regla del 4% — el estándar académico de independencia financiera</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {[
          { label: 'Gastos mensuales', value: clp(monthlyExpenses), sub: 'Promedio actual', color: '#dc2626', icon: '💸' },
          { label: 'Capital necesario', value: clp(capitalNeeded), sub: 'Gastos anuales ÷ 4%', color: '#7c3aed', icon: '🎯' },
          { label: 'Patrimonio actual', value: clp(netWorth), sub: 'Activos − Pasivos', color: '#2563eb', icon: '🏛️' },
          { label: 'Faltante', value: clp(remaining), sub: remaining === 0 ? '🎉 ¡Ya lo lograste!' : 'Para alcanzar la meta', color: remaining === 0 ? '#16a34a' : '#d97706', icon: remaining === 0 ? '🎉' : '📍' },
        ].map(c => (
          <div key={c.label} className="stat-card" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 28 }}>{c.icon}</span>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{c.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{c.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Progreso hacia la libertad financiera</span>
          <span style={{ fontWeight: 800, fontSize: 16, color: progress >= 50 ? '#16a34a' : '#d97706' }}>{progress.toFixed(1)}%</span>
        </div>
        <div style={{ height: 14, background: '#f1f5f9', borderRadius: 7, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ height: '100%', width: `${progress}%`, background: progress >= 80 ? '#22c55e' : progress >= 50 ? '#3b82f6' : '#f59e0b', borderRadius: 7, transition: 'width 0.8s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 16 }}>
          <span>$0</span>
          <span>Meta: {clp(capitalNeeded)}</span>
        </div>
        {yearsToFreedom && yearsToFreedom > 0 && yearsToFreedom < 100 && (
          <div style={{ background: '#eff6ff', borderRadius: 10, padding: '12px 16px', border: '1px solid #bfdbfe' }}>
            <p style={{ margin: 0, fontSize: 13, color: '#1d4ed8', fontWeight: 600 }}>
              📅 Con tu ritmo de inversión actual, podrías alcanzar la libertad financiera en aproximadamente <strong>{yearsToFreedom} años</strong>
            </p>
          </div>
        )}
        <div style={{ marginTop: 14, padding: '12px 16px', background: '#f8fafc', borderRadius: 10 }}>
          <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: '#334155' }}>¿Cómo funciona la Regla del 4%?</p>
          <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
            Si inviertes tu patrimonio en activos diversificados con retorno histórico de 7-8% anual, puedes retirar el 4% cada año sin agotar el capital. Esto significa que necesitas 25 veces tus gastos anuales para vivir de tus inversiones indefinidamente.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── MODULE 4: PROYECCIÓN DE RIQUEZA ─────────────────────────────────────────

function ProyeccionModule({ profile }: { profile: ReturnType<typeof buildFinancialProfile> }) {
  const { clp } = useFmt()
  const { summary } = profile
  const [age, setAge] = useState(35)
  const [extraSavings, setExtraSavings] = useState(summary.monthlyInvestments)
  const [annualReturn, setAnnualReturn] = useState(7)

  const retirementAge = 65
  const currentWealth = Math.max(0, summary.netWorth)

  const projections = useMemo(() => {
    const years = [5, 10, 20, retirementAge - age]
    return years.filter(y => y > 0).map(y => ({
      label: y === retirementAge - age ? `Jubilación (${retirementAge})` : `${y} años`,
      value: fv(currentWealth, extraSavings * 12, annualReturn / 100, y),
      year: y,
    }))
  }, [currentWealth, extraSavings, annualReturn, age])

  const chartData = useMemo(() => {
    const data = []
    for (let y = 0; y <= Math.min(40, retirementAge - age); y += 2) {
      data.push({ year: `Año ${y}`, valor: Math.round(fv(currentWealth, extraSavings * 12, annualReturn / 100, y)) })
    }
    return data
  }, [currentWealth, extraSavings, annualReturn, age])

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>📈 Proyección de Riqueza</h3>
        <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Simulador del crecimiento patrimonial con interés compuesto</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, alignItems: 'start' }}>
        <div className="card" style={{ padding: 18 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>Variables</p>
          {[
            { label: 'Edad actual', value: age, min: 18, max: 64, step: 1, set: setAge, suffix: 'años' },
            { label: 'Ahorro mensual', value: extraSavings, min: 0, max: 10000000, step: 50000, set: setExtraSavings, suffix: 'CLP', format: true },
            { label: 'Rentabilidad anual', value: annualReturn, min: 1, max: 20, step: 0.5, set: setAnnualReturn, suffix: '%' },
          ].map(f => (
            <div key={f.label} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: '#334155', fontWeight: 500 }}>{f.label}</span>
                <span style={{ fontWeight: 700, color: '#1e293b' }}>{f.format ? clp(f.value) : `${f.value} ${f.suffix}`}</span>
              </div>
              <input type="range" min={f.min} max={f.max} step={f.step} value={f.value}
                onChange={e => f.set(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#2563eb' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                <span>{f.format ? clp(f.min) : `${f.min}${f.suffix}`}</span>
                <span>{f.format ? clp(f.max) : `${f.max}${f.suffix}`}</span>
              </div>
            </div>
          ))}
          <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 12px', marginTop: 4 }}>
            <p style={{ fontSize: 11, color: '#15803d', margin: 0, fontWeight: 500 }}>
              Patrimonio inicial: <strong>{clp(currentWealth)}</strong>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {projections.map(p => (
              <div key={p.label} className="stat-card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>{p.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#1d4ed8' }}>{clp(p.value)}</div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>{p.value > currentWealth ? `+${clp(p.value - currentWealth)}` : '—'}</div>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 12 }}>Curva de crecimiento patrimonial</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${Math.round(Number(v) / 1000000)}M`} />
                <Tooltip formatter={(v) => clp(Number(v))} />
                <Line type="monotone" dataKey="valor" stroke="#2563eb" strokeWidth={2.5} dot={false} name="Patrimonio" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── MODULE 5: SIMULADOR DE DEUDAS ────────────────────────────────────────────

function SimuladorDeudasModule() {
  const { clp } = useFmt()
  const [amount, setAmount] = useState(5000000)
  const [rate, setRate] = useState(1.5)
  const [installments, setInstallments] = useState(24)

  const r = rate / 100
  const monthly = r > 0
    ? amount * (r * Math.pow(1 + r, installments)) / (Math.pow(1 + r, installments) - 1)
    : amount / installments
  const totalPaid = monthly * installments
  const totalInterest = totalPaid - amount

  const pieData = [
    { name: 'Capital', value: amount, color: '#3b82f6' },
    { name: 'Intereses', value: totalInterest, color: '#ef4444' },
  ]

  const amortData = useMemo(() => {
    const rows = []
    let balance = amount
    for (let i = 1; i <= Math.min(installments, 36); i++) {
      const interest = balance * r
      const principal = monthly - interest
      balance = Math.max(0, balance - principal)
      rows.push({ cuota: i, capital: Math.round(principal), interes: Math.round(interest), saldo: Math.round(balance) })
    }
    return rows
  }, [amount, r, installments, monthly])

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>🏦 Simulador de Deudas</h3>
        <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Calcula el costo real de un crédito antes de comprometerte</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, alignItems: 'start' }}>
        <div className="card" style={{ padding: 18 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>Parámetros del crédito</p>
          {[
            { label: 'Monto', value: amount, min: 100000, max: 100000000, step: 100000, set: setAmount, format: true },
            { label: 'Tasa mensual (%)', value: rate, min: 0.1, max: 5, step: 0.1, set: setRate, format: false, suffix: '%' },
            { label: 'Cuotas', value: installments, min: 1, max: 120, step: 1, set: setInstallments, format: false, suffix: ' meses' },
          ].map(f => (
            <div key={f.label} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: '#334155', fontWeight: 500 }}>{f.label}</span>
                <span style={{ fontWeight: 700, color: '#1e293b' }}>{f.format ? clp(f.value) : `${f.value}${f.suffix}`}</span>
              </div>
              <input type="range" min={f.min} max={f.max} step={f.step} value={f.value}
                onChange={e => f.set(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#dc2626' }} />
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { label: 'Cuota mensual', value: clp(monthly), color: '#1d4ed8' },
              { label: 'Total intereses', value: clp(totalInterest), color: '#dc2626' },
              { label: 'Total pagado', value: clp(totalPaid), color: '#334155' },
            ].map(c => (
              <div key={c.label} className="stat-card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>{c.label}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: c.color }}>{c.value}</div>
              </div>
            ))}
          </div>

          <div style={{ background: totalInterest / amount > 0.3 ? '#fef2f2' : '#f0fdf4', borderRadius: 10, padding: '12px 16px', border: `1px solid ${totalInterest / amount > 0.3 ? '#fecaca' : '#bbf7d0'}` }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: totalInterest / amount > 0.3 ? '#dc2626' : '#15803d' }}>
              {totalInterest / amount > 0.3
                ? `⚠️ Esta deuda te costará ${((totalInterest / amount) * 100).toFixed(0)}% adicional al monto solicitado`
                : `✅ Costo financiero del ${((totalInterest / amount) * 100).toFixed(0)}% — dentro de rangos razonables`}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="card" style={{ padding: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 10 }}>Capital vs Intereses</p>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => clp(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="card" style={{ padding: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 10 }}>Amortización (primeras cuotas)</p>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={amortData.slice(0, 12)} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="cuota" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `${Math.round(Number(v) / 1000)}k`} />
                  <Tooltip formatter={(v) => clp(Number(v))} />
                  <Bar dataKey="capital" name="Capital" fill="#3b82f6" stackId="a" />
                  <Bar dataKey="interes" name="Interés" fill="#ef4444" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── MODULE 6: METAS ──────────────────────────────────────────────────────────

const GOAL_TYPES: { value: FinancialGoal['type']; label: string; emoji: string }[] = [
  { value: 'freedom',    label: 'Libertad Financiera', emoji: '🏝️' },
  { value: 'house',      label: 'Comprar vivienda',    emoji: '🏠' },
  { value: 'retirement', label: 'Jubilación anticipada', emoji: '🌅' },
  { value: 'business',   label: 'Crear empresa',       emoji: '🚀' },
  { value: 'education',  label: 'Fondo educación',     emoji: '🎓' },
  { value: 'vehicle',    label: 'Vehículo',            emoji: '🚗' },
  { value: 'other',      label: 'Otro',                emoji: '⭐' },
]

function MetasModule({ profile }: { profile: ReturnType<typeof buildFinancialProfile> }) {
  const { clp } = useFmt()
  const { financialGoals, addFinancialGoal, deleteFinancialGoal } = useStore()
  const netWorth = profile.summary.netWorth

  const [showForm, setShowForm] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', type: 'freedom' as FinancialGoal['type'], targetAmount_CLP: '', targetDate: '', notes: '' })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    addFinancialGoal({ ...form, targetAmount_CLP: parseFloat(form.targetAmount_CLP) || 0 })
    setShowForm(false)
    setForm({ name: '', type: 'freedom', targetAmount_CLP: '', targetDate: '', notes: '' })
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>🚀 Ruta hacia tus Metas</h3>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Define y sigue el progreso de tus grandes objetivos financieros</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={14} /> Nueva meta</button>
      </div>

      {financialGoals.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px', color: '#94a3b8' }}>
          <Target size={40} style={{ margin: '0 auto 12px', display: 'block', color: '#cbd5e1' }} />
          <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 6, color: '#64748b' }}>Sin metas definidas</p>
          <p style={{ fontSize: 13 }}>Define tus grandes objetivos financieros y rastrea tu progreso automáticamente.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {financialGoals.map(g => {
            const typeInfo = GOAL_TYPES.find(t => t.value === g.type)
            const progress = Math.min(100, pct(netWorth, g.targetAmount_CLP))
            const remaining = Math.max(0, g.targetAmount_CLP - netWorth)
            const months = monthsUntil(g.targetDate)
            const monthlyRequired = months && months > 0 ? remaining / months : null
            return (
              <div key={g.id} className="card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 24 }}>{typeInfo?.emoji}</span>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', margin: 0 }}>{g.name}</p>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{typeInfo?.label}</p>
                    </div>
                  </div>
                  <button className="btn btn-danger" style={{ padding: '3px 7px' }} onClick={() => setConfirmId(g.id)}>
                    <Trash2 size={11} />
                  </button>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#1d4ed8', marginBottom: 4 }}>{clp(g.targetAmount_CLP)}</div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
                    <span>Avance: {clp(Math.min(netWorth, g.targetAmount_CLP))}</span>
                    <span>{progress.toFixed(1)}%</span>
                  </div>
                  <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3 }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: progress >= 100 ? '#22c55e' : '#3b82f6', borderRadius: 3, transition: 'width 0.5s' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#64748b' }}>
                  {g.targetDate && <span>📅 Meta: {new Date(g.targetDate + '-01').toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })} {months ? `(${months} meses)` : ''}</span>}
                  {monthlyRequired && <span style={{ color: '#d97706', fontWeight: 600 }}>💡 Requiere ahorrar {clp(monthlyRequired)}/mes</span>}
                  {g.notes && <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>{g.notes}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <Modal title="Nueva meta financiera" onClose={() => setShowForm(false)}>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><label className="label">Nombre de la meta *</label>
              <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Depto propio" /></div>
            <div><label className="label">Tipo</label>
              <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as FinancialGoal['type'] }))}>
                {GOAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
              </select></div>
            <div><label className="label">Monto objetivo (CLP) *</label>
              <input className="input" type="number" min="1" required value={form.targetAmount_CLP} onChange={e => setForm(f => ({ ...f, targetAmount_CLP: e.target.value }))} /></div>
            <div><label className="label">Fecha objetivo (mes/año)</label>
              <input className="input" type="month" value={form.targetDate} onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))} /></div>
            <div><label className="label">Notas</label>
              <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Descripción o estrategia" /></div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Guardar meta</button>
            </div>
          </form>
        </Modal>
      )}
      {confirmId && (
        <ConfirmDialog
          message={`¿Eliminar la meta "${financialGoals.find(g => g.id === confirmId)?.name}"?`}
          onConfirm={() => { deleteFinancialGoal(confirmId); setConfirmId(null) }}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}

// ── MODULE 7: COACH IA ───────────────────────────────────────────────────────

function CoachModule({ profile }: { profile: ReturnType<typeof buildFinancialProfile> }) {
  const { clp } = useFmt()
  const { summary, recentMonths, goals } = profile

  // ── Insights ────────────────────────────────────────────────────────────────
  const insights: { icon: string; type: 'success' | 'warning' | 'danger' | 'info'; title: string; text: string }[] = []

  if (summary.savingsRate >= 20) {
    insights.push({ icon: '🏆', type: 'success', title: 'Tasa de ahorro excelente', text: `Estás invirtiendo el ${summary.savingsRate.toFixed(1)}% de tus ingresos. Mantén esta disciplina — el interés compuesto hará el resto del trabajo.` })
  } else if (summary.savingsRate >= 10) {
    insights.push({ icon: '📈', type: 'info', title: 'Tasa de ahorro en desarrollo', text: `Inviertes el ${summary.savingsRate.toFixed(1)}% de tus ingresos. Incrementar un 2-3% cada trimestre te llevará al objetivo del 20% sin sentir el cambio.` })
  } else if (summary.monthlyIncome > 0) {
    insights.push({ icon: '⚠️', type: 'warning', title: 'Tasa de ahorro por debajo del mínimo', text: `Tu tasa actual es ${summary.savingsRate.toFixed(1)}%. Reducir el gasto variable en ${clp(summary.monthlyIncome * 0.1 - summary.monthlyInvestments)} mensuales te llevaría al 10% mínimo recomendado.` })
  }

  if (summary.emergencyFundMonths < 1) {
    insights.push({ icon: '🚨', type: 'danger', title: 'Sin fondo de emergencia', text: 'No tienes respaldo ante una pérdida de ingresos o emergencia médica. Prioriza acumular al menos 1 mes de gastos antes de cualquier inversión no esencial.' })
  } else if (summary.emergencyFundMonths < 3) {
    insights.push({ icon: '🛡️', type: 'warning', title: 'Fondo de emergencia insuficiente', text: `Tu fondo cubre ${summary.emergencyFundMonths.toFixed(1)} meses. Destina el 50% de tu margen libre a reforzarlo hasta alcanzar los 3 meses mínimos (${clp(summary.monthlyExpenses * 3)}).` })
  }

  if (summary.debtRatio > 2) {
    insights.push({ icon: '🔴', type: 'danger', title: 'Nivel de deuda elevado', text: `Tu deuda (${clp(summary.totalLiabilities)}) es ${summary.debtRatio.toFixed(1)}x tu ingreso anual. Considera el método avalancha: paga el mínimo en todo y destina el excedente a la deuda con mayor tasa.` })
  } else if (summary.debtRatio > 1) {
    insights.push({ icon: '⚡', type: 'warning', title: 'Deuda moderada — actúa ahora', text: `Con ${clp(summary.totalLiabilities)} en pasivos, acelerar los pagos hoy puede ahorrarte años de intereses. Revisa si puedes refinanciar a menor tasa.` })
  }

  if (recentMonths.length >= 2) {
    const last = recentMonths[0], prev = recentMonths[1]
    const varChange = last.variable - prev.variable
    const varPct = prev.variable > 0 ? (varChange / prev.variable) * 100 : 0
    if (varChange > 0 && Math.abs(varPct) > 10) {
      insights.push({ icon: '📊', type: 'warning', title: 'Gastos variables en alza', text: `Tus gastos variables subieron ${varPct.toFixed(0)}% respecto al mes anterior (+${clp(varChange)}). Revisa en qué categorías aumentó el gasto y si es recurrente.` })
    } else if (varChange < 0) {
      insights.push({ icon: '✅', type: 'success', title: 'Gastos variables controlados', text: `Bajaste los gastos variables un ${Math.abs(varPct).toFixed(0)}% versus el mes anterior. ¡Buen trabajo! Considera mover ese excedente (${clp(Math.abs(varChange))}) a inversión.` })
    }
  }

  if (summary.monthlyIncome > 0 && summary.savingsRate < 20) {
    const additionalNeeded = summary.monthlyIncome * 0.20 - summary.monthlyInvestments
    if (additionalNeeded > 0) {
      const in20y = fv(0, additionalNeeded * 12, 0.07, 20)
      insights.push({ icon: '💡', type: 'info', title: 'Oportunidad de crecimiento patrimonial', text: `Si inviertes ${clp(additionalNeeded)} mensuales adicionales para llegar al 20%, en 20 años habrías acumulado ${clp(in20y)} extra (asumiendo 7% anual).` })
    }
  }

  if (summary.netWorth < 0) {
    insights.push({ icon: '🚨', type: 'danger', title: 'Patrimonio neto negativo', text: `Tus deudas (${clp(summary.totalLiabilities)}) superan tus activos (${clp(summary.totalAssets)}). Prioriza reducir pasivos antes de cualquier otro objetivo.` })
  }

  if (insights.length === 0) {
    insights.push({ icon: '💡', type: 'info', title: 'Agrega datos para ver insights', text: 'El Coach IA analiza tus ingresos, gastos, deudas e inversiones para generar recomendaciones personalizadas. Completa tu balance mensual para activarlo.' })
  }

  // ── Recomendaciones personalizadas ──────────────────────────────────────────
  interface Recom {
    priority: 'ahora' | 'pronto' | 'después'
    icon: string
    title: string
    qué: string
    porqué: string
    plazo: string
  }
  const recomendaciones: Recom[] = []

  // Prioridad 1 — fundamentos críticos
  if (summary.emergencyFundMonths < 1 && summary.monthlyExpenses > 0) {
    recomendaciones.push({
      priority: 'ahora', icon: '🛡️',
      title: 'Construye tu colchón de seguridad primero',
      qué: `Abre una cuenta de ahorro separada y deposita ${clp(summary.monthlyExpenses)} este mes para tener al menos 1 mes de respaldo. Hazlo automático: programa una transferencia el día de tu pago.`,
      porqué: 'Sin este respaldo, cualquier imprevisto (enfermedad, reparación, pérdida de empleo) puede obligarte a endeudarte para sobrevivir, reiniciando todo tu progreso financiero.',
      plazo: 'Empezar este mes',
    })
  }

  if (summary.debtRatio > 2.5) {
    recomendaciones.push({
      priority: 'ahora', icon: '🔥',
      title: 'Ataca la deuda más cara primero',
      qué: `Lista todas tus deudas de mayor a menor tasa de interés. Paga el mínimo en todas excepto en la más cara — ahí concentra todo el dinero extra que puedas. Tu deuda actual es ${clp(summary.totalLiabilities)}.`,
      porqué: 'A tasas altas (sobre 1,5% mensual), el interés acumulado puede superar el capital. Cada mes de retraso hace la deuda más difícil de pagar. Esto es prioridad antes que cualquier inversión.',
      plazo: 'Inmediato',
    })
  }

  // Prioridad 2 — estabilización
  if (summary.emergencyFundMonths >= 1 && summary.emergencyFundMonths < 3) {
    const faltante = summary.monthlyExpenses * 3 - (summary.emergencyFundMonths * summary.monthlyExpenses)
    recomendaciones.push({
      priority: 'pronto', icon: '🛡️',
      title: 'Completa el fondo de emergencia a 3 meses',
      qué: `Te faltan ${clp(faltante)} para llegar a 3 meses de cobertura. Destina el 40-50% de lo que puedas ahorrar cada mes a este objetivo hasta completarlo. No lo mezcles con otros ahorros.`,
      porqué: '3 meses es el mínimo para sobrevivir una pérdida de empleo típica sin endeudarte. Por debajo de eso, eres vulnerable a cualquier imprevisto.',
      plazo: '3 a 6 meses',
    })
  }

  if (summary.savingsRate < 10 && summary.monthlyIncome > 0) {
    const falta = Math.max(0, summary.monthlyIncome * 0.10 - summary.monthlyInvestments)
    recomendaciones.push({
      priority: 'pronto', icon: '📈',
      title: 'Lleva tu tasa de ahorro al 10% mínimo',
      qué: `Necesitas invertir ${clp(falta)} mensuales adicionales para llegar al 10%. No intentes llegar de golpe: sube un 2% este mes, otro 2% el próximo. Revisa tus gastos variables (comidas fuera, suscripciones, ocio) — ahí suele estar el margen.`,
      porqué: 'Con menos del 10% de ahorro es casi imposible construir riqueza porque la inflación va más rápido que lo que acumulas. El 10% es el umbral mínimo para que el interés compuesto trabaje a tu favor.',
      plazo: '3 a 6 meses',
    })
  }

  if (summary.debtRatio > 1 && summary.debtRatio <= 2.5) {
    recomendaciones.push({
      priority: 'pronto', icon: '⚖️',
      title: 'Acelera el pago de deuda mientras puedas',
      qué: `Tu deuda es ${summary.debtRatio.toFixed(1)}x tu ingreso anual (${clp(summary.totalLiabilities)}). Si tienes cualquier excedente mensual, destina el 50% a pagar deuda anticipadamente. También puedes explorar refinanciar a menor tasa.`,
      porqué: 'La deuda actúa como un interés negativo: mientras más lento la pagas, más dinero pierde. Reducirla te libera flujo de caja que puedes redirigir a inversión.',
      plazo: '6 a 12 meses',
    })
  }

  // Metas personales
  goals.forEach(goal => {
    const months = monthsUntil(goal.targetDate)
    if (!months || months <= 0) return
    const remaining = Math.max(0, goal.targetAmount_CLP - summary.netWorth)
    const monthlyNeeded = remaining / months
    const typeInfo = GOAL_TYPES.find(t => t.value === goal.type)

    if (remaining <= 0) {
      recomendaciones.push({
        priority: 'después', icon: typeInfo?.emoji ?? '🎯',
        title: `¡Meta "${goal.name}" alcanzada!`,
        qué: `Tu patrimonio actual (${clp(summary.netWorth)}) ya supera tu objetivo de ${clp(goal.targetAmount_CLP)}. Considera actualizar la meta o establecer una más ambiciosa.`,
        porqué: 'Las metas cumplidas merecen reconocimiento. Revisarlas regularmente mantiene la motivación y el foco.',
        plazo: 'Revisar ahora',
      })
    } else if (monthlyNeeded > summary.monthlyInvestments * 1.5) {
      recomendaciones.push({
        priority: 'pronto', icon: typeInfo?.emoji ?? '🎯',
        title: `Meta "${goal.name}": el ritmo no alcanza`,
        qué: `Para llegar a ${clp(goal.targetAmount_CLP)} en ${months} meses necesitas ahorrar ${clp(monthlyNeeded)}/mes. Hoy inviertes ${clp(summary.monthlyInvestments)}/mes. Opciones: aumentar el ahorro, extender el plazo, o ajustar el monto objetivo.`,
        porqué: 'Una meta sin el ritmo adecuado genera frustración. Es mejor ajustar el plan ahora que descubrir en el último momento que era inalcanzable.',
        plazo: `${months} meses para la meta`,
      })
    } else if (monthlyNeeded <= summary.monthlyInvestments) {
      recomendaciones.push({
        priority: 'después', icon: typeInfo?.emoji ?? '🎯',
        title: `"${goal.name}": vas bien encaminado`,
        qué: `Con tu ritmo actual de ${clp(summary.monthlyInvestments)}/mes estás cubriendo lo necesario (${clp(monthlyNeeded)}/mes) para alcanzar ${clp(goal.targetAmount_CLP)}. Mantén la constancia y no toques ese dinero.`,
        porqué: 'La consistencia a largo plazo supera cualquier estrategia compleja. El secreto es no interrumpir el proceso.',
        plazo: `Meta en ${months} meses`,
      })
    }
  })

  // Prioridad 3 — crecimiento y optimización
  if (summary.savingsRate >= 10 && summary.savingsRate < 20 && summary.emergencyFundMonths >= 3) {
    const extra = Math.max(0, summary.monthlyIncome * 0.20 - summary.monthlyInvestments)
    recomendaciones.push({
      priority: 'después', icon: '🚀',
      title: 'Sube del 10% al 20% de tasa de ahorro',
      qué: `Estás en buen ritmo. El siguiente nivel es llegar al 20%, lo que requiere ${clp(extra)} mensuales adicionales. Revisa si hay gastos que puedas optimizar: suscripciones que no usas, comidas fuera de casa, compras impulsivas.`,
      porqué: 'Pasar del 10% al 20% puede recortar tu camino a la independencia financiera casi a la mitad. Es el salto más impactante que puedes hacer.',
      plazo: '6 a 12 meses',
    })
  }

  if (summary.savingsRate >= 20 && summary.emergencyFundMonths >= 6 && summary.debtRatio < 1) {
    recomendaciones.push({
      priority: 'después', icon: '🌍',
      title: 'Diversifica tu portafolio de inversiones',
      qué: 'Tienes una base muy sólida. El próximo paso es asegurarte de que tu inversión esté diversificada: parte en renta fija (depósitos, bonos), parte en renta variable (ETFs globales) y parte en activos reales. Considera un APV si no tienes.',
      porqué: 'La diversificación reduce el riesgo sin sacrificar retorno. Si toda tu inversión está en un solo instrumento o institución, un evento adverso puede afectar todo tu patrimonio.',
      plazo: 'Progresivo',
    })
  }

  if (goals.length === 0 && summary.monthlyIncome > 0) {
    recomendaciones.push({
      priority: 'pronto', icon: '🎯',
      title: 'Define tus metas financieras',
      qué: 'Ve al módulo "Metas" y escribe al menos 1-2 objetivos financieros concretos: ¿quieres comprar casa, jubilarte antes, crear un negocio, pagar tus estudios? Ponle fecha y monto.',
      porqué: 'Sin una meta clara, el ahorro se siente como un sacrificio sin sentido y es fácil abandonarlo. Una meta concreta convierte el ahorro en progreso visible hacia algo que te importa.',
      plazo: 'Esta semana',
    })
  }

  const priorityStyle = {
    ahora:   { bg: '#fef2f2', border: '#ef4444', badge: '#dc2626', badgeBg: '#fee2e2', label: 'HACER AHORA' },
    pronto:  { bg: '#fffbeb', border: '#f59e0b', badge: '#d97706', badgeBg: '#fef9c3', label: 'PRÓXIMOS MESES' },
    después: { bg: '#f0fdf4', border: '#22c55e', badge: '#16a34a', badgeBg: '#dcfce7', label: 'DESPUÉS' },
  }

  const styleMap = {
    success: { bg: '#f0fdf4', border: '#22c55e', title: '#15803d' },
    warning: { bg: '#fffbeb', border: '#f59e0b', title: '#a16207' },
    danger:  { bg: '#fef2f2', border: '#ef4444', title: '#dc2626' },
    info:    { bg: '#eff6ff', border: '#3b82f6', title: '#1d4ed8' },
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>🤖 Coach Financiero IA</h3>
        <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Análisis automático de tu situación financiera con recomendaciones personalizadas</p>
      </div>

      {/* Insights */}
      <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>📡 Diagnóstico en tiempo real</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
        {insights.map((ins, i) => {
          const s = styleMap[ins.type]
          return (
            <div key={i} style={{ background: s.bg, borderLeft: `4px solid ${s.border}`, borderRadius: '0 12px 12px 0', padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 15 }}>{ins.icon}</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: s.title }}>{ins.title}</span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#475569', lineHeight: 1.6 }}>{ins.text}</p>
            </div>
          )
        })}
      </div>

      {/* Recomendaciones */}
      <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>🎯 Recomendaciones personalizadas</p>
      {recomendaciones.length === 0 ? (
        <div className="card" style={{ padding: '28px 20px', textAlign: 'center', color: '#94a3b8', marginBottom: 24 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#64748b', margin: '0 0 6px' }}>Agrega datos para ver recomendaciones</p>
          <p style={{ fontSize: 12, margin: 0 }}>Registra tus ingresos, gastos y metas para que el Coach genere un plan de acción personalizado.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          {(['ahora', 'pronto', 'después'] as const).map(p => {
            const items = recomendaciones.filter(r => r.priority === p)
            if (items.length === 0) return null
            const ps = priorityStyle[p]
            return (
              <div key={p}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: ps.badgeBg, color: ps.badge, letterSpacing: '0.06em' }}>{ps.label}</span>
                  <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {items.map((r, i) => (
                    <div key={i} style={{ background: ps.bg, border: `1px solid ${ps.border}22`, borderLeft: `4px solid ${ps.border}`, borderRadius: '0 14px 14px 0', padding: '16px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <span style={{ fontSize: 18 }}>{r.icon}</span>
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{r.title}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div style={{ background: 'white', borderRadius: 8, padding: '10px 12px' }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Qué hacer</p>
                          <p style={{ fontSize: 12, color: '#334155', lineHeight: 1.6, margin: 0 }}>{r.qué}</p>
                        </div>
                        <div style={{ background: 'white', borderRadius: 8, padding: '10px 12px' }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Por qué importa</p>
                          <p style={{ fontSize: 12, color: '#334155', lineHeight: 1.6, margin: 0 }}>{r.porqué}</p>
                        </div>
                      </div>
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 10, color: ps.badge, fontWeight: 700 }}>⏱ {r.plazo}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Conectar Claude API */}
      <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', borderRadius: 14, padding: 24, color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Sparkles size={20} style={{ color: '#818cf8' }} />
          <span style={{ fontWeight: 700, fontSize: 15 }}>Conectar con Claude IA</span>
          <span style={{ fontSize: 10, background: '#334155', padding: '2px 8px', borderRadius: 20, color: '#94a3b8', border: '1px solid #475569' }}>PRÓXIMAMENTE</span>
        </div>
        <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, marginBottom: 16 }}>
          Cuando tengas tu API key de Anthropic, podrás activar un asesor financiero conversacional con acceso completo a tu perfil. Analizará tu situación en profundidad y responderá preguntas personalizadas en tiempo real.
        </p>
        <div style={{ background: '#0f172a', borderRadius: 10, padding: 14, fontFamily: 'monospace', fontSize: 11, color: '#94a3b8', marginBottom: 14 }}>
          <span style={{ color: '#22c55e' }}>// 1.</span> Obtén tu API key en <span style={{ color: '#818cf8' }}>console.anthropic.com</span><br />
          <span style={{ color: '#22c55e' }}>// 2.</span> Ve a Vercel → Settings → Environment Variables<br />
          <span style={{ color: '#22c55e' }}>// 3.</span> Agrega: <span style={{ color: '#fbbf24' }}>ANTHROPIC_API_KEY</span> = <span style={{ color: '#f472b6' }}>sk-ant-...</span><br />
          <span style={{ color: '#22c55e' }}>// 4.</span> El sistema de <span style={{ color: '#60a5fa' }}>buildCoachPrompt()</span> ya está listo
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Brain size={14} style={{ color: '#818cf8' }} />
          <span style={{ fontSize: 11, color: '#64748b' }}>Tu perfil financiero completo ya se estructura automáticamente para el contexto IA</span>
        </div>
      </div>
    </div>
  )
}

// ── MODULE 8: ACADEMIA ───────────────────────────────────────────────────────

const ACADEMIA_CONTENT = [
  {
    level: 1, title: 'Nivel 1 — Fundamentos', color: '#16a34a', badge: 'Básico',
    topics: [
      { title: 'Qué es ahorrar', emoji: '🐷',
        body: 'Ahorrar es reservar una parte de tus ingresos para el futuro en lugar de gastarlos hoy. La regla de oro: phágate a ti mismo primero. Antes de pagar cualquier gasto, destina un porcentaje fijo a ahorro.',
        example: 'Si ganas $1.000.000 y ahorras el 10%, en 12 meses tendrás $1.200.000 acumulados — sin contar los intereses.',
        apply: 'Mira tu tasa de ahorro en el Diagnóstico. Si es menor al 10%, ese es tu primer objetivo.' },
      { title: 'Qué es invertir', emoji: '📈',
        body: 'Invertir es poner tu dinero a trabajar para generar más dinero. A diferencia del ahorro (que solo preserva), la inversión hace crecer tu capital a través de rentabilidades, dividendos o plusvalías.',
        example: '$1.000.000 al 7% anual se convierte en $3.869.684 en 20 años — sin hacer nada.',
        apply: 'Usa el Simulador de Proyección para ver cuánto crecería tu patrimonio con distintas tasas de ahorro.' },
      { title: 'La inflación', emoji: '🔥',
        body: 'La inflación es el aumento sostenido de precios. Si tu dinero no crece al mismo ritmo que la inflación (histórica 3-5% anual en Chile), pierde poder adquisitivo.',
        example: '$1.000.000 hoy equivalen a $820.000 en poder de compra de hace 3 años con 7% de inflación acumulada.',
        apply: 'Por eso la renta de tu ahorro líquido (cuenta corriente, ahorro a la vista) siempre debe compararse contra la inflación.' },
      { title: 'Interés compuesto', emoji: '⚡',
        body: 'El interés compuesto es ganar intereses sobre los intereses anteriores. Es la fuerza más poderosa en finanzas personales. El tiempo es el ingrediente más importante — no el monto inicial.',
        example: '$100.000 mensuales desde los 25 años al 7% anual = $263 millones a los 65. Empezar a los 35 = $121 millones. La diferencia de 10 años cuesta $142 millones.',
        apply: 'Cuanto antes empieces a invertir, mayor será el efecto. Incluso montos pequeños importan.' },
    ]
  },
  {
    level: 2, title: 'Nivel 2 — Inversiones', color: '#2563eb', badge: 'Intermedio',
    topics: [
      { title: 'ETF (Fondos de Índice)', emoji: '🌍',
        body: 'Un ETF es un fondo que replica un índice (como el S&P 500) y se transa como una acción. Ofrece diversificación instantánea con costos muy bajos (0.03%-0.20% anual).',
        example: 'Un ETF del S&P 500 te da exposición a las 500 empresas más grandes de EE.UU. con una sola compra.',
        apply: 'Para el chileno promedio, ETFs globales (VT, VTI) son el instrumento más eficiente para crecimiento a largo plazo.' },
      { title: 'Acciones', emoji: '📊',
        body: 'Una acción representa propiedad parcial en una empresa. Si la empresa crece, el valor de tu acción sube. También puedes recibir dividendos.',
        example: 'Comprar 10 acciones de una empresa a $5.000 c/u. Si sube a $8.000, tu inversión pasó de $50.000 a $80.000 (+60%).',
        apply: 'Las acciones individuales conllevan más riesgo que los ETFs. Recomendadas solo si tienes conocimiento específico del sector.' },
      { title: 'Bonos', emoji: '📋',
        body: 'Un bono es un préstamo que le haces a una empresa o gobierno a cambio de intereses periódicos y devolución del capital al vencimiento. Menor riesgo, menor retorno que acciones.',
        example: 'Bono del Banco Central de Chile a 10 años al 4% anual. Por cada $1.000.000 invertido recibirías $40.000 anuales.',
        apply: 'Útiles para equilibrar el riesgo de un portafolio o para objetivos financieros con fecha definida.' },
      { title: 'Fondos Mutuos', emoji: '🏦',
        body: 'Pool de dinero de múltiples inversionistas gestionado profesionalmente. Más accesibles que ETFs localmente, pero con mayores comisiones.',
        example: 'Fondos mutuos en Chile cobran entre 1% y 3% anual de comisión versus 0.03-0.50% de un ETF.',
        apply: 'Compara la rentabilidad histórica neta de comisiones. Muchos fondos mutuos activos no superan al índice de referencia.' },
    ]
  },
  {
    level: 3, title: 'Nivel 3 — Construcción de Riqueza', color: '#7c3aed', badge: 'Avanzado',
    topics: [
      { title: 'Construir un negocio', emoji: '🏢',
        body: 'Un negocio exitoso es el activo más poderoso. Genera flujo de caja recurrente, puede escalar y crear valor que supera al trabajo dependiente.',
        example: 'Un negocio que genera $500.000 mensual de utilidad neta vale entre $3-6 millones (múltiplo de 6-12x utilidad anual).',
        apply: 'Antes de escalar, asegúrate de tener 6 meses de fondo de emergencia personal y los primeros clientes validados.' },
      { title: 'Activos vs Pasivos', emoji: '⚖️',
        body: 'Robert Kiyosaki lo enseñó claramente: un activo pone dinero en tu bolsillo, un pasivo lo saca. El automóvil es un pasivo. Un inmueble arrendado es un activo.',
        example: 'Tu casa donde vives es técnicamente un pasivo (te cuesta mensualmente). Un depto arrendado es un activo si el arriendo supera los gastos.',
        apply: 'Antes de cada compra importante, pregúntate: ¿Este gasto me genera ingreso o me lo quita?' },
      { title: 'Ingresos pasivos', emoji: '💤',
        body: 'Son flujos de dinero que llegan sin trabajar directamente por ellos. Dividendos, arriendos, regalías, intereses. El objetivo de la independencia financiera es vivir de ingresos pasivos.',
        example: 'Un portafolio de $450 millones al 4% genera $18 millones anuales ($1.5 millones mensuales) sin trabajar.',
        apply: 'Revisa tu módulo de Libertad Financiera para calcular cuánto capital necesitas para vivir de ingresos pasivos.' },
      { title: 'Bienes Raíces', emoji: '🏘️',
        body: 'Históricamente una de las mejores inversiones. Genera flujo de caja (arriendo), se valoriza en el tiempo y se puede financiar con crédito (apalancamiento).',
        example: 'Depto a $100 millones, arriendo $400.000/mes. Rentabilidad bruta del 4.8% anual. Con crédito del 80%: inviertes $20 millones y recibes el mismo flujo.',
        apply: 'Calcula siempre la rentabilidad neta: (arriendo - gastos comunes - contribuciones - intereses) / capital invertido.' },
    ]
  },
]

function AcademiaModule() {
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set())

  function toggle(key: string) {
    setExpandedTopics(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>📚 Academia Financiera</h3>
        <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Aprende conceptos fundamentales aplicados a tu realidad financiera</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {ACADEMIA_CONTENT.map(level => (
          <div key={level.level}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ background: level.color, borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 13 }}>{level.level}</div>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>{level.title}</span>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: level.color + '22', color: level.color, fontWeight: 700 }}>{level.badge}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {level.topics.map(topic => {
                const key = `${level.level}-${topic.title}`
                const open = expandedTopics.has(key)
                return (
                  <div key={key} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <button onClick={() => toggle(key)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, fontSize: 14, color: '#1e293b' }}>
                        <span style={{ fontSize: 18 }}>{topic.emoji}</span>{topic.title}
                      </span>
                      {open ? <ChevronUp size={15} color="#94a3b8" /> : <ChevronDown size={15} color="#94a3b8" />}
                    </button>
                    {open && (
                      <div style={{ padding: '0 16px 16px', borderTop: '1px solid #f1f5f9' }}>
                        <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.7, marginTop: 12, marginBottom: 10 }}>{topic.body}</p>
                        <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: '#15803d', marginBottom: 4 }}>📌 Ejemplo práctico</p>
                          <p style={{ fontSize: 12, color: '#166534', margin: 0, lineHeight: 1.6 }}>{topic.example}</p>
                        </div>
                        <div style={{ background: '#eff6ff', borderRadius: 8, padding: '10px 12px' }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', marginBottom: 4 }}>🎯 Aplicación a tus finanzas</p>
                          <p style={{ fontSize: 12, color: '#1e40af', margin: 0, lineHeight: 1.6 }}>{topic.apply}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── MODULE 9: PANEL DE INDICADORES ───────────────────────────────────────────

function IndicadoresModule({ profile, score, savingsCount }: { profile: ReturnType<typeof buildFinancialProfile>; score: number; savingsCount: number }) {
  const { clp } = useFmt()
  const { summary } = profile
  const capitalNeeded = summary.monthlyExpenses * 12 / 0.04
  const libertadPct = capitalNeeded > 0 ? Math.min(100, (summary.netWorth / capitalNeeded) * 100) : 0

  const indicators = [
    {
      title: 'Patrimonio Neto', value: clp(summary.netWorth), icon: '🏛️',
      color: summary.netWorth >= 0 ? '#16a34a' : '#dc2626',
      desc: 'Activos − Pasivos',
      explain: 'Es lo que te quedaría si vendieras todo lo que tienes y pagaras todas tus deudas. Si es positivo y crece cada mes, vas en la dirección correcta. Si es negativo, debes más de lo que tienes.',
    },
    {
      title: 'Ahorro mensual', value: clp(summary.monthlyInvestments), icon: '💰',
      color: '#2563eb',
      desc: 'Inversión este mes',
      explain: 'Cuánto dinero destinaste este mes a inversiones o ahorros. Cada peso que colocas aquí trabaja para tu futuro sin que tengas que hacer nada más. Entre más alto, más rápido creces.',
    },
    {
      title: 'Tasa de ahorro', value: `${summary.savingsRate.toFixed(1)}%`, icon: '📊',
      color: summary.savingsRate >= 20 ? '#16a34a' : summary.savingsRate >= 10 ? '#d97706' : '#dc2626',
      desc: 'Inversión / Ingreso',
      explain: 'De cada $100 que ganas, cuántos van al futuro. Menos del 10% hace muy difícil construir riqueza. Entre 10-20% es buen ritmo. Sobre el 20% es excelente — ahí el interés compuesto trabaja de verdad.',
    },
    {
      title: 'Fondo emergencia', value: `${summary.emergencyFundMonths.toFixed(1)} meses`, icon: '🛡️',
      color: summary.emergencyFundMonths >= 3 ? '#16a34a' : summary.emergencyFundMonths >= 1 ? '#d97706' : '#dc2626',
      desc: 'Meses de gastos cubiertos',
      explain: 'Cuánto tiempo podrías mantener tu estilo de vida si mañana perdieras tus ingresos. Menos de 3 meses es zona de riesgo. Entre 3-6 meses es lo recomendado. Más de 6 meses: bien protegido.',
    },
    {
      title: 'Ratio de deuda', value: `${summary.debtRatio.toFixed(2)}x`, icon: '⚖️',
      color: summary.debtRatio < 1 ? '#16a34a' : summary.debtRatio < 2 ? '#d97706' : '#dc2626',
      desc: 'Deuda total / Ingreso anual',
      explain: 'Cuántas veces tu deuda total supera lo que ganas en un año. Menos de 1x es saludable: podrías pagar toda tu deuda en menos de un año si fuera necesario. Más de 2x empieza a ser preocupante.',
    },
    {
      title: 'Score financiero', value: `${score}/100`, icon: '🎯',
      color: score >= 70 ? '#16a34a' : score >= 40 ? '#d97706' : '#dc2626',
      desc: 'Nota global de salud financiera',
      explain: 'Una calificación que resume en un número qué tan ordenadas están tus finanzas. Considera tu ahorro, tus deudas, tu fondo de emergencia y tus inversiones. Sobre 70 es sólido; bajo 40 requiere atención.',
    },
    {
      title: 'Libertad financiera', value: `${libertadPct.toFixed(1)}%`, icon: '🏝️',
      color: '#7c3aed',
      desc: 'Avance hacia independencia',
      explain: 'Cuánto del camino recorriste hacia el punto donde tus inversiones generan suficiente para vivir sin trabajar. Al 100% alcanzas la independencia financiera — tus activos pagan tus gastos solos.',
    },
    {
      title: 'Total activos', value: clp(summary.totalAssets), icon: '📈',
      color: '#0ea5e9',
      desc: `${savingsCount} cuenta${savingsCount !== 1 ? 's' : ''} registradas`,
      explain: 'La suma de todo lo que tienes valorado en dinero: cuentas de ahorro, inversiones, APV, fondos mutuos, etc. Este número debería ir creciendo mes a mes gracias a tus aportes y a la rentabilidad.',
    },
  ]

  const chartData = profile.recentMonths.slice(0, 6).reverse().map(r => ({
    mes: r.month,
    ingreso: r.income,
    gastos: r.fixed + r.variable,
    inversión: r.investments,
  }))

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>📊 Panel de Indicadores</h3>
        <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Todos tus KPIs financieros en tiempo real</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
        {indicators.map(ind => (
          <div key={ind.title} className="card" style={{ padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ fontSize: 28, flexShrink: 0, lineHeight: 1 }}>{ind.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2, gap: 8 }}>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{ind.title}</span>
                <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>{ind.desc}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: ind.color, marginBottom: 8 }}>{ind.value}</div>
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6, borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>{ind.explain}</div>
            </div>
          </div>
        ))}
      </div>
      {chartData.length > 0 && (
        <div className="card" style={{ padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 14 }}>Evolución de ingresos, gastos e inversión</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} tickFormatter={m => { const [, mo] = m.split('-'); return `${['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][parseInt(mo)-1]}`; }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${Math.round(Number(v)/1000)}k`} />
              <Tooltip formatter={(v) => clp(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="ingreso" name="Ingreso" fill="#22c55e" radius={[3,3,0,0]} />
              <Bar dataKey="gastos" name="Gastos" fill="#ef4444" radius={[3,3,0,0]} />
              <Bar dataKey="inversión" name="Inversión" fill="#3b82f6" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

// ── MAIN COMPONENT ───────────────────────────────────────────────────────────

type ModuleId = 'diagnostico' | 'score' | 'libertad' | 'proyeccion' | 'deudas' | 'metas' | 'coach' | 'academia' | 'indicadores'

const MODULES: { id: ModuleId; label: string; icon: React.ReactNode; short: string }[] = [
  { id: 'indicadores', label: 'Panel',         short: 'Panel',       icon: <LayoutDashboard size={14} /> },
  { id: 'diagnostico', label: 'Diagnóstico',   short: 'Diagnóst.',   icon: <Activity size={14} /> },
  { id: 'score',       label: 'Score',          short: 'Score',       icon: <Award size={14} /> },
  { id: 'libertad',    label: 'Libertad',       short: 'Libertad',    icon: <Sunset size={14} /> },
  { id: 'proyeccion',  label: 'Proyección',     short: 'Proy.',       icon: <TrendingUp size={14} /> },
  { id: 'deudas',      label: 'Sim. Deudas',    short: 'Deudas',      icon: <CreditCard size={14} /> },
  { id: 'metas',       label: 'Metas',          short: 'Metas',       icon: <Flag size={14} /> },
  { id: 'coach',       label: 'Coach IA',       short: 'Coach',       icon: <Bot size={14} /> },
  { id: 'academia',    label: 'Academia',       short: 'Academia',    icon: <BookOpen size={14} /> },
]

export function EducacionFinancieraTab() {
  const { savings, debts, monthlyRecords, financialGoals } = useStore()
  const [activeModule, setActiveModule] = useState<ModuleId>('indicadores')

  const profile = useMemo(() => buildFinancialProfile(savings, debts, monthlyRecords, financialGoals), [savings, debts, monthlyRecords, financialGoals])

  const monthlyDebt = debts.reduce((s, d) => s + d.monthlyPayment_CLP, 0)
  const latestRecord = [...monthlyRecords].sort((a, b) => b.yearMonth.localeCompare(a.yearMonth))[0]
  const monthlyIncome = latestRecord ? sum(latestRecord.incomes) : 0
  const monthlyExpenses = latestRecord ? sum(latestRecord.fixedExpenses) + sum(latestRecord.variableExpenses) + monthlyDebt : 0
  const monthlyInvestments = latestRecord ? sum(latestRecord.investments) : 0
  const savingsRate = monthlyIncome > 0 ? (monthlyInvestments / monthlyIncome) * 100 : 0
  const totalAssets = savings.reduce((s, sv) => s + sv.balance_CLP, 0)
  const totalLiabilities = debts.reduce((s, d) => s + d.balance_CLP, 0)
  const netWorth = totalAssets - totalLiabilities
  const annualIncome = monthlyIncome * 12
  const debtRatio = annualIncome > 0 ? totalLiabilities / annualIncome : 0
  const liquidSavings = savings.filter(s => s.type === 'savings' || s.type === 'emergency').reduce((s, sv) => s + sv.balance_CLP, 0)
  const emergencyMonths = monthlyExpenses > 0 ? liquidSavings / monthlyExpenses : 0
  const score = calcScore(savingsRate, debtRatio, emergencyMonths, netWorth, savings.length)

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Lightbulb size={20} style={{ color: '#f59e0b' }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Centro de Inteligencia Financiera</h2>
        </div>
        <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Educación, diagnóstico y estrategia — todo conectado a tus datos reales</p>
      </div>

      {/* Module nav */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
        {MODULES.map(m => (
          <button key={m.id} onClick={() => setActiveModule(m.id)} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 13px', borderRadius: 20, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', transition: 'all 0.15s',
            background: activeModule === m.id ? '#1e293b' : '#f1f5f9',
            color: activeModule === m.id ? 'white' : '#64748b',
            boxShadow: activeModule === m.id ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
          }}>
            {m.icon} {m.short}
          </button>
        ))}
      </div>

      {/* Module content */}
      {activeModule === 'indicadores' && <IndicadoresModule profile={profile} score={score.total} savingsCount={savings.length} />}
      {activeModule === 'diagnostico' && <DiagnosticoModule profile={profile} />}
      {activeModule === 'score'       && <ScoreModule profile={profile} savingsCount={savings.length} />}
      {activeModule === 'libertad'    && <LibertadModule profile={profile} />}
      {activeModule === 'proyeccion'  && <ProyeccionModule profile={profile} />}
      {activeModule === 'deudas'      && <SimuladorDeudasModule />}
      {activeModule === 'metas'       && <MetasModule profile={profile} />}
      {activeModule === 'coach'       && <CoachModule profile={profile} />}
      {activeModule === 'academia'    && <AcademiaModule />}
    </div>
  )
}
