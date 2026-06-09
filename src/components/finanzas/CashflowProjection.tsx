import { useStore } from '../../store'
import { useFmt } from '../../hooks/useExchangeRate'
import { toMonthly } from './IncomesExpenses'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'
import { TrendingUp, Award, Calendar, ArrowRight } from 'lucide-react'

function formatMillions(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}k`
  return `$${v}`
}

function monthName(date: Date): string {
  return date.toLocaleDateString('es-CL', { year: 'numeric', month: 'long' })
}

function shortMonth(date: Date): string {
  return date.toLocaleDateString('es-CL', { year: '2-digit', month: 'short' })
}

// Calcula cuánto pago de deudas hay en un mes dado (respeta startDate y endDate)
function activeDebtPayment(debts: ReturnType<typeof useStore.getState>['debts'], date: Date): number {
  const ym = date.toISOString().slice(0, 7)
  return debts.reduce((sum, d) => {
    const startYM = d.startDate ? d.startDate.slice(0, 7) : '0000-00'
    const endYM = d.endDate ? d.endDate.slice(0, 7) : '9999-99'
    if (startYM <= ym && ym <= endYM) return sum + d.monthlyPayment_CLP
    return sum
  }, 0)
}

export function CashflowProjection() {
  const { incomes, expenses, debts, savings } = useStore()
  const { clp } = useFmt()

  const now = new Date()

  const monthlyIncome = incomes.filter(i => i.active).reduce((sum, i) => sum + toMonthly(i.amount_CLP, i.frequency), 0)
  const monthlyExpenses = expenses.filter(e => e.active).reduce((sum, e) => sum + toMonthly(e.amount_CLP, e.frequency), 0)
  const currentDebtPayments = activeDebtPayment(debts, now)
  const netMonthlyNow = monthlyIncome - monthlyExpenses - currentDebtPayments
  const currentSavingsBalance = savings.reduce((sum, s) => sum + s.balance_CLP, 0)
  const avgSavingsReturn = savings.length > 0
    ? savings.reduce((sum, s) => sum + s.annualReturn, 0) / savings.length
    : 5

  /* ── Freedom events: cuándo termina cada deuda ─────────────── */
  const freedomEvents = debts
    .filter(d => d.endDate)
    .map(d => {
      const endDate = new Date(d.endDate + 'T12:00:00')
      const monthOffset = (endDate.getFullYear() - now.getFullYear()) * 12 + (endDate.getMonth() - now.getMonth())
      return { debtName: d.name, monthOffset, date: endDate, freedAmount: d.monthlyPayment_CLP }
    })
    .filter(e => e.monthOffset >= 0 && e.monthOffset <= 60)
    .sort((a, b) => a.monthOffset - b.monthOffset)

  /* ── Generar 61 puntos (mes 0 a 60) ───────────────────────── */
  const monthlyReturn = avgSavingsReturn / 100 / 12
  const data = Array.from({ length: 61 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const label = shortMonth(date)
    const debtPaymentThisMonth = activeDebtPayment(debts, date)
    const netThisMonth = monthlyIncome - monthlyExpenses - debtPaymentThisMonth

    // Flujo acumulado (simple, sin reinversión)
    let acumulado = 0
    for (let j = 0; j <= i; j++) {
      const d2 = new Date(now.getFullYear(), now.getMonth() + j, 1)
      acumulado += monthlyIncome - monthlyExpenses - activeDebtPayment(debts, d2)
    }

    // Patrimonio con rentabilidad compuesta
    const patrimonio = currentSavingsBalance * Math.pow(1 + monthlyReturn, i) +
      (netMonthlyNow > 0 ? netMonthlyNow * ((Math.pow(1 + monthlyReturn, i) - 1) / monthlyReturn) : 0)

    // Deuda restante simplificada
    const deuda = Math.max(0, debts.reduce((sum, d) => {
      const startYM = date.toISOString().slice(0, 7)
      const endYM = d.endDate?.slice(0, 7) ?? '9999-99'
      if (endYM < startYM) return sum // deuda ya terminó
      return sum + Math.max(0, d.balance_CLP - d.monthlyPayment_CLP * i)
    }, 0))

    return {
      mes: label,
      acumulado: Math.round(acumulado),
      patrimonio: Math.round(patrimonio),
      deuda: Math.round(deuda),
      flujoLibre: Math.round(netThisMonth),
      monthOffset: i,
    }
  })

  /* ── Milestones ─────────────────────────────────────────────── */
  const debtFreeMonth = data.findIndex(d => d.deuda === 0)
  const firstHundredM = data.findIndex(d => d.patrimonio >= 100_000_000)
  const firstMillion = data.findIndex(d => d.patrimonio >= 1_000_000_000)

  function offsetToDate(offset: number) {
    return new Date(now.getFullYear(), now.getMonth() + offset, 1)
  }

  /* ── Tabla anual ────────────────────────────────────────────── */
  const yearlyData = [1, 2, 3, 4, 5].map(year => {
    const monthOffset = year * 12
    const date = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
    const debtPayment = activeDebtPayment(debts, date)
    const netFlow = monthlyIncome - monthlyExpenses - debtPayment
    const activeDebts = debts.filter(d => {
      const ym = date.toISOString().slice(0, 7)
      const startYM = d.startDate?.slice(0, 7) ?? '0000-00'
      const endYM = d.endDate?.slice(0, 7) ?? '9999-99'
      return startYM <= ym && ym <= endYM
    })
    const punto = data[Math.min(monthOffset, 60)]
    return { year, date, debtPayment, netFlow, activeDebts: activeDebts.length, patrimonio: punto?.patrimonio ?? 0 }
  })

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Proyección Financiera a 5 Años</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Basado en tus ingresos, gastos, deudas y rentabilidad promedio de ahorros
        </p>
      </div>

      {/* KPIs actuales */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="stat-label text-green-600">Ingreso mensual</div>
          <div className="stat-value text-green-600" style={{ fontSize: 18 }}>{clp(monthlyIncome)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label text-red-500">Gastos + cuotas</div>
          <div className="stat-value text-red-600" style={{ fontSize: 18 }}>{clp(monthlyExpenses + currentDebtPayments)}</div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>{clp(monthlyExpenses)} gastos · {clp(currentDebtPayments)} cuotas</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Flujo libre hoy</div>
          <div className={`stat-value ${netMonthlyNow >= 0 ? 'text-green-600' : 'text-red-600'}`} style={{ fontSize: 18 }}>
            {clp(netMonthlyNow)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Rentab. prom. ahorros</div>
          <div className="stat-value">{avgSavingsReturn.toFixed(1)}%</div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>anual</div>
        </div>
      </div>

      {/* ── HITOS IMPORTANTES ─────────────────────────────────── */}
      {(debtFreeMonth > 0 || firstHundredM > 0 || freedomEvents.length > 0) && (
        <div className="card mb-6" style={{ padding: '16px 20px' }}>
          <h3 style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Award size={16} color="#f59e0b" /> Hitos importantes en tu camino
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {freedomEvents.map((ev, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
                <div style={{ width: 36, height: 36, background: '#dcfce7', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Calendar size={16} color="#15803d" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#15803d' }}>
                    {monthName(ev.date)} — Terminas de pagar: {ev.debtName}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    Quedan libres <strong style={{ color: '#15803d' }}>{clp(ev.freedAmount)}/mes</strong> que antes iban a esta cuota
                  </div>
                </div>
                <ArrowRight size={14} color="#9ca3af" />
              </div>
            ))}

            {debtFreeMonth > 0 && debtFreeMonth <= 60 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe' }}>
                <div style={{ width: 36, height: 36, background: '#dbeafe', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <TrendingUp size={16} color="#1d4ed8" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#1d4ed8' }}>
                    {monthName(offsetToDate(debtFreeMonth))} — ¡Sin deudas!
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    Tu flujo libre pasa a <strong style={{ color: '#1d4ed8' }}>{clp(monthlyIncome - monthlyExpenses)}/mes</strong>
                  </div>
                </div>
                <ArrowRight size={14} color="#9ca3af" />
              </div>
            )}

            {firstHundredM > 0 && firstHundredM <= 60 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a' }}>
                <div style={{ width: 36, height: 36, background: '#fef3c7', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 18 }}>💰</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#92400e' }}>
                    {monthName(offsetToDate(firstHundredM))} — Alcanzas $100M en patrimonio
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    Incluye rentabilidad compuesta de tus ahorros e inversiones
                  </div>
                </div>
                <ArrowRight size={14} color="#9ca3af" />
              </div>
            )}

            {firstMillion > 0 && firstMillion <= 60 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#fdf4ff', borderRadius: 10, border: '1px solid #e9d5ff' }}>
                <div style={{ width: 36, height: 36, background: '#f3e8ff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 18 }}>🚀</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#6b21a8' }}>
                    {monthName(offsetToDate(firstMillion))} — Alcanzas $1.000M en patrimonio
                  </div>
                </div>
                <ArrowRight size={14} color="#9ca3af" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TABLA AÑO A AÑO ────────────────────────────────────── */}
      <div className="card mb-6" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ fontWeight: 700, fontSize: 14, color: '#374151' }}>📅 Tu situación año a año</h3>
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Cómo evoluciona tu flujo libre a medida que se pagan las deudas</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Año</th>
              <th>Fecha</th>
              <th style={{ textAlign: 'center' }}>Deudas activas</th>
              <th style={{ textAlign: 'right' }}>Cuotas/mes</th>
              <th style={{ textAlign: 'right' }}>Flujo libre/mes</th>
              <th style={{ textAlign: 'right' }}>Patrimonio est.</th>
            </tr>
          </thead>
          <tbody>
            {yearlyData.map(row => {
              const isDebtFree = row.activeDebts === 0
              const isBetter = row.netFlow > netMonthlyNow
              return (
                <tr key={row.year} style={isDebtFree ? { background: '#f0fdf4' } : undefined}>
                  <td style={{ fontWeight: 700 }}>Año {row.year}</td>
                  <td style={{ color: '#6b7280' }}>{row.date.toLocaleDateString('es-CL', { year: 'numeric', month: 'long' })}</td>
                  <td style={{ textAlign: 'center' }}>
                    {isDebtFree
                      ? <span className="badge badge-green">Sin deudas 🎉</span>
                      : <span style={{ fontWeight: 600 }}>{row.activeDebts}</span>
                    }
                  </td>
                  <td style={{ textAlign: 'right', color: '#dc2626', fontWeight: 500 }}>
                    {row.debtPayment > 0 ? clp(row.debtPayment) : <span style={{ color: '#9ca3af' }}>—</span>}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: row.netFlow >= 0 ? '#15803d' : '#dc2626' }}>
                    {clp(row.netFlow)}
                    {isBetter && row.netFlow > netMonthlyNow && (
                      <span style={{ fontSize: 10, color: '#15803d', marginLeft: 4 }}>
                        +{clp(row.netFlow - netMonthlyNow)}
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: '#1d4ed8' }}>
                    {formatMillions(row.patrimonio)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── GRÁFICO PATRIMONIO Y DEUDA ──────────────────────────── */}
      <div className="card mb-6">
        <h3 style={{ fontWeight: 600, color: '#1f2937', marginBottom: 16 }}>Patrimonio proyectado vs Deuda pendiente</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="gradPatrimonio" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradDeuda" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="mes" tick={{ fontSize: 10 }} interval={5} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={formatMillions} />
            <Tooltip formatter={(v) => clp(Number(v))} />
            <Legend />
            {debtFreeMonth > 0 && debtFreeMonth <= 60 && (
              <ReferenceLine x={data[debtFreeMonth]?.mes} stroke="#10b981" strokeDasharray="4 2" label={{ value: '🎯 Sin deudas', fontSize: 10, fill: '#15803d' }} />
            )}
            <Area type="monotone" dataKey="patrimonio" name="Patrimonio (c/rentab.)" stroke="#10b981" fill="url(#gradPatrimonio)" strokeWidth={2} />
            <Area type="monotone" dataKey="deuda" name="Deuda pendiente" stroke="#ef4444" fill="url(#gradDeuda)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── GRÁFICO FLUJO LIBRE ─────────────────────────────────── */}
      <div className="card">
        <h3 style={{ fontWeight: 600, color: '#1f2937', marginBottom: 4 }}>Flujo libre mensual</h3>
        <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>Cuánto te queda disponible cada mes a medida que se van pagando las deudas</p>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="gradFlujo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="mes" tick={{ fontSize: 10 }} interval={5} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={formatMillions} />
            <Tooltip formatter={(v) => clp(Number(v))} />
            {freedomEvents.map((ev, i) => (
              <ReferenceLine key={i} x={data[Math.min(ev.monthOffset, 60)]?.mes} stroke="#10b981" strokeDasharray="3 2" />
            ))}
            <Area type="monotone" dataKey="flujoLibre" name="Flujo libre/mes" stroke="#3b82f6" fill="url(#gradFlujo)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 12 }}>
          * Las líneas verdes verticales marcan los meses en que termina cada deuda y aumenta tu flujo disponible.
          Supone ingresos y gastos constantes — actualiza tus datos periódicamente.
        </p>
      </div>
    </div>
  )
}
