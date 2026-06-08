import { useState } from 'react'
import { Save, AlertTriangle } from 'lucide-react'
import { useStore } from '../../store'
import { useFmt } from '../../hooks/useExchangeRate'

export function InventoryTab() {
  const { products, stores, stock, setStock, sales } = useStore()
  const { clp, usd, usdToClp } = useFmt()
  const [selectedStore, setSelectedStore] = useState<string>('all')
  const [editing, setEditing] = useState<Record<string, { qty: string; min: string; price: string }>>({})

  const activeStores = stores.filter(s => s.active)

  function getStock(productId: string, storeId: string) {
    return stock.find(e => e.productId === productId && e.storeId === storeId)
  }

  function startEdit(productId: string, storeId: string) {
    const s = getStock(productId, storeId)
    const key = `${productId}-${storeId}`
    setEditing(prev => ({
      ...prev,
      [key]: { qty: String(s?.quantity ?? 0), min: String(s?.minStock ?? 5), price: String(s?.salePrice_CLP ?? 0) }
    }))
  }

  function saveEdit(productId: string, storeId: string) {
    const key = `${productId}-${storeId}`
    const e = editing[key]
    if (!e) return
    setStock(productId, storeId, {
      quantity: parseInt(e.qty) || 0,
      minStock: parseInt(e.min) || 5,
      salePrice_CLP: parseFloat(e.price) || 0,
    })
    setEditing(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  function getSalesVelocity(productId: string, storeId: string): number {
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const total = sales
      .filter(s => s.productId === productId && s.storeId === storeId && new Date(s.date) >= thirtyDaysAgo)
      .reduce((sum, s) => sum + s.quantity, 0)
    return total / 30
  }

  const displayStores = selectedStore === 'all' ? activeStores : activeStores.filter(s => s.id === selectedStore)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Inventario por Tienda</h2>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de stock, precios y alertas</p>
        </div>
        <select className="input" style={{ width: 220 }} value={selectedStore} onChange={e => setSelectedStore(e.target.value)}>
          <option value="all">Todas las tiendas</option>
          {activeStores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {products.length === 0 || activeStores.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <p>Primero agrega productos y tiendas para gestionar el inventario.</p>
        </div>
      ) : (
        displayStores.map(store => (
          <div key={store.id} className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <h3 className="font-semibold text-gray-800">{store.name}</h3>
              <span className="text-xs text-gray-400">{store.city}</span>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Producto</th>
                    <th style={{ textAlign: 'right' }}>Costo FOB</th>
                    <th style={{ textAlign: 'center' }}>Stock</th>
                    <th style={{ textAlign: 'center' }}>Stock mín.</th>
                    <th style={{ textAlign: 'right' }}>Precio venta</th>
                    <th style={{ textAlign: 'right' }}>Margen</th>
                    <th style={{ textAlign: 'center' }}>Días stock</th>
                    <th style={{ textAlign: 'center' }}>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(prod => {
                    const key = `${prod.id}-${store.id}`
                    const s = getStock(prod.id, store.id)
                    const isEditing = !!editing[key]
                    const ed = editing[key]
                    const qty = s?.quantity ?? 0
                    const minStock = s?.minStock ?? 5
                    const price = s?.salePrice_CLP ?? 0
                    const costCLP = usdToClp(prod.costFOB_USD)
                    const margin = price > 0 ? ((price - costCLP) / price) * 100 : 0
                    const velocity = getSalesVelocity(prod.id, store.id)
                    const daysLeft = velocity > 0 ? Math.round(qty / velocity) : null

                    let status: 'ok' | 'low' | 'out' = 'ok'
                    if (qty === 0) status = 'out'
                    else if (qty <= minStock) status = 'low'

                    return (
                      <tr key={prod.id}>
                        <td><span className="font-mono text-xs badge badge-blue">{prod.sku}</span></td>
                        <td className="font-medium text-gray-900">{prod.name}</td>
                        <td style={{ textAlign: 'right' }}>{usd(prod.costFOB_USD)}<br /><span className="text-xs text-gray-400">{clp(costCLP)}</span></td>
                        <td style={{ textAlign: 'center' }}>
                          {isEditing
                            ? <input className="input" style={{ width: 70, textAlign: 'center' }} value={ed.qty} onChange={e => setEditing(prev => ({ ...prev, [key]: { ...prev[key], qty: e.target.value } }))} />
                            : <span className="font-bold text-gray-900">{qty}</span>
                          }
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {isEditing
                            ? <input className="input" style={{ width: 70, textAlign: 'center' }} value={ed.min} onChange={e => setEditing(prev => ({ ...prev, [key]: { ...prev[key], min: e.target.value } }))} />
                            : minStock
                          }
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {isEditing
                            ? <input className="input" style={{ width: 110, textAlign: 'right' }} value={ed.price} onChange={e => setEditing(prev => ({ ...prev, [key]: { ...prev[key], price: e.target.value } }))} />
                            : price > 0 ? clp(price) : <span className="text-gray-300">—</span>
                          }
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {price > 0 ? <span className={margin > 30 ? 'text-green-600 font-semibold' : margin > 15 ? 'text-yellow-600 font-semibold' : 'text-red-600 font-semibold'}>{margin.toFixed(1)}%</span> : '—'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {daysLeft !== null ? (
                            <span className={daysLeft < 7 ? 'text-red-600 font-semibold' : daysLeft < 14 ? 'text-yellow-600 font-semibold' : 'text-green-600'}>{daysLeft}d</span>
                          ) : '—'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {status === 'out' && <span className="badge badge-red flex items-center gap-1"><AlertTriangle size={10} />Sin stock</span>}
                          {status === 'low' && <span className="badge badge-yellow flex items-center gap-1"><AlertTriangle size={10} />Bajo</span>}
                          {status === 'ok' && <span className="badge badge-green">OK</span>}
                        </td>
                        <td>
                          {isEditing
                            ? <button className="btn btn-success" style={{ padding: '5px 10px' }} onClick={() => saveEdit(prod.id, store.id)}><Save size={13} /></button>
                            : <button className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => startEdit(prod.id, store.id)}>Editar</button>
                          }
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
