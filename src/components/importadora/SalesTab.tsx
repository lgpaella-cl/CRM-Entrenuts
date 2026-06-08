import { useState } from 'react'
import { Plus, Trash2, TrendingUp } from 'lucide-react'
import { useStore } from '../../store'
import { useFmt } from '../../hooks/useExchangeRate'
import { Modal } from '../shared/Modal'
import { ConfirmDialog } from '../shared/ConfirmDialog'

function today() { return new Date().toISOString().split('T')[0] }

export function SalesTab() {
  const { products, stores, stock, sales, addSale, deleteSale } = useStore()
  const { clp, usdToClp } = useFmt()
  const [showForm, setShowForm] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [form, setForm] = useState({ productId: '', storeId: '', quantity: '1', salePrice_CLP: '', date: today(), notes: '' })
  const [filterStore, setFilterStore] = useState('all')
  const [filterProduct, setFilterProduct] = useState('all')

  const activeStores = stores.filter(s => s.active)

  function getStockQty(productId: string, storeId: string) {
    return stock.find(e => e.productId === productId && e.storeId === storeId)?.quantity ?? 0
  }

  function getDefaultPrice(productId: string, storeId: string) {
    return stock.find(e => e.productId === productId && e.storeId === storeId)?.salePrice_CLP ?? 0
  }

  function handleProductChange(productId: string) {
    const price = form.storeId ? getDefaultPrice(productId, form.storeId) : 0
    setForm(f => ({ ...f, productId, salePrice_CLP: String(price || '') }))
  }

  function handleStoreChange(storeId: string) {
    const price = form.productId ? getDefaultPrice(form.productId, storeId) : 0
    setForm(f => ({ ...f, storeId, salePrice_CLP: String(price || '') }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    addSale({
      productId: form.productId,
      storeId: form.storeId,
      quantity: parseInt(form.quantity) || 1,
      salePrice_CLP: parseFloat(form.salePrice_CLP) || 0,
      date: form.date,
      notes: form.notes,
    })
    setShowForm(false)
    setForm({ productId: '', storeId: '', quantity: '1', salePrice_CLP: '', date: today(), notes: '' })
  }

  const filtered = sales
    .filter(s => filterStore === 'all' || s.storeId === filterStore)
    .filter(s => filterProduct === 'all' || s.productId === filterProduct)
    .sort((a, b) => b.date.localeCompare(a.date))

  const totalRevenue = filtered.reduce((sum, s) => sum + s.quantity * s.salePrice_CLP, 0)
  const totalUnits = filtered.reduce((sum, s) => sum + s.quantity, 0)

  function getMargin(sale: typeof sales[0]) {
    const prod = products.find(p => p.id === sale.productId)
    if (!prod || !sale.salePrice_CLP) return null
    const cost = usdToClp(prod.costFOB_USD)
    return ((sale.salePrice_CLP - cost) / sale.salePrice_CLP) * 100
  }

  const selectedStock = form.productId && form.storeId ? getStockQty(form.productId, form.storeId) : null

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Registro de Ventas</h2>
          <p className="text-sm text-gray-500 mt-0.5">{sales.length} ventas registradas</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={16} /> Nueva Venta</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <div className="stat-label">Ingresos (filtro actual)</div>
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

      {/* Filtros */}
      <div className="flex gap-3 mb-4">
        <select className="input" style={{ maxWidth: 200 }} value={filterStore} onChange={e => setFilterStore(e.target.value)}>
          <option value="all">Todas las tiendas</option>
          {activeStores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="input" style={{ maxWidth: 220 }} value={filterProduct} onChange={e => setFilterProduct(e.target.value)}>
          <option value="all">Todos los productos</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Tabla */}
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
                <th>Tienda</th>
                <th style={{ textAlign: 'center' }}>Cant.</th>
                <th style={{ textAlign: 'right' }}>Precio unit.</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ textAlign: 'right' }}>Margen</th>
                <th>Notas</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(sale => {
                const prod = products.find(p => p.id === sale.productId)
                const store = stores.find(s => s.id === sale.storeId)
                const margin = getMargin(sale)
                return (
                  <tr key={sale.id}>
                    <td>{new Date(sale.date + 'T12:00:00').toLocaleDateString('es-CL')}</td>
                    <td><span className="font-medium">{prod?.name ?? '—'}</span><br /><span className="text-xs text-gray-400 font-mono">{prod?.sku}</span></td>
                    <td>{store?.name ?? '—'}</td>
                    <td style={{ textAlign: 'center' }} className="font-bold">{sale.quantity}</td>
                    <td style={{ textAlign: 'right' }}>{clp(sale.salePrice_CLP)}</td>
                    <td style={{ textAlign: 'right' }} className="font-bold text-green-700">{clp(sale.quantity * sale.salePrice_CLP)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {margin !== null ? <span className={margin > 30 ? 'text-green-600 font-semibold' : margin > 15 ? 'text-yellow-600 font-semibold' : 'text-red-600 font-semibold'}>{margin.toFixed(1)}%</span> : '—'}
                    </td>
                    <td className="text-gray-400 text-xs">{sale.notes || '—'}</td>
                    <td><button className="btn btn-danger" style={{ padding: '5px 8px' }} onClick={() => setConfirmId(sale.id)}><Trash2 size={13} /></button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <Modal title="Registrar Venta" onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="label">Producto *</label>
              <select className="input" required value={form.productId} onChange={e => handleProductChange(e.target.value)}>
                <option value="">Seleccionar producto…</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Tienda *</label>
              <select className="input" required value={form.storeId} onChange={e => handleStoreChange(e.target.value)}>
                <option value="">Seleccionar tienda…</option>
                {activeStores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            {selectedStock !== null && (
              <div className={`text-sm rounded-lg px-3 py-2 ${selectedStock > 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
                Stock disponible en esta tienda: <strong>{selectedStock} unidades</strong>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Cantidad *</label>
                <input className="input" type="number" min="1" required value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div>
                <label className="label">Precio unitario (CLP) *</label>
                <input className="input" type="number" min="0" required value={form.salePrice_CLP} onChange={e => setForm(f => ({ ...f, salePrice_CLP: e.target.value }))} placeholder="0" />
              </div>
            </div>
            {form.salePrice_CLP && form.quantity && (
              <div className="bg-green-50 text-green-700 rounded-lg px-3 py-2 text-sm">
                Total venta: <strong>{clp((parseFloat(form.salePrice_CLP) || 0) * (parseInt(form.quantity) || 0))}</strong>
              </div>
            )}
            <div>
              <label className="label">Fecha *</label>
              <input className="input" type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Notas (opcional)</label>
              <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ej: Venta por volumen, descuento aplicado…" />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Registrar venta</button>
            </div>
          </form>
        </Modal>
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
