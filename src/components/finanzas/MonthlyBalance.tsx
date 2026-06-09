import { useState } from 'react'
import {
  Plus, Trash2, Pencil, Check, X, Copy, Calendar,
  TrendingUp, TrendingDown, Wallet, CreditCard, PiggyBank, BarChart2
} from 'lucide-react'
import { useStore } from '../../store'
import { useFmt } from '../../hooks/useExchangeRate'
import type { MonthSection, MonthLineItem, MonthlyFinanceRecord, Debt, ExpenseItem } from '../../types'
import { EXPENSE_CATEGORIES, getCatInfo } from '../../utils/categories'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

// ── Utilidades de fecha ──────────────────────────────────────────────────────

function currentYM() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function prevYM(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function last13Months(): string[] {
  const result: string[] = []
  const d = new Date()
  for (let i = 0; i < 13; i++) {
    result.unshift(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    d.setMonth(d.getMonth() - 1)
  }
  return result.reverse()
}

function monthLabel(ym: string, short = false) {
  const [y, m] = ym.split('-')
  const d = new Date(parseInt(y), parseInt(m) - 1, 1)
  return short
    ? d.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' })
    : d.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
}

// ── Filtro de deudas activas por mes ────────────────────────────────────────

function getActiveDebts(debts: Debt[], yearMonth: string): Debt[] {
  return debts.filter(d => {
    const startYM = d.startDate ? d.startDate.slice(0, 7) : '0000-00'
    const endYM = d.endDate ? d.endDate.slice(0, 7) : '9999-99'
    return startYM <= yearMonth && endYM >= yearMonth
  })
}

// ── Motor de recomendaciones ─────────────────────────────────────────────────

interface Rec { type: 'success' | 'warning' | 'danger' | 'info'; emoji: string; title: string; text: string }

function buildRecommendations(
  income: number, fixed: number, variable: number,
  debtPayments: number, investments: number, emergencyBalance: number
): Rec[] {
  if (income === 0) return [{
    type: 'info', emoji: '💡', title: 'Agrega tus ingresos',
    text: 'Ingresa tus fuentes de ingreso para recibir análisis y recomendaciones personalizadas.'
  }]

  const recs: Rec[] = []
  const debtRatio = debtPayments / income
  const savingsRate = investments / income
  const needsRatio = (fixed + debtPayments) / income
  const freeBalance = income - fixed - variable - debtPayments - investments
  const freeRatio = freeBalance / income
  const monthlyExpenses = fixed + variable + debtPayments
  const emergencyMonths = monthlyExpenses > 0 ? emergencyBalance / monthlyExpenses : 0

  // Déficit
  if (freeBalance < 0) recs.push({
    type: 'danger', emoji: '🚨', title: 'Déficit mensual',
    text: `Tus egresos superan tus ingresos este mes. Identifica qué gastos puedes reducir o diferir. Los gastos variables son el primer lugar donde actuar.`
  })

  // Ratio deuda
  if (debtRatio > 0.4) recs.push({
    type: 'danger', emoji: '⚠️', title: 'Endeudamiento alto',
    text: `Tus cuotas consumen el ${(debtRatio * 100).toFixed(0)}% de tu ingreso. El límite saludable es 30%. Prioriza pagar la deuda con mayor tasa de interés (efecto bola de nieve inverso).`
  })
  else if (debtRatio > 0.3) recs.push({
    type: 'warning', emoji: '⚡', title: 'Endeudamiento moderado',
    text: `Tus cuotas son el ${(debtRatio * 100).toFixed(0)}% del ingreso. Evita contraer más deudas. Considera pagar cuotas adicionales para bajar el saldo más rápido.`
  })
  else if (debtRatio > 0) recs.push({
    type: 'success', emoji: '✅', title: 'Endeudamiento saludable',
    text: `Tus cuotas representan el ${(debtRatio * 100).toFixed(0)}% del ingreso. Buen nivel. Mantén la disciplina y evita endeudarte más.`
  })

  // Tasa de ahorro
  if (savingsRate < 0.05 && freeBalance >= 0) recs.push({
    type: 'warning', emoji: '💡', title: 'Tasa de ahorro muy baja',
    text: `Estás invirtiendo/ahorrando solo el ${(savingsRate * 100).toFixed(1)}% del ingreso. Intenta llegar al 10% como mínimo. Aunque sea pequeño, la constancia construye patrimonio.`
  })
  else if (savingsRate >= 0.05 && savingsRate < 0.1) recs.push({
    type: 'info', emoji: '📈', title: 'Ahorro en progreso',
    text: `Estás invirtiendo el ${(savingsRate * 100).toFixed(1)}% del ingreso. Bien encaminado — apunta al 10-20% para acelerar tu acumulación de capital.`
  })
  else if (savingsRate >= 0.1 && savingsRate < 0.2) recs.push({
    type: 'info', emoji: '📈', title: 'Buen ritmo de inversión',
    text: `Inviertes el ${(savingsRate * 100).toFixed(1)}% del ingreso. Sólido. Si puedes, intenta llegar al 20% — ese es el nivel que marca la diferencia a largo plazo.`
  })
  else if (savingsRate >= 0.2) recs.push({
    type: 'success', emoji: '🏆', title: 'Excelente tasa de inversión',
    text: `Inviertes el ${(savingsRate * 100).toFixed(1)}% del ingreso. Estás construyendo patrimonio a muy buen ritmo. Mantén esta disciplina.`
  })

  // Gastos fijos altos
  if (needsRatio > 0.6) recs.push({
    type: 'warning', emoji: '🏠', title: 'Gastos fijos + deudas muy altos',
    text: `Tus compromisos fijos (${(needsRatio * 100).toFixed(0)}% del ingreso) dejan poco espacio para ahorro y gastos libres. La regla 50/30/20 recomienda no superar el 50% en necesidades.`
  })

  // Margen libre alto sin inversión suficiente
  if (freeRatio > 0.15 && savingsRate < 0.2) recs.push({
    type: 'info', emoji: '💰', title: 'Tienes margen para invertir más',
    text: `Tu saldo libre es ${(freeRatio * 100).toFixed(1)}% del ingreso. Considera mover una parte a APV, fondo mutuo o fondo de emergencia antes de gastar ese excedente.`
  })

  // Fondo de emergencia
  if (emergencyMonths === 0) recs.push({
    type: 'danger', emoji: '🛟', title: 'Sin fondo de emergencia',
    text: 'No tienes fondo de emergencia registrado en "Ahorros & Inversiones". Prioriza construir uno de 3-6 meses de gastos. Es tu primera línea de defensa financiera.'
  })
  else if (emergencyMonths < 3) recs.push({
    type: 'warning', emoji: '🛟', title: 'Fondo de emergencia insuficiente',
    text: `Tu fondo cubre ${emergencyMonths.toFixed(1)} meses de gastos. El objetivo es 3-6 meses. Destina parte de tu margen mensual a reforzarlo.`
  })
  else recs.push({
    type: 'success', emoji: '🛟', title: 'Fondo de emergencia sólido',
    text: `Tu fondo cubre ${emergencyMonths.toFixed(1)} meses de gastos. Bien protegido ante imprevistos.`
  })

  return recs
}

// ── SectionPanel ─────────────────────────────────────────────────────────────

interface SectionPanelProps {
  title: string
  icon: React.ReactNode
  headerBg: string
  items: MonthLineItem[]
  onAdd: (item: Omit<MonthLineItem, 'id'>) => void
  onUpdate: (itemId: string, name: string, amount: number) => void
  onCategoryChange?: (itemId: string, category: ExpenseItem['category']) => void
  onDelete: (itemId: string) => void
  clp: (n: number) => string
  sign?: 'positive' | 'negative'
  showCategory?: boolean
}

function SectionPanel({ title, icon, headerBg, items, onAdd, onUpdate, onCategoryChange, onDelete, clp, sign = 'negative', showCategory = false }: SectionPanelProps) {
  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newCategory, setNewCategory] = useState<ExpenseItem['category']>('other')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editAmount, setEditAmount] = useState('')

  const total = items.reduce((s, i) => s + i.amount_CLP, 0)

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim() || !newAmount) return
    onAdd({ name: newName.trim(), amount_CLP: parseFloat(newAmount) || 0, ...(showCategory ? { category: newCategory } : {}) })
    setNewName(''); setNewAmount(''); setNewCategory('other')
  }

  function startEdit(item: MonthLineItem) {
    setEditId(item.id); setEditName(item.name); setEditAmount(String(item.amount_CLP))
  }

  function saveEdit() {
    if (!editId) return
    onUpdate(editId, editName, parseFloat(editAmount) || 0)
    setEditId(null)
  }

  return (
    <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ background: headerBg, padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'white', fontWeight: 600, fontSize: 14 }}>
          {icon} {title}
        </div>
        <span style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 700, fontSize: 15 }}>
          {sign === 'negative' && total > 0 ? '−' : ''}{clp(total)}
        </span>
      </div>
      <div style={{ padding: '12px 20px 14px' }}>
        {items.length === 0 && (
          <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 10, marginTop: 4 }}>Sin ítems — agrega uno abajo.</p>
        )}
        {items.map(item => {
          const catInfo = getCatInfo(item.category)
          return (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid #f8fafc' }}>
              {editId === item.id ? (
                <>
                  <input className="input" value={editName} onChange={e => setEditName(e.target.value)} style={{ flex: 2 }} autoFocus />
                  <input className="input" type="number" min="0" value={editAmount} onChange={e => setEditAmount(e.target.value)} style={{ flex: 1 }} />
                  <button className="btn btn-success" style={{ padding: '5px 9px' }} onClick={saveEdit}><Check size={13} /></button>
                  <button className="btn btn-secondary" style={{ padding: '5px 9px' }} onClick={() => setEditId(null)}><X size={13} /></button>
                </>
              ) : (
                <>
                  {showCategory && onCategoryChange && (
                    <select
                      value={item.category ?? ''}
                      onChange={e => onCategoryChange(item.id, e.target.value as ExpenseItem['category'])}
                      title="Categoría"
                      style={{
                        border: 'none', background: 'transparent', fontSize: 16,
                        cursor: 'pointer', padding: '0 2px', flexShrink: 0,
                        outline: 'none', appearance: 'none', WebkitAppearance: 'none',
                      }}
                    >
                      <option value="">—</option>
                      {EXPENSE_CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                      ))}
                    </select>
                  )}
                  {showCategory && !onCategoryChange && (
                    <span title={catInfo.label} style={{ fontSize: 15, flexShrink: 0 }}>{catInfo.emoji}</span>
                  )}
                  <span style={{ flex: 2, fontSize: 13, color: '#334155' }}>{item.name}</span>
                  {showCategory && item.category && (
                    <span style={{
                      fontSize: 10, padding: '2px 6px', borderRadius: 10, flexShrink: 0,
                      background: catInfo.color + '22', color: catInfo.color, fontWeight: 600,
                    }}>{catInfo.label}</span>
                  )}
                  <span style={{ fontWeight: 600, fontSize: 13, color: '#0f172a', textAlign: 'right', flexShrink: 0 }}>{clp(item.amount_CLP)}</span>
                  <button className="btn btn-secondary" style={{ padding: '4px 7px' }} onClick={() => startEdit(item)}><Pencil size={12} /></button>
                  <button className="btn btn-danger" style={{ padding: '4px 7px' }} onClick={() => onDelete(item.id)}><Trash2 size={12} /></button>
                </>
              )}
            </div>
          )
        })}
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <input className="input" placeholder="Nombre del ítem…" value={newName} onChange={e => setNewName(e.target.value)} style={{ flex: '2 1 140px' }} />
          <input className="input" type="number" min="0" placeholder="$ Monto" value={newAmount} onChange={e => setNewAmount(e.target.value)} style={{ flex: '1 1 100px' }} />
          {showCategory && (
            <select className="input" value={newCategory} onChange={e => setNewCategory(e.target.value as ExpenseItem['category'])} style={{ flex: '1 1 130px' }}>
              {EXPENSE_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
              ))}
            </select>
          )}
          <button type="submit" className="btn btn-primary" style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}>
            <Plus size={13} /> Agregar
          </button>
        </form>
      </div>
    </div>
  )
}

// ── AnnualView ───────────────────────────────────────────────────────────────

type AnnualRow = { ym: string; label: string; income: number; fixed: number; variable: number; debt: number; invest: number; free: number; hasData: boolean }

interface AnnualViewProps {
  records: MonthlyFinanceRecord[]
  debts: Debt[]
  clp: (n: number) => string
  year: string
}

function AnnualView({ records, debts, clp, year }: AnnualViewProps) {
  const months = last13Months().filter(m => m.startsWith(year))

  const rows: AnnualRow[] = months.map(ym => {
    const r = records.find(rec => rec.yearMonth === ym)
    const income = r ? r.incomes.reduce((s, i) => s + i.amount_CLP, 0) : 0
    const fixed = r ? r.fixedExpenses.reduce((s, i) => s + i.amount_CLP, 0) : 0
    const variable = r ? r.variableExpenses.reduce((s, i) => s + i.amount_CLP, 0) : 0
    const invest = r ? r.investments.reduce((s, i) => s + i.amount_CLP, 0) : 0
    const debt = r ? getActiveDebts(debts, ym).reduce((s, d) => s + d.monthlyPayment_CLP, 0) : 0
    const free = income - fixed - variable - debt - invest
    return { ym, label: monthLabel(ym, true), income, fixed, variable, debt, invest, free, hasData: !!r }
  })

  const totals = {
    income: rows.reduce((s, r) => s + r.income, 0),
    fixed: rows.reduce((s, r) => s + r.fixed, 0),
    variable: rows.reduce((s, r) => s + r.variable, 0),
    debt: rows.reduce((s, r) => s + r.debt, 0),
    invest: rows.reduce((s, r) => s + r.invest, 0),
    free: rows.reduce((s, r) => s + r.free, 0),
  }

  const chartData = rows.filter(r => r.hasData)

  const tableCategories: { label: string; key: keyof AnnualRow; color: string }[] = [
    { label: '💰 Ingresos', key: 'income', color: '#15803d' },
    { label: '📌 G. fijos', key: 'fixed', color: '#b45309' },
    { label: '🛒 G. variables', key: 'variable', color: '#dc2626' },
    { label: '🏦 Deudas', key: 'debt', color: '#7c3aed' },
    { label: '📈 Inversión', key: 'invest', color: '#1d4ed8' },
    { label: '✅ Saldo libre', key: 'free', color: '' },
  ]

  return (
    <div>
      {/* Chart */}
      {chartData.length > 0 && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Evolución mensual {year}</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${Math.round(Number(v) / 1000)}k`} />
              <Tooltip formatter={(v) => clp(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="income" name="Ingresos" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="fixed" name="G. fijos" fill="#f59e0b" stackId="out" />
              <Bar dataKey="variable" name="G. variables" fill="#ef4444" stackId="out" />
              <Bar dataKey="debt" name="Deudas" fill="#8b5cf6" stackId="out" />
              <Bar dataKey="invest" name="Inversión" fill="#3b82f6" radius={[3, 3, 0, 0]} stackId="out" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th style={{ minWidth: 130 }}>Categoría</th>
              {rows.map(r => (
                <th key={r.ym} style={{ textAlign: 'right', opacity: r.hasData ? 1 : 0.3 }}>
                  {r.label}
                </th>
              ))}
              <th style={{ textAlign: 'right', background: '#f0fdf4', color: '#15803d' }}>Total {year}</th>
            </tr>
          </thead>
          <tbody>
            {tableCategories.map(({ label, key, color }) => (
              <tr key={key}>
                <td style={{ fontWeight: 600, fontSize: 12 }}>{label}</td>
                {rows.map(r => {
                  const val = r[key] as number
                  const isNeg = key === 'free' && val < 0
                  return (
                    <td key={r.ym} style={{ textAlign: 'right', color: r.hasData ? (isNeg ? '#dc2626' : color || '#334155') : '#e2e8f0', fontWeight: r.hasData ? 500 : 400 }}>
                      {r.hasData ? clp(val) : '—'}
                    </td>
                  )
                })}
                <td style={{ textAlign: 'right', fontWeight: 700, background: '#f8fafc', color: key === 'free' ? (totals.free >= 0 ? '#15803d' : '#dc2626') : (color || '#334155') }}>
                  {clp(totals[key as keyof typeof totals])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.filter(r => !r.hasData).length > 0 && (
          <p style={{ fontSize: 11, color: '#94a3b8', padding: '8px 16px', borderTop: '1px solid #f1f5f9' }}>
            Los meses sin registro (—) no se incluyen en los totales de deudas e inversión.
          </p>
        )}
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function MonthlyBalance() {
  const { monthlyRecords, addMonthlyRecord, copyMonthlyRecord, deleteMonthlyRecord, addMonthItem, updateMonthItem, updateMonthItemCategory, deleteMonthItem, debts, savings } = useStore()
  const { clp } = useFmt()

  const [selectedMonth, setSelectedMonth] = useState(currentYM())
  const [showAnnual, setShowAnnual] = useState(false)

  const months = last13Months()
  const record = monthlyRecords.find(r => r.yearMonth === selectedMonth)
  const hasPrev = monthlyRecords.some(r => r.yearMonth === prevYM(selectedMonth))

  const activeDebts = getActiveDebts(debts, selectedMonth)
  const debtTotal = activeDebts.reduce((s, d) => s + d.monthlyPayment_CLP, 0)
  const emergencyBalance = savings.filter(s => s.type === 'emergency').reduce((s, sv) => s + sv.balance_CLP, 0)

  const income = record ? record.incomes.reduce((s, i) => s + i.amount_CLP, 0) : 0
  const fixed = record ? record.fixedExpenses.reduce((s, i) => s + i.amount_CLP, 0) : 0
  const variable = record ? record.variableExpenses.reduce((s, i) => s + i.amount_CLP, 0) : 0
  const invest = record ? record.investments.reduce((s, i) => s + i.amount_CLP, 0) : 0
  const totalOut = fixed + variable + debtTotal + invest
  const freeBalance = income - totalOut

  function makeHandlers(section: MonthSection) {
    return {
      onAdd:           (item: Omit<MonthLineItem, 'id'>) => { if (record) addMonthItem(record.id, section, item) },
      onUpdate:        (itemId: string, name: string, amount: number) => { if (record) updateMonthItem(record.id, section, itemId, name, amount) },
      onCategoryChange:(itemId: string, category: ExpenseItem['category']) => { if (record) updateMonthItemCategory(record.id, section, itemId, category) },
      onDelete:        (itemId: string) => { if (record) deleteMonthItem(record.id, section, itemId) },
    }
  }

  const recs = buildRecommendations(income, fixed, variable, debtTotal, invest, emergencyBalance)

  const recStyle: Record<Rec['type'], { bg: string; border: string; titleColor: string }> = {
    success: { bg: '#f0fdf4', border: '#22c55e', titleColor: '#15803d' },
    warning: { bg: '#fffbeb', border: '#f59e0b', titleColor: '#a16207' },
    danger: { bg: '#fef2f2', border: '#ef4444', titleColor: '#dc2626' },
    info: { bg: '#eff6ff', border: '#3b82f6', titleColor: '#1d4ed8' },
  }

  const currentYear = selectedMonth.split('-')[0]

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>Balance Mensual</h2>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Cada mes es un registro independiente — ve tu evolución y proyección anual</p>
        </div>
        <button className={`btn ${showAnnual ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setShowAnnual(!showAnnual)}>
          <BarChart2 size={15} /> {showAnnual ? 'Ver mes detalle' : `Ver año ${currentYear}`}
        </button>
      </div>

      {/* Month selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', paddingBottom: 6 }}>
        {months.map(ym => {
          const hasRecord = monthlyRecords.some(r => r.yearMonth === ym)
          const isSelected = ym === selectedMonth
          return (
            <button
              key={ym}
              onClick={() => { setSelectedMonth(ym); setShowAnnual(false) }}
              style={{
                padding: '7px 15px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', transition: 'all 0.15s',
                background: isSelected ? '#2563eb' : hasRecord ? '#ecfdf5' : '#f8fafc',
                color: isSelected ? 'white' : hasRecord ? '#059669' : '#94a3b8',
                boxShadow: isSelected ? '0 2px 8px rgba(37,99,235,0.3)' : 'none',
              }}
            >
              {monthLabel(ym, true)}
              {hasRecord && !isSelected && <span style={{ marginLeft: 5, fontSize: 8, verticalAlign: 'middle' }}>●</span>}
            </button>
          )
        })}
      </div>

      {/* Annual view */}
      {showAnnual && (
        <AnnualView records={monthlyRecords} debts={debts} clp={clp} year={currentYear} />
      )}

      {/* Month detail */}
      {!showAnnual && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, textTransform: 'capitalize' }}>
              {monthLabel(selectedMonth)}
            </h3>
            <div style={{ display: 'flex', gap: 8 }}>
              {!record && (
                <>
                  <button className="btn btn-primary" onClick={() => addMonthlyRecord(selectedMonth)}>
                    <Plus size={14} /> Crear registro
                  </button>
                  {hasPrev && (
                    <button className="btn btn-secondary" onClick={() => copyMonthlyRecord(prevYM(selectedMonth), selectedMonth)}>
                      <Copy size={14} /> Copiar mes anterior
                    </button>
                  )}
                </>
              )}
              {record && (
                <button className="btn btn-danger" style={{ padding: '6px 12px' }} onClick={() => deleteMonthlyRecord(record.id)}>
                  <Trash2 size={14} /> Eliminar mes
                </button>
              )}
            </div>
          </div>

          {!record ? (
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', textAlign: 'center', padding: 56 }}>
              <Calendar size={44} style={{ color: '#cbd5e1', margin: '0 auto 14px', display: 'block' }} />
              <p style={{ color: '#475569', fontWeight: 600, fontSize: 15, marginBottom: 6 }}>Sin registro para {monthLabel(selectedMonth)}</p>
              <p style={{ color: '#94a3b8', fontSize: 13 }}>Crea uno nuevo o copia los ítems del mes anterior para agilizar el ingreso.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 370px', gap: 20, alignItems: 'start' }}>

              {/* ── Izquierda: secciones ── */}
              <div>
                <SectionPanel
                  title="Ingresos"
                  icon={<TrendingUp size={15} />}
                  headerBg="#059669"
                  items={record.incomes}
                  clp={clp}
                  sign="positive"
                  {...makeHandlers('incomes')}
                />
                <SectionPanel
                  title="Gastos Fijos"
                  icon={<Wallet size={15} />}
                  headerBg="#d97706"
                  items={record.fixedExpenses}
                  clp={clp}
                  showCategory
                  {...makeHandlers('fixedExpenses')}
                />
                <SectionPanel
                  title="Gastos Variables"
                  icon={<TrendingDown size={15} />}
                  headerBg="#dc2626"
                  items={record.variableExpenses}
                  clp={clp}
                  showCategory
                  {...makeHandlers('variableExpenses')}
                />

                {/* Deudas — solo lectura, viene de la pestaña Deudas */}
                <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 14 }}>
                  <div style={{ background: '#7c3aed', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'white', fontWeight: 600, fontSize: 14 }}>
                      <CreditCard size={15} /> Deudas — cuotas mensuales
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 700, fontSize: 15 }}>
                      {debtTotal > 0 ? '−' : ''}{clp(debtTotal)}
                    </span>
                  </div>
                  <div style={{ padding: '12px 20px 14px' }}>
                    {activeDebts.length === 0 ? (
                      <p style={{ color: '#94a3b8', fontSize: 13 }}>Sin cuotas activas en {monthLabel(selectedMonth, true)}. {debts.length > 0 ? 'Hay deudas registradas que aún no comienzan o ya terminaron.' : 'Agrégalas en la pestaña "Deudas".'}</p>
                    ) : (
                      activeDebts.map(d => (
                        <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid #f8fafc' }}>
                          <span style={{ flex: 2, fontSize: 13, color: '#334155' }}>{d.name}</span>
                          <span style={{ fontSize: 11, color: '#94a3b8', flex: 1 }}>{d.institution}</span>
                          <span style={{ fontWeight: 600, fontSize: 13, color: '#7c3aed' }}>{clp(d.monthlyPayment_CLP)}</span>
                        </div>
                      ))
                    )}
                    {debts.length > activeDebts.length && activeDebts.length > 0 && (
                      <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
                        {debts.length - activeDebts.length} deuda(s) no aplican en este mes (fecha inicio/término).
                      </p>
                    )}
                    <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 8, marginBottom: 0 }}>
                      Solo se incluyen deudas activas en {monthLabel(selectedMonth, true)}.
                    </p>
                  </div>
                </div>

                <SectionPanel
                  title="Inversión & Ahorro"
                  icon={<PiggyBank size={15} />}
                  headerBg="#2563eb"
                  items={record.investments}
                  clp={clp}
                  {...makeHandlers('investments')}
                />
              </div>

              {/* ── Derecha: balance + recomendaciones ── */}
              <div style={{ position: 'sticky', top: 20 }}>

                {/* Balance card */}
                <div style={{
                  background: freeBalance >= 0 ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${freeBalance >= 0 ? '#86efac' : '#fca5a5'}`,
                  borderRadius: 14, padding: 20, marginBottom: 16,
                }}>
                  <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>
                    Balance — {monthLabel(selectedMonth, true)}
                  </h3>

                  {[
                    { label: '💰 Ingresos', amount: income, color: '#059669', neg: false },
                    { label: '📌 G. fijos', amount: fixed, color: '#d97706', neg: true },
                    { label: '🛒 G. variables', amount: variable, color: '#dc2626', neg: true },
                    { label: '🏦 Deudas (cuotas)', amount: debtTotal, color: '#7c3aed', neg: true },
                    { label: '📈 Inversión / Ahorro', amount: invest, color: '#2563eb', neg: true },
                  ].map(({ label, amount, color, neg }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                      <span style={{ fontSize: 13, color: '#475569' }}>{label}</span>
                      <span style={{ fontWeight: 600, fontSize: 13, color }}>{neg && amount > 0 ? '−' : ''}{clp(amount)}</span>
                    </div>
                  ))}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, marginTop: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Saldo libre</span>
                    <span style={{ fontSize: 22, fontWeight: 800, color: freeBalance >= 0 ? '#059669' : '#dc2626' }}>
                      {clp(freeBalance)}
                    </span>
                  </div>

                  {/* Métricas rápidas */}
                  {income > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 14 }}>
                      {[
                        { label: 'Ahorro', value: `${((invest / income) * 100).toFixed(1)}%`, ok: invest / income >= 0.1, neutral: invest === 0 },
                        { label: 'En deudas', value: `${((debtTotal / income) * 100).toFixed(1)}%`, ok: debtTotal / income <= 0.3, neutral: debtTotal === 0 },
                        { label: 'Margen', value: `${((freeBalance / income) * 100).toFixed(1)}%`, ok: freeBalance >= 0, neutral: false },
                      ].map(m => (
                        <div key={m.label} style={{
                          background: m.neutral ? '#f8fafc' : m.ok ? '#dcfce7' : '#fee2e2',
                          borderRadius: 8, padding: '8px 6px', textAlign: 'center'
                        }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: m.neutral ? '#94a3b8' : m.ok ? '#15803d' : '#dc2626' }}>
                            {m.value}
                          </div>
                          <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{m.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Anual proyectado */}
                  {income > 0 && (
                    <div style={{ marginTop: 14, padding: '10px 12px', background: 'rgba(255,255,255,0.7)', borderRadius: 8, fontSize: 12 }}>
                      <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#475569' }}>Proyección anual (×12)</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Ingresos:</span>
                        <span style={{ fontWeight: 600, color: '#059669' }}>{clp(income * 12)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Saldo libre:</span>
                        <span style={{ fontWeight: 600, color: freeBalance >= 0 ? '#059669' : '#dc2626' }}>{clp(freeBalance * 12)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Recomendaciones */}
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                    Recomendaciones
                  </p>
                  {recs.map((rec, i) => {
                    const s = recStyle[rec.type]
                    return (
                      <div key={i} style={{
                        background: s.bg, borderLeft: `3px solid ${s.border}`,
                        borderRadius: '0 10px 10px 0', padding: '10px 14px', marginBottom: 8
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <span style={{ fontSize: 13 }}>{rec.emoji}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: s.titleColor }}>{rec.title}</span>
                        </div>
                        <p style={{ fontSize: 12, color: '#475569', margin: 0, lineHeight: 1.55 }}>{rec.text}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          )}
        </>
      )}
    </div>
  )
}
