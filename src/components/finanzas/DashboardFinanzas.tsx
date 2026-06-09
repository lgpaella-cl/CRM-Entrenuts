import { useState } from 'react'
import {
  TrendingDown, TrendingUp, CreditCard, PiggyBank,
  Calendar, Wallet, ChevronDown, ChevronUp, Pencil, Check
} from 'lucide-react'
import { useStore } from '../../store'
import { useFmt } from '../../hooks/useExchangeRate'
import type { ExpenseItem } from '../../types'

// ── Constants ────────────────────────────────────────────────────

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MONTH_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const CATEGORIES: { value: ExpenseItem['category']; label: string; color: string; emoji: string }[] = [
  { value: 'housing',       label: 'Vivienda',        color: '#6366f1', emoji: '🏠' },
  { value: 'transport',     label: 'Transporte',      color: '#f59e0b', emoji: '🚗' },
  { value: 'food',          label: 'Alimentación',    color: '#10b981', emoji: '🍽️' },
  { value: 'health',        label: 'Salud',           color: '#ef4444', emoji: '🏥' },
  { value: 'education',     label: 'Educación',       color: '#3b82f6', emoji: '📚' },
  { value: 'entertainment', label: 'Entretenimiento', color: '#ec4899', emoji: '🎬' },
  { value: 'subscriptions', label: 'Suscripciones',   color: '#8b5cf6', emoji: '📱' },
  { value: 'business',      label: 'Negocio',         color: '#0ea5e9', emoji: '💼' },
  { value: 'other',         label: 'Otro',            color: '#94a3b8', emoji: '📦' },
]

// ── Helpers ──────────────────────────────────────────────────────

function sumItems(items: { amount_CLP: number }[]) {
  return items.reduce((s, i) => s + i.amount_CLP, 0)
}

function currentYM() {
  return new Date().toISOString().slice(0, 7)
}

function nextYM(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
}

function labelYM(ym: string) {
  const [y, m] = ym.split('-')
  return `${MONTH_SHORT[parseInt(m) - 1]} ${y}`
}

function fullLabelYM(ym: string) {
  const [y, m] = ym.split('-')
  return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`
}

// ── Component ─────────────────────────────────────────────────────

export function DashboardFinanzas() {
  const {
    monthlyRecords, debts, savings, debtInstallments,
    expenseLogs, settings, updateSettings,
  } = useStore()
  const { clp } = useFmt()

  const [selectedYM, setSelectedYM] = useState(currentYM())
  const [catView, setCatView] = useState<'month' | 'year'>('month')
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [editingBalance, setEditingBalance] = useState(false)
  const [balanceInput, setBalanceInput] = useState('')

  // ── Month selector options (last 12 months) ──
  const allMonths: string[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i)
    allMonths.push(d.toISOString().slice(0, 7))
  }

  // ── Monthly record for selected month ──
  const sorted = [...monthlyRecords].sort((a, b) => b.yearMonth.localeCompare(a.yearMonth))
  const record = monthlyRecords.find(r => r.yearMonth === selectedYM) ?? sorted[0]

  const monthlyIncome      = record ? sumItems(record.incomes) : 0
  const monthlyFixed       = record ? sumItems(record.fixedExpenses) : 0
  const monthlyVariable    = record ? sumItems(record.variableExpenses) : 0
  const monthlyInvestments = record ? sumItems(record.investments) : 0

  // Debt installments for selected month
  const monthlyDebtPayments = debtInstallments
    .filter(i => i.dueDate.startsWith(selectedYM))
    .reduce((s, i) => s + i.amount_CLP, 0)

  const totalExpenses = monthlyFixed + monthlyVariable + monthlyInvestments + monthlyDebtPayments
  const freeFlow      = monthlyIncome - totalExpenses

  // Totals
  const totalDebt    = debts.reduce((s, d) => s + d.balance_CLP, 0)
  const totalSavings = savings.reduce((s, sv) => s + sv.balance_CLP, 0)

  // ── Proyección próximo mes ──
  const nm = nextYM(selectedYM)

  // Average variable expenses (expenseLogs) from last 3 months
  const last3Totals = [0, 1, 2].map(n => {
    const d = new Date(selectedYM + '-01'); d.setMonth(d.getMonth() - n)
    const ym = d.toISOString().slice(0, 7)
    return expenseLogs.filter(l => l.date.startsWith(ym)).reduce((s, l) => s + l.amount_CLP, 0)
  })
  const avgVarExpenses = last3Totals.reduce((a, b) => a + b, 0) / 3

  const nextMonthInstallments = debtInstallments
    .filter(i => !i.paid && i.dueDate.startsWith(nm))
    .reduce((s, i) => s + i.amount_CLP, 0)

  const projectedNeeds    = monthlyFixed + avgVarExpenses + monthlyInvestments + nextMonthInstallments
  const projectedFreeFlow = monthlyIncome - projectedNeeds

  const availableBalance = settings.availableBalance_CLP ?? 0
  const financialGap     = availableBalance - projectedNeeds

  // ── Expense categories (from ExpenseLog) ──
  const catLogs = catView === 'month'
    ? expenseLogs.filter(l => l.date.startsWith(selectedYM))
    : expenseLogs.filter(l => l.date.startsWith(selectedYM.slice(0, 4)))

  const totalCatSpend = catLogs.reduce((s, l) => s + l.amount_CLP, 0)

  const catData = CATEGORIES
    .map(c => ({
      ...c,
      total: catLogs.filter(l => l.category === c.value).reduce((s, l) => s + l.amount_CLP, 0),
      items: catLogs.filter(l => l.category === c.value).sort((a, b) => b.amount_CLP - a.amount_CLP),
    }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total)

  // ── Upcoming installments (next 5) ──
  const today = new Date().toISOString().split('T')[0]
  const upcoming = debtInstallments
    .filter(i => !i.paid && i.dueDate >= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5)

  // ── Credit cards ──
  const creditCards = debts.filter(d => d.type === 'credit_card' && d.balance_CLP > 0)

  // ── Handlers ──
  function saveBalance() {
    updateSettings({ availableBalance_CLP: parseFloat(balanceInput) || 0 })
    setEditingBalance(false)
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)', marginBottom: 3 }}>Resumen Financiero</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Situación general · {record ? fullLabelYM(record.yearMonth) : 'Sin datos'}</p>
        </div>
        <select className="input" style={{ maxWidth: 165 }} value={selectedYM} onChange={e => setSelectedYM(e.target.value)}>
          {allMonths.map(m => <option key={m} value={m}>{labelYM(m)}</option>)}
        </select>
      </div>

      {/* ── 4 stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 16 }}>
        {[
          { label: 'Ingreso mensual',  value: monthlyIncome,  icon: <TrendingUp size={18} />,  color: '#16a34a', bg: '#dcfce7' },
          { label: 'Gastos totales',   value: totalExpenses,  icon: <TrendingDown size={18} />, color: '#dc2626', bg: '#fee2e2' },
          { label: 'Deuda total',      value: totalDebt,      icon: <CreditCard size={18} />,   color: '#d97706', bg: '#fef9c3' },
          { label: 'Patrimonio',       value: totalSavings,   icon: <PiggyBank size={18} />,    color: '#1d4ed8', bg: '#dbeafe' },
        ].map((c, i) => (
          <div key={i} className="stat-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{c.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: c.color }}>{clp(c.value)}</div>
            </div>
            <div style={{ background: c.bg, color: c.color, borderRadius: 10, padding: 8 }}>{c.icon}</div>
          </div>
        ))}
      </div>

      {/* ── Flujo libre banner ── */}
      <div style={{
        background: freeFlow >= 0 ? '#f0fdf4' : '#fef2f2',
        border: `1.5px solid ${freeFlow >= 0 ? '#bbf7d0' : '#fecaca'}`,
        borderRadius: 12, padding: '13px 20px', marginBottom: 20,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: freeFlow >= 0 ? '#15803d' : '#dc2626' }}>
            Flujo libre del mes · {record ? fullLabelYM(record.yearMonth) : '—'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
            Ingresos {clp(monthlyIncome)} − Gastos fijos {clp(monthlyFixed)} − Variables {clp(monthlyVariable)} − Inversiones {clp(monthlyInvestments)} − Cuotas {clp(monthlyDebtPayments)}
          </div>
        </div>
        <div style={{ fontSize: 26, fontWeight: 900, color: freeFlow >= 0 ? '#15803d' : '#dc2626' }}>{clp(freeFlow)}</div>
      </div>

      {/* ── Row: Proyección + Gastos por categoría ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, marginBottom: 16 }}>

        {/* Proyección mes siguiente */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-1)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={15} /> Proyección · {labelYM(nm)}
          </div>

          {/* Saldo disponible */}
          <div style={{ padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
              Saldo disponible en cuenta hoy
            </div>
            {editingBalance ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input"
                  type="number"
                  autoFocus
                  value={balanceInput}
                  onChange={e => setBalanceInput(e.target.value)}
                  placeholder="0"
                  style={{ flex: 1, fontSize: 17, fontWeight: 700 }}
                  onKeyDown={e => { if (e.key === 'Enter') saveBalance() }}
                />
                <button className="btn btn-primary" style={{ padding: '6px 10px' }} onClick={saveBalance}>
                  <Check size={14} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                onClick={() => { setBalanceInput(String(availableBalance || '')); setEditingBalance(true) }}
              >
                <div style={{ fontSize: 21, fontWeight: 800, color: availableBalance > 0 ? '#16a34a' : 'var(--text-muted)', flex: 1 }}>
                  {availableBalance > 0 ? clp(availableBalance) : 'Ingresar saldo...'}
                </div>
                <Pencil size={13} color="var(--text-muted)" />
              </div>
            )}
          </div>

          {/* Desglose proyección */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 12 }}>
            {[
              { label: 'Ingreso estimado',           value: monthlyIncome,             sign: '+', color: '#16a34a' },
              { label: 'Gastos fijos',               value: monthlyFixed,              sign: '−', color: '#374151' },
              { label: `Gastos vars (prom 3m)`,      value: Math.round(avgVarExpenses), sign: '−', color: '#6b7280' },
              { label: 'Inversiones / Ahorro',       value: monthlyInvestments,        sign: '−', color: '#6b7280' },
              { label: `Cuotas ${labelYM(nm)}`,      value: nextMonthInstallments,     sign: '−', color: '#dc2626' },
            ].map((row, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12.5,
              }}>
                <span style={{ color: 'var(--text-2)' }}>{row.label}</span>
                <span style={{ fontWeight: 600, color: row.color }}>{row.sign} {clp(row.value)}</span>
              </div>
            ))}
          </div>

          {/* Resultado proyectado */}
          <div style={{
            padding: '9px 13px', borderRadius: 8, marginBottom: 10,
            background: projectedFreeFlow >= 0 ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${projectedFreeFlow >= 0 ? '#bbf7d0' : '#fecaca'}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: projectedFreeFlow >= 0 ? '#15803d' : '#dc2626' }}>Flujo libre estimado</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: projectedFreeFlow >= 0 ? '#15803d' : '#dc2626' }}>{clp(projectedFreeFlow)}</span>
          </div>

          {/* Comparación saldo vs necesidades */}
          {availableBalance > 0 && (
            <div style={{
              padding: '9px 13px', borderRadius: 8,
              background: financialGap >= 0 ? '#eff6ff' : '#fff7ed',
              border: `1px solid ${financialGap >= 0 ? '#bfdbfe' : '#fed7aa'}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: financialGap >= 0 ? '#1d4ed8' : '#c2410c' }}>
                {financialGap >= 0 ? '✅ Saldo cubre el mes' : '⚠️ Saldo insuficiente'}
              </span>
              <span style={{ fontSize: 15, fontWeight: 800, color: financialGap >= 0 ? '#1d4ed8' : '#c2410c' }}>{clp(Math.abs(financialGap))}</span>
            </div>
          )}
        </div>

        {/* Gastos por categoría */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Wallet size={15} /> Gastos por categoría
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['month', 'year'] as const).map(v => (
                <button key={v} onClick={() => { setCatView(v); setExpandedCat(null) }} style={{
                  padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: catView === v ? '#2563eb' : 'var(--bg-secondary)',
                  color: catView === v ? 'white' : 'var(--text-2)',
                }}>
                  {v === 'month' ? 'Este mes' : `Año ${selectedYM.slice(0, 4)}`}
                </button>
              ))}
            </div>
          </div>

          {catData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
              Sin gastos registrados para {catView === 'month' ? 'este mes' : 'este año'}.<br />
              <span style={{ fontSize: 11 }}>Agrégalos en la pestaña "Registro gastos".</span>
            </div>
          ) : (
            <div>
              {catData.map(cat => {
                const pct = totalCatSpend > 0 ? (cat.total / totalCatSpend) * 100 : 0
                const isExpanded = expandedCat === cat.value
                return (
                  <div key={cat.value}>
                    <div
                      onClick={() => setExpandedCat(isExpanded ? null : cat.value)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 6px', cursor: 'pointer', borderRadius: 8,
                        background: isExpanded ? 'var(--bg-secondary)' : 'transparent' }}
                    >
                      <span style={{ fontSize: 16, lineHeight: 1 }}>{cat.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{cat.label}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                            {clp(cat.total)}&nbsp;
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>{pct.toFixed(0)}%</span>
                          </span>
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: cat.color, borderRadius: 3, transition: 'width 0.3s' }} />
                        </div>
                      </div>
                      <div style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </div>
                    </div>

                    {/* Expanded items */}
                    {isExpanded && (
                      <div style={{ margin: '2px 0 6px 32px', background: 'var(--bg-secondary)', borderRadius: 8, padding: '6px 10px', border: '1px solid var(--border)' }}>
                        {cat.items.map(item => (
                          <div key={item.id} style={{
                            display: 'flex', justifyContent: 'space-between',
                            padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 12,
                          }}>
                            <span style={{ color: 'var(--text-2)' }}>
                              {item.name}
                              {item.notes && <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>· {item.notes}</span>}
                            </span>
                            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{clp(item.amount_CLP)}</span>
                              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6 }}>
                                {new Date(item.date + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                              </span>
                            </div>
                          </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>
                          <span>{cat.items.length} gasto{cat.items.length !== 1 ? 's' : ''}</span>
                          <span>{clp(cat.total)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Total */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 6px 0', borderTop: '2px solid var(--border)', marginTop: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>Total registrado</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>{clp(totalCatSpend)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Detalle gastos del mes (desde balance mensual) ── */}
      {record && (record.fixedExpenses.length > 0 || record.variableExpenses.length > 0) && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-1)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingDown size={15} /> Detalle de gastos · {fullLabelYM(record.yearMonth)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Fixed */}
            {record.fixedExpenses.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Gastos fijos</div>
                {record.fixedExpenses.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-2)' }}>{item.name}</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{clp(item.amount_CLP)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                  <span>Subtotal fijos</span>
                  <span>{clp(monthlyFixed)}</span>
                </div>
              </div>
            )}
            {/* Variable */}
            {record.variableExpenses.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Gastos variables</div>
                {record.variableExpenses.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-2)' }}>{item.name}</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{clp(item.amount_CLP)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                  <span>Subtotal variables</span>
                  <span>{clp(monthlyVariable)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Row: Próximas cuotas + Tarjetas de crédito ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Upcoming installments */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-1)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={15} /> Próximas cuotas
          </div>
          {upcoming.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>Sin cuotas pendientes 🎉</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {upcoming.map(inst => {
                const debt = debts.find(d => d.id === inst.debtId)
                const isOverdue = inst.dueDate < today
                const dueDate = new Date(inst.dueDate + 'T12:00:00')
                return (
                  <div key={inst.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 10px', borderRadius: 8,
                    background: isOverdue ? '#fef2f2' : 'var(--bg-secondary)',
                    border: `1px solid ${isOverdue ? '#fecaca' : 'var(--border)'}`,
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{debt?.name ?? 'Deuda'}</div>
                      <div style={{ fontSize: 11, color: isOverdue ? '#dc2626' : 'var(--text-muted)' }}>
                        {isOverdue ? '⚠ Vencida · ' : ''}
                        {dueDate.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: isOverdue ? '#dc2626' : 'var(--text-1)', textAlign: 'right', flexShrink: 0 }}>
                      {clp(inst.amount_CLP)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Credit cards */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-1)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CreditCard size={15} /> Tarjetas de crédito
          </div>
          {creditCards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
              Sin tarjetas de crédito registradas.<br />
              <span style={{ fontSize: 11 }}>Agrégalas en Deudas con tipo "Tarjeta de crédito".</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {creditCards.map(card => {
                const usedPct = card.principal_CLP > 0 ? Math.min(100, (card.balance_CLP / card.principal_CLP) * 100) : 100
                const barColor = usedPct > 80 ? '#ef4444' : usedPct > 50 ? '#f59e0b' : '#10b981'
                const nextInst = debtInstallments
                  .filter(i => i.debtId === card.id && !i.paid)
                  .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]
                return (
                  <div key={card.id} style={{ padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{card.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{card.institution}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#dc2626' }}>{clp(card.balance_CLP)}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>saldo pendiente</div>
                      </div>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden', marginBottom: 6 }}>
                      <div style={{ height: '100%', width: `${usedPct}%`, background: barColor, borderRadius: 3 }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                      <span>{usedPct.toFixed(0)}% del cupo utilizado</span>
                      {nextInst && (
                        <span>
                          Próx. cuota: <strong style={{ color: 'var(--text-1)' }}>{clp(nextInst.amount_CLP)}</strong>
                          {' · '}
                          {new Date(nextInst.dueDate + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0 0', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>Total deuda tarjetas</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#dc2626' }}>{clp(creditCards.reduce((s, c) => s + c.balance_CLP, 0))}</span>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
