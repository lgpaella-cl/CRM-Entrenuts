import { useState } from 'react'
import {
  TrendingDown, TrendingUp, CreditCard, PiggyBank,
  Calendar, Wallet, ChevronDown, ChevronUp, Landmark
} from 'lucide-react'
import { useStore } from '../../store'
import { useFmt } from '../../hooks/useExchangeRate'
import { EXPENSE_CATEGORIES, getCatInfo } from '../../utils/categories'

// ── Helpers ──────────────────────────────────────────────────────

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MONTH_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function sumItems(items: { amount_CLP: number }[]) {
  return items.reduce((s, i) => s + i.amount_CLP, 0)
}
function currentYM() { return new Date().toISOString().slice(0, 7) }
function prevYM(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
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
  } = useStore()
  const { clp } = useFmt()

  const [selectedYM, setSelectedYM] = useState(currentYM())
  const [catView, setCatView] = useState<'month' | 'year'>('month')
  const [catFilter, setCatFilter] = useState<string>('all')
  const [expandedCat, setExpandedCat] = useState<string | null>(null)

  // Month selector options (last 12)
  const allMonths: string[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i)
    allMonths.push(d.toISOString().slice(0, 7))
  }

  // ── Selected month record ──
  const sorted = [...monthlyRecords].sort((a, b) => b.yearMonth.localeCompare(a.yearMonth))
  const record    = monthlyRecords.find(r => r.yearMonth === selectedYM) ?? sorted[0]
  const prevRecord = monthlyRecords.find(r => r.yearMonth === prevYM(record?.yearMonth ?? selectedYM))

  const monthlyIncome   = record ? sumItems(record.incomes) : 0
  const monthlyFixed    = record ? sumItems(record.fixedExpenses) : 0
  const monthlyVariable = record ? sumItems(record.variableExpenses) : 0

  // Cuotas del mes seleccionado
  const monthlyDebtPayments = debtInstallments
    .filter(i => i.dueDate.startsWith(record?.yearMonth ?? selectedYM))
    .reduce((s, i) => s + i.amount_CLP, 0)

  const freeFlow = monthlyIncome - monthlyFixed - monthlyVariable - monthlyDebtPayments

  // Totals
  const totalDebt    = debts.reduce((s, d) => s + d.balance_CLP, 0)
  const totalSavings = savings.reduce((s, sv) => s + sv.balance_CLP, 0)

  // ── Proyección próximo mes ──
  const nm = nextYM(record?.yearMonth ?? selectedYM)

  // Variable del mes ANTERIOR (no promedio)
  const prevVariable = prevRecord ? sumItems(prevRecord.variableExpenses) : monthlyVariable

  // Cuotas del próximo mes
  const nextMonthInstallments = debtInstallments
    .filter(i => !i.paid && i.dueDate.startsWith(nm))
    .reduce((s, i) => s + i.amount_CLP, 0)

  const projectedNeeds    = monthlyFixed + prevVariable + nextMonthInstallments
  const projectedFreeFlow = monthlyIncome - projectedNeeds

  // Saldo en cuentas desde el registro del mes seleccionado (accountBalances)
  const accountBalances  = record?.accountBalances ?? []
  const availableBalance = accountBalances.reduce((s, i) => s + i.amount_CLP, 0)
  const financialGap     = availableBalance - projectedNeeds

  // ── Gastos por categoría (desde monthlyRecords, NO expenseLogs) ──
  // Tomamos fixedExpenses + variableExpenses con su campo category
  const catSourceRecords = catView === 'month'
    ? (record ? [record] : [])
    : monthlyRecords.filter(r => r.yearMonth.startsWith(selectedYM.slice(0, 4)))

  const allExpenseItems = catSourceRecords.flatMap(r => [
    ...r.fixedExpenses.map(i => ({ ...i, section: 'fixed' as const })),
    ...r.variableExpenses.map(i => ({ ...i, section: 'variable' as const })),
  ])

  const totalCatSpend = allExpenseItems.reduce((s, i) => s + i.amount_CLP, 0)

  // Categorías presentes
  const catData = EXPENSE_CATEGORIES
    .map(c => ({
      ...c,
      total: allExpenseItems.filter(i => i.category === c.value).reduce((s, i) => s + i.amount_CLP, 0),
      items: allExpenseItems.filter(i => i.category === c.value),
    }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total)

  // Items sin categoría asignada
  const uncategorized = allExpenseItems.filter(i => !i.category)
  const uncategorizedTotal = uncategorized.reduce((s, i) => s + i.amount_CLP, 0)

  // Filtered view
  const filteredItems = catFilter === 'all'
    ? allExpenseItems
    : catFilter === 'none'
      ? uncategorized
      : allExpenseItems.filter(i => i.category === catFilter)

  // ── Upcoming installments ──
  const today = new Date().toISOString().split('T')[0]
  const upcoming = debtInstallments
    .filter(i => !i.paid && i.dueDate >= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5)

  // ── Credit cards ──
  const creditCards = debts.filter(d => d.type === 'credit_card' && d.balance_CLP > 0)

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)', marginBottom: 3 }}>Resumen Financiero</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {record ? `Datos · ${fullLabelYM(record.yearMonth)}` : 'Sin datos — crea un balance en Ingresos & Gastos'}
          </p>
        </div>
        <select className="input" style={{ maxWidth: 165 }} value={selectedYM} onChange={e => setSelectedYM(e.target.value)}>
          {allMonths.map(m => <option key={m} value={m}>{labelYM(m)}</option>)}
        </select>
      </div>

      {/* 4 stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 16 }}>
        {[
          { label: 'Ingreso mensual',  value: monthlyIncome,  icon: <TrendingUp size={18} />,  color: '#16a34a', bg: '#dcfce7' },
          { label: 'Gastos del mes',   value: monthlyFixed + monthlyVariable + monthlyDebtPayments, icon: <TrendingDown size={18} />, color: '#dc2626', bg: '#fee2e2' },
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

      {/* Flujo libre banner */}
      <div style={{
        background: freeFlow >= 0 ? '#f0fdf4' : '#fef2f2',
        border: `1.5px solid ${freeFlow >= 0 ? '#bbf7d0' : '#fecaca'}`,
        borderRadius: 12, padding: '13px 20px', marginBottom: 20,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: freeFlow >= 0 ? '#15803d' : '#dc2626' }}>
            Flujo libre · {record ? fullLabelYM(record.yearMonth) : '—'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
            Ingresos {clp(monthlyIncome)} − Fijos {clp(monthlyFixed)} − Variables {clp(monthlyVariable)} − Cuotas {clp(monthlyDebtPayments)}
          </div>
        </div>
        <div style={{ fontSize: 26, fontWeight: 900, color: freeFlow >= 0 ? '#15803d' : '#dc2626' }}>{clp(freeFlow)}</div>
      </div>

      {/* Row: Proyección + Gastos por categoría */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, marginBottom: 16 }}>

        {/* Proyección próximo mes */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-1)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={15} /> Proyección · {labelYM(nm)}
          </div>

          {/* Saldo disponible en cuentas (desde Ingresos & Gastos del mes) */}
          <div style={{ padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Landmark size={11} /> Saldo en cuentas · {record ? labelYM(record.yearMonth) : '—'}
            </div>
            {accountBalances.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Sin cuentas — agrégalas en <strong>Ingresos & Gastos</strong>
              </div>
            ) : (
              <div>
                {accountBalances.map(acc => (
                  <div key={acc.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-2)' }}>{acc.name}</span>
                    <span style={{ fontWeight: 600, color: '#16a34a' }}>{clp(acc.amount_CLP)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, color: '#16a34a', paddingTop: 7, marginTop: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>Total</span>
                  <span>{clp(availableBalance)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Desglose */}
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 12 }}>
            {[
              { label: 'Ingreso estimado',     value: monthlyIncome,           sign: '+', color: '#16a34a' },
              { label: 'Gastos fijos',         value: monthlyFixed,            sign: '−', color: '#374151' },
              { label: `Gastos variables (${prevRecord ? labelYM(prevRecord.yearMonth) : 'mes ant.'})`,
                                               value: prevVariable,            sign: '−', color: '#6b7280' },
              { label: `Cuotas ${labelYM(nm)}`, value: nextMonthInstallments,  sign: '−', color: '#dc2626' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12.5 }}>
                <span style={{ color: 'var(--text-2)' }}>{row.label}</span>
                <span style={{ fontWeight: 600, color: row.color }}>{row.sign} {clp(row.value)}</span>
              </div>
            ))}
          </div>

          {/* Flujo libre proyectado */}
          <div style={{
            padding: '9px 13px', borderRadius: 8, marginBottom: 10,
            background: projectedFreeFlow >= 0 ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${projectedFreeFlow >= 0 ? '#bbf7d0' : '#fecaca'}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: projectedFreeFlow >= 0 ? '#15803d' : '#dc2626' }}>Flujo libre estimado</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: projectedFreeFlow >= 0 ? '#15803d' : '#dc2626' }}>{clp(projectedFreeFlow)}</span>
          </div>

          {/* Saldo vs necesidades */}
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
          {/* Header con toggles */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Wallet size={15} /> Gastos por categoría
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['month', 'year'] as const).map(v => (
                <button key={v} onClick={() => { setCatView(v); setExpandedCat(null); setCatFilter('all') }} style={{
                  padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: catView === v ? '#2563eb' : 'var(--bg-secondary)',
                  color: catView === v ? 'white' : 'var(--text-2)',
                }}>
                  {v === 'month' ? 'Este mes' : `Año ${selectedYM.slice(0, 4)}`}
                </button>
              ))}
            </div>
          </div>

          {/* Filtro por categoría */}
          {catData.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
              <button onClick={() => setCatFilter('all')} style={{
                padding: '3px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                background: catFilter === 'all' ? '#0f172a' : 'var(--bg-secondary)',
                color: catFilter === 'all' ? 'white' : 'var(--text-2)',
              }}>Todas</button>
              {catData.map(c => (
                <button key={c.value} onClick={() => setCatFilter(catFilter === c.value ? 'all' : c.value)} style={{
                  padding: '3px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                  background: catFilter === c.value ? c.color : 'var(--bg-secondary)',
                  color: catFilter === c.value ? 'white' : 'var(--text-2)',
                }}>{c.emoji} {c.label}</button>
              ))}
              {uncategorizedTotal > 0 && (
                <button onClick={() => setCatFilter(catFilter === 'none' ? 'all' : 'none')} style={{
                  padding: '3px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                  background: catFilter === 'none' ? '#64748b' : 'var(--bg-secondary)',
                  color: catFilter === 'none' ? 'white' : 'var(--text-2)',
                }}>— Sin categoría</button>
              )}
            </div>
          )}

          {allExpenseItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
              Sin gastos en {catView === 'month' ? 'este mes' : `el año ${selectedYM.slice(0, 4)}`}.<br />
              <span style={{ fontSize: 11 }}>Agrégalos en "Ingresos & Gastos".</span>
            </div>
          ) : catFilter === 'all' ? (
            /* Vista resumen por categoría */
            <div>
              {catData.map(cat => {
                const pct = totalCatSpend > 0 ? (cat.total / totalCatSpend) * 100 : 0
                const isExpanded = expandedCat === cat.value
                return (
                  <div key={cat.value}>
                    <div onClick={() => setExpandedCat(isExpanded ? null : cat.value)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 6px', cursor: 'pointer', borderRadius: 8,
                        background: isExpanded ? 'var(--bg-secondary)' : 'transparent' }}>
                      <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{cat.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{cat.label}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                            {clp(cat.total)} <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>{pct.toFixed(0)}%</span>
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
                    {isExpanded && (
                      <div style={{ margin: '2px 0 6px 32px', background: 'var(--bg-secondary)', borderRadius: 8, padding: '6px 10px', border: '1px solid var(--border)' }}>
                        {cat.items.map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                            <span style={{ color: 'var(--text-2)' }}>{item.name}</span>
                            <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{clp(item.amount_CLP)}</span>
                          </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, fontSize: 12, fontWeight: 700 }}>
                          <span style={{ color: 'var(--text-2)' }}>{cat.items.length} ítem{cat.items.length !== 1 ? 's' : ''}</span>
                          <span style={{ color: 'var(--text-1)' }}>{clp(cat.total)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              {uncategorizedTotal > 0 && (
                <div style={{ padding: '6px 6px', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', borderTop: '1px dashed var(--border)', marginTop: 4 }}>
                  <span>— Sin categoría ({uncategorized.length} ítems)</span>
                  <span>{clp(uncategorizedTotal)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 6px 0', borderTop: '2px solid var(--border)', marginTop: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>Total gastos</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>{clp(totalCatSpend)}</span>
              </div>
            </div>
          ) : (
            /* Vista filtrada por categoría o sin categoría */
            <div>
              <div style={{ marginBottom: 10, fontSize: 13, color: 'var(--text-2)' }}>
                {filteredItems.length} ítem{filteredItems.length !== 1 ? 's' : ''} ·{' '}
                <strong style={{ color: 'var(--text-1)' }}>{clp(filteredItems.reduce((s, i) => s + i.amount_CLP, 0))}</strong>
              </div>
              {filteredItems.map((item, idx) => {
                const info = getCatInfo(item.category)
                return (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 8px', borderBottom: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 15 }}>{info.emoji}</span>
                      <div>
                        <div style={{ color: 'var(--text-1)', fontWeight: 500 }}>{item.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{item.section === 'fixed' ? 'Gasto fijo' : 'Gasto variable'}</div>
                      </div>
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--text-1)' }}>{clp(item.amount_CLP)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detalle gastos del mes (desde balance mensual) */}
      {record && (record.fixedExpenses.length > 0 || record.variableExpenses.length > 0) && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-1)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingDown size={15} /> Detalle de gastos · {fullLabelYM(record.yearMonth)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {record.fixedExpenses.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Gastos fijos</div>
                {record.fixedExpenses.map(item => {
                  const info = getCatInfo(item.category)
                  return (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 13, gap: 8 }}>
                      <span style={{ fontSize: 14 }}>{info.emoji}</span>
                      <span style={{ flex: 1, color: 'var(--text-2)' }}>{item.name}</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{clp(item.amount_CLP)}</span>
                    </div>
                  )
                })}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, fontSize: 13, fontWeight: 700 }}>
                  <span style={{ color: 'var(--text-2)' }}>Subtotal fijos</span>
                  <span style={{ color: 'var(--text-1)' }}>{clp(monthlyFixed)}</span>
                </div>
              </div>
            )}
            {record.variableExpenses.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Gastos variables</div>
                {record.variableExpenses.map(item => {
                  const info = getCatInfo(item.category)
                  return (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 13, gap: 8 }}>
                      <span style={{ fontSize: 14 }}>{info.emoji}</span>
                      <span style={{ flex: 1, color: 'var(--text-2)' }}>{item.name}</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{clp(item.amount_CLP)}</span>
                    </div>
                  )
                })}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, fontSize: 13, fontWeight: 700 }}>
                  <span style={{ color: 'var(--text-2)' }}>Subtotal variables</span>
                  <span style={{ color: 'var(--text-1)' }}>{clp(monthlyVariable)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Row: Cuotas próximas + Tarjetas de crédito */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Upcoming */}
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
                        {new Date(inst.dueDate + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: isOverdue ? '#dc2626' : 'var(--text-1)', flexShrink: 0 }}>
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
              Sin tarjetas registradas.<br />
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
                          Próx: <strong style={{ color: 'var(--text-1)' }}>{clp(nextInst.amount_CLP)}</strong>
                          {' · '}{new Date(nextInst.dueDate + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0 0', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>Total tarjetas</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#dc2626' }}>{clp(creditCards.reduce((s, c) => s + c.balance_CLP, 0))}</span>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
