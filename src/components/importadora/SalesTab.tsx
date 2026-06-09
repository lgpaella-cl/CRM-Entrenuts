import { useState } from 'react'
import { Plus, Minus, ShoppingCart, Trash2, TrendingUp, Clock, CheckCircle, FileDown } from 'lucide-react'
import { useStore } from '../../store'
import { useFmt } from '../../hooks/useExchangeRate'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { downloadCSV } from '../../utils/csvExport'

function today() { return new Date().toISOString().split('T')[0] }

type View = 'quick' | 'history'

export function SalesTab() {
  const { products, stores, stock, sales, addSale, deleteSale } = useStore()
  const { clp, usdToClp } = useFmt()

  const [view, setView] = useState<View>('quick')

  /* ── Quick entry state ─────────────────────────────────────── */
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [saleDate, setSaleDate] = useState(today())
  const [pending, setPending] = useState<Record<string, number>>({})
  const [saved, setSaved] = useState(false)

  /* ── History state ─────────────────────────────────────────── */
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [filterStore, setFilterStore] = useState('all')
  const [filterProduct, setFilterProduct] = useState('all')

  const activeStores = stores.filter(s => s.active)

  /* ── Quick entry helpers ───────────────────────────────────── */

  const storeStock = selectedStoreId
    ? stock.filter(e => e.storeId === selectedStoreId)
    : []

  function incPending(productId: string) {
    const stockEntry = storeStock.find(e => e.productId === productId)
    const maxQty = stockEntry?.quantity ?? 0
    const current = pending[productId] ?? 0
    if (current >= maxQty) return
    setPending(p => ({ ...p, [productId]: current + 1 }))
    setSaved(false)
  }

  function decPending(productId: string) {
    const current = pending[productId] ?? 0
    if (current <= 0) return
    const next = current - 1
    const updated = { ...pending }
    if (next === 0) delete updated[productId]
    else updated[productId] = next
    setPending(updated)
    setSaved(false)
  }

  const pendingTotal = Object.values(pending).reduce((a, b) => a + b, 0)
  const pendingRevenue = storeStock.reduce((acc, entry) => {
    const qty = pending[entry.productId] ?? 0
    return acc + qty * entry.salePrice_CLP
  }, 0)
  const pendingCost = storeStock.reduce((acc, entry) => {
    const prod = products.find(p => p.id === entry.productId)
    const qty = pending[entry.productId] ?? 0
    return acc + qty * usdToClp(prod?.costFOB_USD ?? 0)
  }, 0)
  const selectedStore = stores.find(s => s.id === selectedStoreId)
  const pendingCommission = pendingRevenue * ((selectedStore?.commissionPct ?? 0) / 100)
  const pendingMargin = pendingRevenue - pendingCost - pendingCommission
  const pendingMarginPct = pendingRevenue > 0 ? (pendingMargin / pendingRevenue) * 100 : 0

  function registerSales() {
    if (pendingTotal === 0) return
    for (const [productId, qty] of Object.entries(pending)) {
      if (qty <= 0) continue
      const entry = storeStock.find(e => e.productId === productId)
      addSale({
        productId,
        storeId: selectedStoreId,
        quantity: qty,
        salePrice_CLP: entry?.salePrice_CLP ?? 0,
        date: saleDate,
        notes: '',
      })
    }
    setPending({})
    setSaved(true)
  }

  /* ── History helpers ───────────────────────────────────────── */

  const filtered = sales
    .filter(s => filterStore === 'all' || s.storeId === filterStore)
    .filter(s => filterProduct === 'all' || s.productId === filterProduct)
    .sort((a, b) => b.date.localeCompare(a.date))

  const totalRevenue = filtered.reduce((sum, s) => sum + s.quantity * s.salePrice_CLP, 0)
  const totalUnits = filtered.reduce((sum, s) => sum + s.quantity, 0)

  function getSaleMargin(sale: typeof sales[0]) {
    const prod = products.find(p => p.id === sale.productId)
    if (!prod || !sale.salePrice_CLP) return null
    const cost = usdToClp(prod.costFOB_USD)
    return ((sale.salePrice_CLP - cost) / sale.salePrice_CLP) * 100
  }

  function exportSalesCSV() {
    const headers = ['Fecha', 'Producto', 'SKU', 'Punto de Venta', 'Cantidad', 'Precio Unitario', 'Total', 'Margen%']
    const rows = filtered.map(sale => {
      const prod = products.find(p => p.id === sale.productId)
      const store = stores.find(s => s.id === sale.storeId)
      const margin = getSaleMargin(sale)
      return [
        new Date(sale.date + 'T12:00:00').toLocaleDateString('es-CL'),
        prod?.name ?? '—',
        prod?.sku ?? '—',
        store?.name ?? '—',
        sale.quantity,
        sale.salePrice_CLP,
        sale.quantity * sale.salePrice_CLP,
        margin !== null ? margin.toFixed(1) : '—',
      ] as (string | number)[]
    })
    downloadCSV(`ventas-${new Date().toISOString().split('T')[0]}.csv`, headers, rows)
  }

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Ventas</h2>
          <p className="text-sm text-gray-500 mt-0.5">{sales.length} ventas registradas</p>
        </div>
        {/* View toggle */}
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 10, padding: 3, gap: 2 }}>
          <button
            onClick={() => setView('quick')}
            style={{
              padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
              background: view === 'quick' ? 'white' : 'transparent',
              color: view === 'quick' ? '#1d4ed8' : '#64748b',
              boxShadow: view === 'quick' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            <ShoppingCart size={14} /> Registro rápido
          </button>
          <button
            onClick={() => setView('history')}
            style={{
              padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
              background: view === 'history' ? 'white' : 'transparent',
              color: view === 'history' ? '#1d4ed8' : '#64748b',
              boxShadow: view === 'history' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            <Clock size={14} /> Historial
          </button>
        </div>
      </div>

      {/* ══ REGISTRO RÁPIDO ══════════════════════════════════════ */}
      {view === 'quick' && (
        <div>
          {/* Store + Date */}
          <div className="card" style={{ padding: 16, marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 220px' }}>
              <label className="label">Punto de Venta</label>
              <select
                className="input"
                value={selectedStoreId}
                onChange={e => { setSelectedStoreId(e.target.value); setPending({}); setSaved(false) }}
              >
                <option value="">Seleccionar punto de venta…</option>
                {activeStores.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}{(s.commissionPct ?? 0) > 0 ? ` (${s.commissionPct}% comisión)` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: '0 0 160px' }}>
              <label className="label">Fecha</label>
              <input className="input" type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} />
            </div>
            {pendingTotal > 0 && (
              <button className="btn btn-secondary" style={{ padding: '9px 14px' }} onClick={() => { setPending({}); setSaved(false) }}>
                Limpiar
              </button>
            )}
          </div>

          {/* No store selected */}
          {!selectedStoreId && (
            <div className="card flex flex-col items-center justify-center py-16 text-gray-400">
              <ShoppingCart size={40} className="mb-3 opacity-30" />
              <p className="font-medium">Selecciona un punto de venta</p>
              <p className="text-sm">para ver sus productos y registrar ventas</p>
            </div>
          )}

          {/* No products in store */}
          {selectedStoreId && storeStock.length === 0 && (
            <div className="card flex flex-col items-center justify-center py-16 text-gray-400">
              <p className="font-medium">Sin productos asignados a este PdV</p>
              <p className="text-sm">Ve a Puntos de Venta → expande → Agregar producto</p>
            </div>
          )}

          {/* Product grid */}
          {selectedStoreId && storeStock.length > 0 && (
            <>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th style={{ textAlign: 'center' }}>Stock disp.</th>
                      <th style={{ textAlign: 'right' }}>P. venta</th>
                      <th style={{ textAlign: 'center' }}>Vendido hoy</th>
                      <th style={{ textAlign: 'center', width: 110 }}>Acción</th>
                      <th style={{ textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {storeStock.map(entry => {
                      const prod = products.find(p => p.id === entry.productId)
                      const qty = pending[entry.productId] ?? 0
                      const subtotal = qty * entry.salePrice_CLP
                      const isOut = entry.quantity === 0
                      const isLow = !isOut && entry.quantity <= entry.minStock

                      return (
                        <tr key={entry.id} style={qty > 0 ? { background: '#f0fdf4' } : undefined}>
                          <td>
                            <span style={{ fontWeight: 500 }}>{prod?.name ?? '—'}</span>
                            <br />
                            <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{prod?.sku}</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {isOut
                              ? <span className="badge badge-red">Agotado</span>
                              : isLow
                                ? <span className="badge badge-yellow">{entry.quantity}</span>
                                : <span style={{ fontWeight: 600 }}>{entry.quantity}</span>
                            }
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 500 }}>
                            {entry.salePrice_CLP > 0 ? clp(entry.salePrice_CLP) : <span style={{ color: '#d1d5db' }}>—</span>}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {qty > 0
                              ? <span style={{ background: '#dcfce7', color: '#15803d', borderRadius: 6, padding: '2px 12px', fontWeight: 700, fontSize: 15 }}>{qty}</span>
                              : <span style={{ color: '#d1d5db' }}>—</span>
                            }
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                              <button
                                onClick={() => decPending(entry.productId)}
                                disabled={qty === 0}
                                style={{
                                  width: 32, height: 32, borderRadius: 8,
                                  border: '1.5px solid #e2e8f0',
                                  background: qty > 0 ? '#fee2e2' : '#f8fafc',
                                  color: qty > 0 ? '#dc2626' : '#cbd5e1',
                                  cursor: qty > 0 ? 'pointer' : 'not-allowed',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  transition: 'all 0.1s',
                                }}
                              >
                                <Minus size={14} />
                              </button>
                              <button
                                onClick={() => incPending(entry.productId)}
                                disabled={isOut || qty >= entry.quantity}
                                style={{
                                  width: 32, height: 32, borderRadius: 8,
                                  border: '1.5px solid #e2e8f0',
                                  background: isOut || qty >= entry.quantity ? '#f8fafc' : '#dcfce7',
                                  color: isOut || qty >= entry.quantity ? '#cbd5e1' : '#15803d',
                                  cursor: isOut || qty >= entry.quantity ? 'not-allowed' : 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  transition: 'all 0.1s',
                                }}
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: qty > 0 ? 700 : 400, color: qty > 0 ? '#15803d' : '#d1d5db' }}>
                            {qty > 0 ? clp(subtotal) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary + confirm */}
              <div className="card" style={{ padding: '16px 20px', marginTop: 12, background: pendingTotal > 0 ? '#f0fdf4' : 'white', borderColor: pendingTotal > 0 ? '#bbf7d0' : undefined }}>
                {pendingTotal === 0 ? (
                  <p style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center' }}>
                    Usa los botones <strong>+</strong> para agregar unidades vendidas. Luego confirma todo de una vez.
                  </p>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: 24, flex: 1, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unidades</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#111827' }}>{pendingTotal}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total venta</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#15803d' }}>{clp(pendingRevenue)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Costo FOB</div>
                        <div style={{ fontSize: 17, fontWeight: 700, color: '#dc2626' }}>{clp(pendingCost)}</div>
                      </div>
                      {pendingCommission > 0 && (
                        <div>
                          <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Comisión PdV</div>
                          <div style={{ fontSize: 17, fontWeight: 700, color: '#d97706' }}>{clp(pendingCommission)}</div>
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tu ganancia</div>
                        <div style={{ fontSize: 17, fontWeight: 700, color: pendingMarginPct > 20 ? '#15803d' : '#d97706' }}>
                          {clp(pendingMargin)} <span style={{ fontSize: 13 }}>({pendingMarginPct.toFixed(1)}%)</span>
                        </div>
                      </div>
                    </div>
                    <button className="btn btn-success" style={{ padding: '11px 28px', fontSize: 14, flexShrink: 0 }} onClick={registerSales}>
                      <CheckCircle size={16} /> Registrar ventas
                    </button>
                  </div>
                )}
              </div>

              {saved && (
                <div style={{ marginTop: 10, background: '#dcfce7', color: '#15803d', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={16} /> ¡Ventas registradas! El stock se actualizó automáticamente.
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══ HISTORIAL ════════════════════════════════════════════ */}
      {view === 'history' && (
        <div>
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="stat-card">
              <div className="stat-label">Ingresos (filtro)</div>
              <div className="stat-value text-green-600">{clp(totalRevenue)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Unidades vendidas</div>
              <div className="stat-value">{totalUnits}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Nº de ventas</div>
              <div className="stat-value">{filtered.length}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <select className="input" style={{ maxWidth: 220 }} value={filterStore} onChange={e => setFilterStore(e.target.value)}>
              <option value="all">Todos los PdV</option>
              {activeStores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select className="input" style={{ maxWidth: 220 }} value={filterProduct} onChange={e => setFilterProduct(e.target.value)}>
              <option value="all">Todos los productos</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {filtered.length > 0 && (
              <button className="btn btn-secondary" style={{ marginLeft: 'auto' }} onClick={exportSalesCSV}>
                <FileDown size={14} /> Exportar CSV
              </button>
            )}
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <TrendingUp size={40} className="mb-3 opacity-30" />
                <p className="font-medium">Sin ventas registradas</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Producto</th>
                    <th>PdV</th>
                    <th style={{ textAlign: 'center' }}>Cant.</th>
                    <th style={{ textAlign: 'right' }}>Precio unit.</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th style={{ textAlign: 'right' }}>Margen</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(sale => {
                    const prod = products.find(p => p.id === sale.productId)
                    const store = stores.find(s => s.id === sale.storeId)
                    const margin = getSaleMargin(sale)
                    return (
                      <tr key={sale.id}>
                        <td>{new Date(sale.date + 'T12:00:00').toLocaleDateString('es-CL')}</td>
                        <td>
                          <span style={{ fontWeight: 500 }}>{prod?.name ?? '—'}</span>
                          <br />
                          <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{prod?.sku}</span>
                        </td>
                        <td>{store?.name ?? '—'}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{sale.quantity}</td>
                        <td style={{ textAlign: 'right' }}>{clp(sale.salePrice_CLP)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#15803d' }}>{clp(sale.quantity * sale.salePrice_CLP)}</td>
                        <td style={{ textAlign: 'right' }}>
                          {margin !== null
                            ? <span style={{ fontWeight: 600, color: margin > 30 ? '#16a34a' : margin > 15 ? '#d97706' : '#dc2626' }}>
                              {margin.toFixed(1)}%
                            </span>
                            : '—'
                          }
                        </td>
                        <td>
                          <button className="btn btn-danger" style={{ padding: '5px 8px' }} onClick={() => setConfirmId(sale.id)}>
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {confirmId && (
        <ConfirmDialog
          message="¿Eliminar este registro de venta? El stock no se revertirá automáticamente."
          onConfirm={() => { deleteSale(confirmId!); setConfirmId(null) }}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}
