import { useState } from 'react'
import { Plus, Trash2, TrendingUp, Info, DollarSign, BarChart2, Percent } from 'lucide-react'
import { useStore } from '../../store'
import { useFmt } from '../../hooks/useExchangeRate'

function currentYearMonth() {
  return new Date().toISOString().slice(0, 7)
}

function formatYearMonth(ym: string) {
  const [y, m] = ym.split('-')
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  return `${months[parseInt(m) - 1]} ${y}`
}

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', verticalAlign: 'middle', marginLeft: 5, cursor: 'help' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <Info size={13} color="#9ca3af" />
      {show && (
        <span style={{
          position: 'absolute', bottom: '130%', left: '50%', transform: 'translateX(-50%)',
          background: '#1e293b', color: 'white', fontSize: 12, padding: '6px 10px', borderRadius: 8,
          width: 220, whiteSpace: 'normal', lineHeight: 1.4, zIndex: 100,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}>
          {text}
        </span>
      )}
    </span>
  )
}

function PLRow({
  label, value, sub, indent = false, bold = false, color, hint
}: {
  label: string, value: string | number, sub?: string, indent?: boolean,
  bold?: boolean, color?: string, hint?: string
}) {
  const { clp } = useFmt()
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '7px 0', borderBottom: '1px solid #f1f5f9',
      paddingLeft: indent ? 20 : 0,
    }}>
      <div style={{ fontSize: 13, color: '#374151', display: 'flex', alignItems: 'center' }}>
        {indent && <span style={{ color: '#d1d5db', marginRight: 8 }}>└</span>}
        <span style={{ fontWeight: bold ? 600 : 400 }}>{label}</span>
        {hint && <Tooltip text={hint} />}
      </div>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontSize: bold ? 15 : 13, fontWeight: bold ? 700 : 500, color: color ?? '#111827' }}>
          {typeof value === 'number' ? clp(value) : value}
        </span>
        {sub && <div style={{ fontSize: 11, color: '#9ca3af' }}>{sub}</div>}
      </div>
    </div>
  )
}

function PLSection({ title, icon, children, highlight }: {
  title: string, icon: React.ReactNode, children: React.ReactNode, highlight?: boolean
}) {
  return (
    <div style={{
      background: highlight ? '#fffbeb' : 'white',
      border: `1px solid ${highlight ? '#fde68a' : '#e2e8f0'}`,
      borderRadius: 12, padding: '16px 20px', marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontWeight: 700, fontSize: 13, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {icon} {title}
      </div>
      {children}
    </div>
  )
}

export function BusinessFinanceTab() {
  const { products, stores, sales, businessExpenses, addBusinessExpense, deleteBusinessExpense } = useStore()
  const { clp, usdToClp } = useFmt()

  const [yearMonth, setYearMonth] = useState(currentYearMonth())
  const [taxPct, setTaxPct] = useState(27)
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [expForm, setExpForm] = useState({ name: '', amount_CLP: '', category: 'fixed' as 'fixed' | 'variable' | 'other' })

  /* ── Calculations ──────────────────────────────────────────── */

  const periodSales = sales.filter(s => s.date.startsWith(yearMonth))

  // Revenue
  const totalRevenue = periodSales.reduce((sum, s) => sum + s.quantity * s.salePrice_CLP, 0)
  const totalUnits = periodSales.reduce((sum, s) => sum + s.quantity, 0)

  // COGS: cost of goods sold (FOB in CLP)
  const totalCOGS = periodSales.reduce((sum, s) => {
    const prod = products.find(p => p.id === s.productId)
    return sum + s.quantity * usdToClp(prod?.costFOB_USD ?? 0)
  }, 0)

  // Commissions paid to stores
  const totalCommissions = periodSales.reduce((sum, s) => {
    const store = stores.find(st => st.id === s.storeId)
    return sum + s.quantity * s.salePrice_CLP * ((store?.commissionPct ?? 0) / 100)
  }, 0)

  const totalCostOfSales = totalCOGS + totalCommissions
  const grossProfit = totalRevenue - totalCostOfSales
  const grossMarginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0

  // Operating expenses (from this period)
  const periodExpenses = businessExpenses.filter(e => e.yearMonth === yearMonth)
  const fixedExpenses = periodExpenses.filter(e => e.category === 'fixed')
  const variableExpenses = periodExpenses.filter(e => e.category === 'variable')
  const otherExpenses = periodExpenses.filter(e => e.category === 'other')
  const totalOpEx = periodExpenses.reduce((sum, e) => sum + e.amount_CLP, 0)

  const ebitda = grossProfit - totalOpEx
  const ebitdaPct = totalRevenue > 0 ? (ebitda / totalRevenue) * 100 : 0

  const tax = ebitda > 0 ? ebitda * taxPct / 100 : 0
  const netProfit = ebitda - tax
  const netMarginPct = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

  /* ── Helpers ─────────────────────────────────────────────────── */

  function handleAddExpense(e: React.FormEvent) {
    e.preventDefault()
    addBusinessExpense({
      name: expForm.name,
      amount_CLP: parseFloat(expForm.amount_CLP) || 0,
      category: expForm.category,
      yearMonth,
    })
    setExpForm({ name: '', amount_CLP: '', category: 'fixed' })
    setShowAddExpense(false)
  }

  const moreMonths: string[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    moreMonths.push(d.toISOString().slice(0, 7))
  }

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Estado de Resultados</h2>
          <p className="text-sm text-gray-500 mt-0.5">Resultado del negocio mes a mes</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select className="input" style={{ maxWidth: 180 }} value={yearMonth} onChange={e => setYearMonth(e.target.value)}>
            {moreMonths.map(m => (
              <option key={m} value={m}>{formatYearMonth(m)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="stat-label">Ingresos</div>
          <div className="stat-value">{clp(totalRevenue)}</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{totalUnits} unidades</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Margen bruto</div>
          <div className={`stat-value ${grossMarginPct > 30 ? 'text-green-600' : grossMarginPct > 15 ? 'text-yellow-600' : 'text-red-600'}`}>
            {grossMarginPct.toFixed(1)}%
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{clp(grossProfit)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">EBITDA</div>
          <div className={`stat-value ${ebitdaPct > 20 ? 'text-green-600' : ebitdaPct > 5 ? 'text-yellow-600' : 'text-red-600'}`}>
            {ebitdaPct.toFixed(1)}%
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{clp(ebitda)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Utilidad neta est.</div>
          <div className={`stat-value ${netProfit > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {clp(netProfit)}
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{netMarginPct.toFixed(1)}% del ingreso</div>
        </div>
      </div>

      {totalRevenue === 0 && periodSales.length === 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#92400e', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <Info size={15} style={{ marginTop: 1, flexShrink: 0 }} />
          <span>No hay ventas registradas en <strong>{formatYearMonth(yearMonth)}</strong>. Agrega ventas desde el tab &ldquo;Ventas&rdquo; y aparecerán aquí automáticamente.</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
        {/* P&L detail */}
        <div>
          {/* INGRESOS */}
          <PLSection title="Ingresos" icon={<DollarSign size={13} />}>
            <PLRow
              label="Ventas totales"
              value={totalRevenue}
              sub={`${totalUnits} unidades vendidas`}
              bold
              color="#15803d"
              hint="Suma de todas las ventas registradas en este período"
            />
          </PLSection>

          {/* COSTO DE VENTAS */}
          <PLSection title="Costo de lo vendido" icon={<TrendingUp size={13} />}>
            <PLRow
              label="Costo importación (FOB)"
              value={totalCOGS}
              indent
              color="#dc2626"
              hint="Costo FOB de los productos que vendiste este mes, convertido a CLP con el tipo de cambio actual"
            />
            {totalCommissions > 0 && (
              <PLRow
                label="Comisiones pagadas a PdV"
                value={totalCommissions}
                indent
                color="#dc2626"
                hint="Comisiones calculadas según el % asignado a cada punto de venta"
              />
            )}
            <PLRow
              label="Total costo de ventas"
              value={totalCostOfSales}
              bold
              color="#dc2626"
            />
            <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: 10, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>
                MARGEN BRUTO
                <Tooltip text="Lo que te queda después de descontar lo que te costó importar y las comisiones. Mientras más alto, mejor." />
              </span>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: grossMarginPct > 30 ? '#15803d' : grossMarginPct > 15 ? '#d97706' : '#dc2626' }}>
                  {clp(grossProfit)}
                </span>
                <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 8 }}>({grossMarginPct.toFixed(1)}%)</span>
              </div>
            </div>
            {totalRevenue > 0 && (
              <p style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>
                De cada $100 que vendiste, <strong>${grossMarginPct.toFixed(0)}</strong> fue ganancia bruta.
              </p>
            )}
          </PLSection>

          {/* GASTOS OPERACIONALES */}
          <PLSection title="Gastos operacionales del negocio" icon={<BarChart2 size={13} />}>
            {periodExpenses.length === 0 && !showAddExpense && (
              <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 10 }}>
                Agrega gastos como arriendo de bodega, contador, publicidad, etc.
              </p>
            )}

            {fixedExpenses.length > 0 && (
              <>
                <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Fijos</div>
                {fixedExpenses.map(exp => (
                  <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: 13, color: '#374151', paddingLeft: 20 }}>└ {exp.name}</span>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#dc2626' }}>{clp(exp.amount_CLP)}</span>
                      <button onClick={() => deleteBusinessExpense(exp.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fca5a5', padding: '2px 4px' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {variableExpenses.length > 0 && (
              <>
                <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4, marginTop: 8 }}>Variables</div>
                {variableExpenses.map(exp => (
                  <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: 13, color: '#374151', paddingLeft: 20 }}>└ {exp.name}</span>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#dc2626' }}>{clp(exp.amount_CLP)}</span>
                      <button onClick={() => deleteBusinessExpense(exp.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fca5a5', padding: '2px 4px' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {otherExpenses.length > 0 && (
              <>
                <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4, marginTop: 8 }}>Otros</div>
                {otherExpenses.map(exp => (
                  <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: 13, color: '#374151', paddingLeft: 20 }}>└ {exp.name}</span>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#dc2626' }}>{clp(exp.amount_CLP)}</span>
                      <button onClick={() => deleteBusinessExpense(exp.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fca5a5', padding: '2px 4px' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Add expense form */}
            {showAddExpense ? (
              <form onSubmit={handleAddExpense} style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: '1 1 160px' }}>
                  <label className="label">Nombre del gasto</label>
                  <input className="input" required placeholder="Ej: Arriendo bodega" value={expForm.name} onChange={e => setExpForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div style={{ flex: '0 0 130px' }}>
                  <label className="label">Monto (CLP)</label>
                  <input className="input" type="number" required min="0" placeholder="150000" value={expForm.amount_CLP} onChange={e => setExpForm(f => ({ ...f, amount_CLP: e.target.value }))} />
                </div>
                <div style={{ flex: '0 0 120px' }}>
                  <label className="label">Tipo</label>
                  <select className="input" value={expForm.category} onChange={e => setExpForm(f => ({ ...f, category: e.target.value as typeof expForm.category }))}>
                    <option value="fixed">Fijo</option>
                    <option value="variable">Variable</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" style={{ padding: '9px 14px' }}>Agregar</button>
                <button type="button" className="btn btn-secondary" style={{ padding: '9px 14px' }} onClick={() => setShowAddExpense(false)}>Cancelar</button>
              </form>
            ) : (
              <button
                className="btn btn-secondary"
                style={{ marginTop: 10, padding: '6px 12px', fontSize: 12 }}
                onClick={() => setShowAddExpense(true)}
              >
                <Plus size={13} /> Agregar gasto
              </button>
            )}

            {periodExpenses.length > 0 && (
              <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: 10, marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>Total gastos operacionales</span>
                <span style={{ fontWeight: 700, color: '#dc2626' }}>{clp(totalOpEx)}</span>
              </div>
            )}
          </PLSection>

          {/* EBITDA */}
          <div style={{
            background: ebitda >= 0 ? '#f0fdf4' : '#fef2f2',
            border: `2px solid ${ebitda >= 0 ? '#bbf7d0' : '#fecaca'}`,
            borderRadius: 12, padding: '16px 20px', marginBottom: 12,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>
                  EBITDA
                  <Tooltip text="Ganancias antes de impuestos y amortizaciones. Es la 'rentabilidad real' de operar el negocio." />
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Ganancia antes de impuestos</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: ebitda >= 0 ? '#15803d' : '#dc2626' }}>
                  {clp(ebitda)}
                </div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>{ebitdaPct.toFixed(1)}% del ingreso</div>
              </div>
            </div>
          </div>

          {/* IMPUESTO */}
          <PLSection title="Impuesto estimado" icon={<Percent size={13} />}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: '#374151' }}>Tasa impositiva</span>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={taxPct}
                  onChange={e => setTaxPct(parseFloat(e.target.value) || 0)}
                  style={{ width: 70, padding: '4px 24px 4px 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, fontWeight: 600 }}
                />
                <span style={{ position: 'absolute', right: 8, color: '#6b7280', fontSize: 13 }}>%</span>
              </div>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>(ajusta según tu situación tributaria)</span>
            </div>
            <PLRow label="Impuesto estimado" value={tax} indent color="#dc2626" hint="Solo se calcula si el EBITDA es positivo" />
          </PLSection>

          {/* UTILIDAD NETA */}
          <div style={{
            background: netProfit >= 0 ? '#eff6ff' : '#fef2f2',
            border: `2px solid ${netProfit >= 0 ? '#bfdbfe' : '#fecaca'}`,
            borderRadius: 12, padding: '20px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>
                  UTILIDAD NETA ESTIMADA
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Lo que te queda en el bolsillo este mes</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: netProfit >= 0 ? '#1d4ed8' : '#dc2626' }}>
                  {clp(netProfit)}
                </div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>{netMarginPct.toFixed(1)}% del ingreso</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel: summary table */}
        <div>
          <div className="card" style={{ padding: '16px 20px', position: 'sticky', top: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Resumen — {formatYearMonth(yearMonth)}
            </div>
            {[
              { label: 'Ventas', value: totalRevenue, color: '#15803d' },
              { label: '− Costo importación', value: -totalCOGS, color: '#dc2626' },
              { label: '− Comisiones PdV', value: -totalCommissions, color: '#dc2626' },
              { label: '= Margen bruto', value: grossProfit, color: grossProfit >= 0 ? '#15803d' : '#dc2626', bold: true },
              { label: '− Gastos operac.', value: -totalOpEx, color: '#dc2626' },
              { label: '= EBITDA', value: ebitda, color: ebitda >= 0 ? '#15803d' : '#dc2626', bold: true },
              { label: `− Impuesto (${taxPct}%)`, value: -tax, color: '#dc2626' },
              { label: '= Utilidad neta', value: netProfit, color: netProfit >= 0 ? '#1d4ed8' : '#dc2626', bold: true },
            ].map((row, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 0', borderBottom: '1px solid #f1f5f9',
                borderTop: row.bold ? '1.5px solid #e2e8f0' : 'none',
                marginTop: row.bold ? 4 : 0,
              }}>
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: row.bold ? 700 : 400 }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: row.bold ? 800 : 500, color: row.color ?? '#111827' }}>
                  {clp(Math.abs(row.value))}
                </span>
              </div>
            ))}

            {totalRevenue > 0 && (
              <div style={{ marginTop: 16, padding: '10px 12px', background: '#f8fafc', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Distribución del ingreso</div>
                {[
                  { label: 'Costo importación', pct: totalRevenue > 0 ? totalCOGS / totalRevenue * 100 : 0, color: '#fca5a5' },
                  { label: 'Comisiones', pct: totalRevenue > 0 ? totalCommissions / totalRevenue * 100 : 0, color: '#fcd34d' },
                  { label: 'Gastos operac.', pct: totalRevenue > 0 ? totalOpEx / totalRevenue * 100 : 0, color: '#93c5fd' },
                  { label: 'Impuesto', pct: totalRevenue > 0 ? tax / totalRevenue * 100 : 0, color: '#d8b4fe' },
                  { label: 'Tu ganancia', pct: netMarginPct > 0 ? netMarginPct : 0, color: '#6ee7b7' },
                ].map((bar, i) => (
                  <div key={i} style={{ marginBottom: 5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280', marginBottom: 2 }}>
                      <span>{bar.label}</span>
                      <span>{bar.pct.toFixed(1)}%</span>
                    </div>
                    <div style={{ height: 6, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, bar.pct)}%`, background: bar.color, borderRadius: 4, transition: 'width 0.3s' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
