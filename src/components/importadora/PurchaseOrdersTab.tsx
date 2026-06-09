import { useState } from 'react'
import { Plus, ClipboardList, Truck, CheckCircle, Trash2 } from 'lucide-react'
import { useStore } from '../../store'
import { useFmt } from '../../hooks/useExchangeRate'
import { Modal } from '../shared/Modal'
import type { PurchaseOrder } from '../../types'

const STATUS_LABELS: Record<PurchaseOrder['status'], string> = {
  pending: 'Pendiente',
  in_transit: 'En tránsito',
  received: 'Recibida',
}
const STATUS_COLORS: Record<PurchaseOrder['status'], string> = {
  pending: 'badge-yellow',
  in_transit: 'badge-blue',
  received: 'badge-green',
}

function today() { return new Date().toISOString().split('T')[0] }

export function PurchaseOrdersTab() {
  const { products, stores, orders, addOrder, updateOrder, deleteOrder, receiveStock } = useStore()
  const { clp, usd, usdToClp } = useFmt()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    productId: '',
    quantity: '',
    costFOB_USD: '',
    estimatedArrival: '',
    notes: '',
  })

  // Receive dialog
  const [receivingId, setReceivingId] = useState<string | null>(null)
  const [receiveStoreId, setReceiveStoreId] = useState('')

  const activeStores = stores.filter(s => s.active)

  function openForm() {
    setForm({ productId: products[0]?.id ?? '', quantity: '', costFOB_USD: products[0] ? String(products[0].costFOB_USD) : '', estimatedArrival: '', notes: '' })
    setShowForm(true)
  }

  function handleProductChange(productId: string) {
    const prod = products.find(p => p.id === productId)
    setForm(f => ({ ...f, productId, costFOB_USD: prod ? String(prod.costFOB_USD) : '' }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const qty = parseInt(form.quantity) || 0
    const fob = parseFloat(form.costFOB_USD) || 0
    addOrder({
      productId: form.productId,
      quantity: qty,
      costFOB_USD: fob,
      costTotal_USD: qty * fob,
      status: 'pending',
      orderDate: today(),
      estimatedArrival: form.estimatedArrival || undefined,
      notes: form.notes || undefined,
    })
    setShowForm(false)
  }

  function markInTransit(id: string) {
    updateOrder(id, { status: 'in_transit' })
  }

  function openReceive(id: string) {
    setReceivingId(id)
    setReceiveStoreId(activeStores[0]?.id ?? '')
  }

  function confirmReceive() {
    if (!receivingId || !receiveStoreId) return
    const order = orders.find(o => o.id === receivingId)
    if (!order) return
    updateOrder(receivingId, { status: 'received' })
    receiveStock(order.productId, receiveStoreId, order.quantity)
    setReceivingId(null)
    setReceiveStoreId('')
  }

  const grouped: Record<PurchaseOrder['status'], PurchaseOrder[]> = {
    pending: orders.filter(o => o.status === 'pending'),
    in_transit: orders.filter(o => o.status === 'in_transit'),
    received: orders.filter(o => o.status === 'received'),
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Órdenes de Compra</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{orders.length} órdenes en total</p>
        </div>
        <button className="btn btn-primary" onClick={openForm}><Plus size={16} /> Nueva orden</button>
      </div>

      {orders.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
          <ClipboardList size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ fontWeight: 500 }}>Sin órdenes de compra</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Crea una orden para rastrear tus importaciones</p>
        </div>
      )}

      {(['pending', 'in_transit', 'received'] as PurchaseOrder['status'][]).map(status => {
        const group = grouped[status]
        if (group.length === 0) return null
        return (
          <div key={status} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              {status === 'pending' && <ClipboardList size={16} color="#a16207" />}
              {status === 'in_transit' && <Truck size={16} color="#1d4ed8" />}
              {status === 'received' && <CheckCircle size={16} color="#15803d" />}
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-1)' }}>{STATUS_LABELS[status]}</span>
              <span className={`badge ${STATUS_COLORS[status]}`}>{group.length}</span>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th style={{ textAlign: 'center' }}>Cant.</th>
                    <th style={{ textAlign: 'right' }}>Costo FOB</th>
                    <th style={{ textAlign: 'right' }}>Total USD</th>
                    <th style={{ textAlign: 'right' }}>Total CLP</th>
                    <th>Fecha orden</th>
                    <th>Llegada est.</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {group.map(order => {
                    const prod = products.find(p => p.id === order.productId)
                    return (
                      <tr key={order.id}>
                        <td>
                          <span style={{ fontWeight: 500, color: 'var(--text-1)' }}>{prod?.name ?? '—'}</span>
                          {order.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{order.notes}</div>}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{order.quantity}</td>
                        <td style={{ textAlign: 'right' }}>{usd(order.costFOB_USD)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{usd(order.costTotal_USD)}</td>
                        <td style={{ textAlign: 'right', color: '#1d4ed8', fontWeight: 600 }}>{clp(usdToClp(order.costTotal_USD))}</td>
                        <td style={{ fontSize: 12 }}>{new Date(order.orderDate + 'T12:00:00').toLocaleDateString('es-CL')}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {order.estimatedArrival ? new Date(order.estimatedArrival + 'T12:00:00').toLocaleDateString('es-CL') : '—'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            {status === 'pending' && (
                              <button className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => markInTransit(order.id)}>
                                <Truck size={12} /> En tránsito
                              </button>
                            )}
                            {(status === 'pending' || status === 'in_transit') && (
                              <button className="btn btn-success" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => openReceive(order.id)}>
                                <CheckCircle size={12} /> Recibida
                              </button>
                            )}
                            <button className="btn btn-danger" style={{ padding: '5px 8px' }} onClick={() => deleteOrder(order.id)}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      {/* New order form */}
      {showForm && (
        <Modal title="Nueva Orden de Compra" onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="label">Producto *</label>
              <select className="input" required value={form.productId} onChange={e => handleProductChange(e.target.value)}>
                <option value="">Seleccionar...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="label">Cantidad *</label>
                <input className="input" type="number" min="1" required placeholder="100" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div>
                <label className="label">Costo FOB por unidad (USD) *</label>
                <input className="input" type="number" step="0.01" min="0" required placeholder="0.00" value={form.costFOB_USD} onChange={e => setForm(f => ({ ...f, costFOB_USD: e.target.value }))} />
              </div>
            </div>
            {form.quantity && form.costFOB_USD && (
              <div style={{ background: '#eff6ff', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#1d4ed8', fontWeight: 500 }}>
                Total estimado: {usd((parseInt(form.quantity) || 0) * (parseFloat(form.costFOB_USD) || 0))}
                {' '}≈ {clp(usdToClp((parseInt(form.quantity) || 0) * (parseFloat(form.costFOB_USD) || 0)))}
              </div>
            )}
            <div>
              <label className="label">Llegada estimada</label>
              <input className="input" type="date" value={form.estimatedArrival} onChange={e => setForm(f => ({ ...f, estimatedArrival: e.target.value }))} />
            </div>
            <div>
              <label className="label">Notas</label>
              <input className="input" placeholder="Ej: Proveedor X, flete marítimo..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Crear orden</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Receive dialog */}
      {receivingId && (
        <Modal title="Recibir Orden" onClose={() => setReceivingId(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
              ¿A qué punto de venta enviamos el stock recibido?
            </p>
            {activeStores.length === 0 ? (
              <div style={{ background: '#fef9c3', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#92400e' }}>
                No hay puntos de venta activos. Crea uno primero.
              </div>
            ) : (
              <div>
                <label className="label">Punto de Venta *</label>
                <select className="input" value={receiveStoreId} onChange={e => setReceiveStoreId(e.target.value)}>
                  {activeStores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setReceivingId(null)}>Cancelar</button>
              <button className="btn btn-success" onClick={confirmReceive} disabled={!receiveStoreId}>
                <CheckCircle size={14} /> Confirmar recepción
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
