import { useStore } from '../../store'
import { useFmt } from '../../hooks/useExchangeRate'
import { ShoppingCart, AlertTriangle, CheckCircle } from 'lucide-react'

interface ProjectionRow {
  productId: string
  storeId: string
  productName: string
  sku: string
  storeName: string
  currentStock: number
  minStock: number
  dailyVelocity: number
  daysLeft: number | null
  suggestedOrderQty: number
  urgency: 'critical' | 'warning' | 'ok'
  costPerUnit_USD: number
  orderCost_USD: number
}

const LEAD_TIME_DAYS = 45 // días promedio de importación

export function ProjectionTab() {
  const { products, stores, stock, sales, orders } = useStore()
  const { clp, usd, usdToClp } = useFmt()

  function getDailyVelocity(productId: string, storeId: string): number {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 60)
    const total = sales
      .filter(s => s.productId === productId && s.storeId === storeId && new Date(s.date) >= cutoff)
      .reduce((sum, s) => sum + s.quantity, 0)
    return total / 60
  }

  const rows: ProjectionRow[] = []

  for (const prod of products) {
    for (const store of stores.filter(s => s.active)) {
      const stockEntry = stock.find(e => e.productId === prod.id && e.storeId === store.id)
      const currentStock = stockEntry?.quantity ?? 0
      const minStock = stockEntry?.minStock ?? 5
      const velocity = getDailyVelocity(prod.id, store.id)
      const daysLeft = velocity > 0 ? Math.round(currentStock / velocity) : null

      // Solo mostrar si hay movimiento o stock bajo
      if (velocity === 0 && currentStock > minStock) continue

      // Cantidad sugerida: cubrir LEAD_TIME + 30 días de buffer
      const daysToOrder = LEAD_TIME_DAYS + 30
      const needed = Math.ceil(velocity * daysToOrder)
      const suggestedOrderQty = Math.max(needed - currentStock, 0)

      let urgency: 'critical' | 'warning' | 'ok' = 'ok'
      if (currentStock === 0 || (daysLeft !== null && daysLeft < 7)) urgency = 'critical'
      else if (currentStock <= minStock || (daysLeft !== null && daysLeft < LEAD_TIME_DAYS)) urgency = 'warning'

      rows.push({
        productId: prod.id,
        storeId: store.id,
        productName: prod.name,
        sku: prod.sku,
        storeName: store.name,
        currentStock,
        minStock,
        dailyVelocity: velocity,
        daysLeft,
        suggestedOrderQty,
        urgency,
        costPerUnit_USD: prod.costFOB_USD,
        orderCost_USD: prod.costFOB_USD * suggestedOrderQty,
      })
    }
  }

  rows.sort((a, b) => {
    const order = { critical: 0, warning: 1, ok: 2 }
    return order[a.urgency] - order[b.urgency]
  })

  const totalOrderCost_USD = rows.filter(r => r.suggestedOrderQty > 0).reduce((sum, r) => sum + r.orderCost_USD, 0)
  const criticalCount = rows.filter(r => r.urgency === 'critical').length
  const warningCount = rows.filter(r => r.urgency === 'warning').length

  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'in_transit')

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Proyección de Stock & Pedidos</h2>
        <p className="text-sm text-gray-500 mt-0.5">Lead time estimado: {LEAD_TIME_DAYS} días · Basado en ventas de los últimos 60 días</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="stat-card border-red-100" style={{ borderColor: '#fecaca' }}>
          <div className="stat-label text-red-500">Críticos</div>
          <div className="stat-value text-red-600">{criticalCount}</div>
          <div className="text-xs text-gray-400">productos/tiendas</div>
        </div>
        <div className="stat-card border-yellow-100" style={{ borderColor: '#fde68a' }}>
          <div className="stat-label text-yellow-600">Advertencia</div>
          <div className="stat-value text-yellow-600">{warningCount}</div>
          <div className="text-xs text-gray-400">productos/tiendas</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Costo pedido sugerido</div>
          <div className="stat-value text-blue-600">{usd(totalOrderCost_USD)}</div>
          <div className="text-xs text-gray-400">{clp(usdToClp(totalOrderCost_USD))}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Órdenes en tránsito</div>
          <div className="stat-value">{pendingOrders.length}</div>
          <div className="text-xs text-gray-400">pedidos activos</div>
        </div>
      </div>

      {/* Tabla proyección */}
      {rows.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <CheckCircle size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Sin alertas de stock</p>
          <p className="text-sm">Registra ventas para generar proyecciones automáticas</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>Urgencia</th>
                <th>SKU</th>
                <th>Producto</th>
                <th>Tienda</th>
                <th style={{ textAlign: 'center' }}>Stock actual</th>
                <th style={{ textAlign: 'center' }}>Días restantes</th>
                <th style={{ textAlign: 'center' }}>Vel. diaria</th>
                <th style={{ textAlign: 'center' }}>Pedir</th>
                <th style={{ textAlign: 'right' }}>Costo orden (USD)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={`${row.productId}-${row.storeId}`}>
                  <td>
                    {row.urgency === 'critical' && <span className="badge badge-red flex items-center gap-1"><AlertTriangle size={10} />Crítico</span>}
                    {row.urgency === 'warning' && <span className="badge badge-yellow flex items-center gap-1"><AlertTriangle size={10} />Advertencia</span>}
                    {row.urgency === 'ok' && <span className="badge badge-green">OK</span>}
                  </td>
                  <td><span className="font-mono text-xs badge badge-blue">{row.sku}</span></td>
                  <td className="font-medium">{row.productName}</td>
                  <td className="text-gray-500">{row.storeName}</td>
                  <td style={{ textAlign: 'center' }} className="font-bold">{row.currentStock}</td>
                  <td style={{ textAlign: 'center' }}>
                    {row.daysLeft !== null
                      ? <span className={row.daysLeft < 7 ? 'text-red-600 font-bold' : row.daysLeft < LEAD_TIME_DAYS ? 'text-yellow-600 font-semibold' : 'text-green-600'}>{row.daysLeft}d</span>
                      : <span className="text-gray-300">sin ventas</span>
                    }
                  </td>
                  <td style={{ textAlign: 'center' }} className="text-gray-500">{row.dailyVelocity > 0 ? row.dailyVelocity.toFixed(2) : '—'}</td>
                  <td style={{ textAlign: 'center' }}>
                    {row.suggestedOrderQty > 0 ? <span className="font-bold text-blue-700">{row.suggestedOrderQty}</span> : <CheckCircle size={16} className="text-green-400 mx-auto" />}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {row.suggestedOrderQty > 0 ? <span className="font-semibold">{usd(row.orderCost_USD)}</span> : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Órdenes activas */}
      {pendingOrders.length > 0 && (
        <div className="mt-8">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><ShoppingCart size={16} /> Órdenes de compra activas</h3>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th style={{ textAlign: 'center' }}>Cantidad</th>
                  <th style={{ textAlign: 'right' }}>Costo FOB total</th>
                  <th>Estado</th>
                  <th>Fecha pedido</th>
                  <th>Llegada estimada</th>
                </tr>
              </thead>
              <tbody>
                {pendingOrders.map(order => {
                  const prod = products.find(p => p.id === order.productId)
                  return (
                    <tr key={order.id}>
                      <td className="font-medium">{prod?.name ?? '—'}</td>
                      <td style={{ textAlign: 'center' }}>{order.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{usd(order.costTotal_USD)}</td>
                      <td><span className={`badge ${order.status === 'in_transit' ? 'badge-blue' : 'badge-yellow'}`}>{order.status === 'in_transit' ? 'En tránsito' : 'Pendiente'}</span></td>
                      <td>{new Date(order.orderDate + 'T12:00:00').toLocaleDateString('es-CL')}</td>
                      <td>{order.estimatedArrival ? new Date(order.estimatedArrival + 'T12:00:00').toLocaleDateString('es-CL') : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
