import { useState } from 'react'
import { Plus, Pencil, Trash2, MapPin, Package, ChevronDown, ChevronUp, Percent } from 'lucide-react'
import { useStore } from '../../store'
import { Modal } from '../shared/Modal'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { useFmt } from '../../hooks/useExchangeRate'
import type { Store } from '../../types'

function emptyStoreForm(): Omit<Store, 'id'> {
  return { name: '', address: '', city: '', contactName: '', contactPhone: '', active: true, commissionPct: 0 }
}

function emptyProductForm() {
  return { productId: '', quantity: '0', minStock: '5', costPrice_CLP: '', salePrice_CLP: '' }
}

export function PuntosDeVentaTab() {
  const { stores, products, stock, addStore, updateStore, deleteStore, setStock } = useStore()
  const { clp, usdToClp } = useFmt()

  // Store form
  const [showStoreForm, setShowStoreForm] = useState(false)
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [confirmStoreId, setConfirmStoreId] = useState<string | null>(null)
  const [storeForm, setStoreForm] = useState<Omit<Store, 'id'>>(emptyStoreForm())

  // Expanded card
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Product assignment form
  const [showProductForm, setShowProductForm] = useState(false)
  const [productFormStoreId, setProductFormStoreId] = useState<string | null>(null)
  const [productForm, setProductForm] = useState(emptyProductForm())

  /* ── Store CRUD ──────────────────────────────────────────────── */

  function openAddStore() {
    setStoreForm(emptyStoreForm())
    setEditingStore(null)
    setShowStoreForm(true)
  }

  function openEditStore(s: Store) {
    setStoreForm({
      name: s.name, address: s.address, city: s.city,
      contactName: s.contactName, contactPhone: s.contactPhone,
      active: s.active, commissionPct: s.commissionPct ?? 0,
    })
    setEditingStore(s)
    setShowStoreForm(true)
  }

  function handleStoreSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editingStore) updateStore(editingStore.id, storeForm)
    else addStore(storeForm)
    setShowStoreForm(false)
  }

  /* ── Product assignment ──────────────────────────────────────── */

  function openAddProduct(storeId: string) {
    setProductFormStoreId(storeId)
    setProductForm(emptyProductForm())
    setShowProductForm(true)
  }

  function openEditProduct(storeId: string, productId: string) {
    const entry = stock.find(e => e.storeId === storeId && e.productId === productId)
    if (!entry) return
    setProductFormStoreId(storeId)
    setProductForm({
      productId,
      quantity: String(entry.quantity),
      minStock: String(entry.minStock),
      costPrice_CLP: entry.costPrice_CLP ? String(entry.costPrice_CLP) : '',
      salePrice_CLP: entry.salePrice_CLP ? String(entry.salePrice_CLP) : '',
    })
    setShowProductForm(true)
  }

  function handleProductSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!productFormStoreId || !productForm.productId) return
    setStock(productForm.productId, productFormStoreId, {
      quantity: parseInt(productForm.quantity) || 0,
      minStock: parseInt(productForm.minStock) || 5,
      costPrice_CLP: parseFloat(productForm.costPrice_CLP) || 0,
      salePrice_CLP: parseFloat(productForm.salePrice_CLP) || 0,
    })
    setShowProductForm(false)
  }

  /* ── Helpers ─────────────────────────────────────────────────── */

  function getStoreStock(storeId: string) {
    return stock.filter(e => e.storeId === storeId)
  }

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Puntos de Venta</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {stores.filter(s => s.active).length} activos · {stores.length} total
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAddStore}>
          <Plus size={16} /> Nuevo Punto de Venta
        </button>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-4">
        {stores.length === 0 && (
          <div className="card flex flex-col items-center justify-center py-16 text-gray-400">
            <MapPin size={40} className="mb-3 opacity-30" />
            <p className="font-medium">Sin puntos de venta registrados</p>
            <p className="text-sm">Agrega tus tiendas o canales de venta</p>
          </div>
        )}

        {stores.map(s => {
          const storeStock = getStoreStock(s.id)
          const isExpanded = expandedId === s.id
          const totalUnits = storeStock.reduce((acc, e) => acc + e.quantity, 0)
          const lowStockCount = storeStock.filter(e => e.quantity <= e.minStock && e.quantity > 0).length
          const outStockCount = storeStock.filter(e => e.quantity === 0).length

          return (
            <div key={s.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Card header */}
              <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>{s.name}</span>
                    <span className={`badge ${s.active ? 'badge-green' : 'badge-gray'}`}>
                      {s.active ? 'Activo' : 'Inactivo'}
                    </span>
                    {(s.commissionPct ?? 0) > 0 && (
                      <span className="badge badge-blue" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Percent size={11} /> {s.commissionPct}% comisión
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#6b7280', flexWrap: 'wrap' }}>
                    {s.city && <span>{s.city}</span>}
                    {s.address && <span>{s.address}</span>}
                    {s.contactName && (
                      <span>
                        Contacto: {s.contactName}
                        {s.contactPhone && ` · ${s.contactPhone}`}
                      </span>
                    )}
                  </div>
                  {storeStock.length > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 12, fontSize: 12 }}>
                      <span style={{ color: '#374151' }}>
                        <strong>{storeStock.length}</strong> productos · <strong>{totalUnits}</strong> uds. stock
                      </span>
                      {lowStockCount > 0 && (
                        <span className="badge badge-yellow">{lowStockCount} stock bajo</span>
                      )}
                      {outStockCount > 0 && (
                        <span className="badge badge-red">{outStockCount} agotado</span>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => openEditStore(s)}>
                    <Pencil size={13} />
                  </button>
                  <button className="btn btn-danger" style={{ padding: '6px 10px' }} onClick={() => setConfirmStoreId(s.id)}>
                    <Trash2 size={13} />
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 5 }}
                    onClick={() => setExpandedId(isExpanded ? null : s.id)}
                  >
                    <Package size={13} />
                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    Productos
                  </button>
                </div>
              </div>

              {/* Expanded product list */}
              {isExpanded && (
                <div style={{ borderTop: '1px solid #e2e8f0', padding: '16px 20px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <h4 style={{ fontWeight: 600, color: '#374151', fontSize: 14 }}>
                      Productos en este punto de venta
                    </h4>
                    <button
                      className="btn btn-primary"
                      style={{ padding: '5px 12px', fontSize: 12 }}
                      onClick={() => openAddProduct(s.id)}
                    >
                      <Plus size={13} /> Agregar producto
                    </button>
                  </div>

                  {storeStock.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: '16px 0' }}>
                      No hay productos asignados. Agrega el primero.
                    </p>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th style={{ textAlign: 'center' }}>Stock</th>
                          <th style={{ textAlign: 'center' }}>Mín.</th>
                          <th style={{ textAlign: 'right' }}>P. entrega a PdV</th>
                          <th style={{ textAlign: 'right' }}>P. venta público</th>
                          <th style={{ textAlign: 'right' }}>Margen PdV</th>
                          <th style={{ textAlign: 'right' }}>Tu margen</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {storeStock.map(entry => {
                          const prod = products.find(p => p.id === entry.productId)
                          const costPdV = entry.costPrice_CLP ?? 0
                          const salePrice = entry.salePrice_CLP ?? 0
                          const myCost = usdToClp(prod?.costFOB_USD ?? 0)

                          const pdvMarginPct = salePrice > 0 && costPdV > 0
                            ? ((salePrice - costPdV) / salePrice) * 100 : null
                          const myMarginPct = costPdV > 0 && myCost > 0
                            ? ((costPdV - myCost) / costPdV) * 100 : null

                          const stockAlert = entry.quantity === 0 ? 'badge-red'
                            : entry.quantity <= entry.minStock ? 'badge-yellow' : null

                          return (
                            <tr key={entry.id}>
                              <td>
                                <span style={{ fontWeight: 500 }}>{prod?.name ?? '—'}</span>
                                <br />
                                <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{prod?.sku}</span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {stockAlert
                                  ? <span className={`badge ${stockAlert}`}>{entry.quantity}</span>
                                  : <span style={{ fontWeight: 600 }}>{entry.quantity}</span>
                                }
                              </td>
                              <td style={{ textAlign: 'center', color: '#6b7280' }}>{entry.minStock}</td>
                              <td style={{ textAlign: 'right' }}>
                                {costPdV > 0 ? clp(costPdV) : <span style={{ color: '#d1d5db' }}>—</span>}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                {salePrice > 0 ? clp(salePrice) : <span style={{ color: '#d1d5db' }}>—</span>}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                {pdvMarginPct !== null
                                  ? <span style={{ fontWeight: 600, color: pdvMarginPct > 25 ? '#16a34a' : pdvMarginPct > 10 ? '#d97706' : '#dc2626' }}>
                                    {pdvMarginPct.toFixed(1)}%
                                  </span>
                                  : <span style={{ color: '#d1d5db' }}>—</span>
                                }
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                {myMarginPct !== null
                                  ? <span style={{ fontWeight: 600, color: myMarginPct > 30 ? '#16a34a' : myMarginPct > 15 ? '#d97706' : '#dc2626' }}>
                                    {myMarginPct.toFixed(1)}%
                                  </span>
                                  : <span style={{ color: '#d1d5db' }}>—</span>
                                }
                              </td>
                              <td>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 8px', fontSize: 11 }}
                                  onClick={() => openEditProduct(s.id, entry.productId)}
                                >
                                  <Pencil size={11} /> Editar
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Store form modal ──────────────────────────────────────── */}
      {showStoreForm && (
        <Modal
          title={editingStore ? 'Editar Punto de Venta' : 'Nuevo Punto de Venta'}
          onClose={() => setShowStoreForm(false)}
        >
          <form onSubmit={handleStoreSubmit} className="flex flex-col gap-4">
            <div>
              <label className="label">Nombre *</label>
              <input
                className="input"
                required
                value={storeForm.name}
                onChange={e => setStoreForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Mall Plaza Sur"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Ciudad *</label>
                <input
                  className="input"
                  required
                  value={storeForm.city}
                  onChange={e => setStoreForm(f => ({ ...f, city: e.target.value }))}
                  placeholder="Santiago"
                />
              </div>
              <div>
                <label className="label">Dirección</label>
                <input
                  className="input"
                  value={storeForm.address}
                  onChange={e => setStoreForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Av. Ejemplo 123"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Nombre contacto</label>
                <input
                  className="input"
                  value={storeForm.contactName}
                  onChange={e => setStoreForm(f => ({ ...f, contactName: e.target.value }))}
                  placeholder="Juan Pérez"
                />
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input
                  className="input"
                  value={storeForm.contactPhone}
                  onChange={e => setStoreForm(f => ({ ...f, contactPhone: e.target.value }))}
                  placeholder="+56 9 1234 5678"
                />
              </div>
            </div>
            <div>
              <label className="label">% Comisión del Punto de Venta</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={storeForm.commissionPct ?? 0}
                  onChange={e => setStoreForm(f => ({ ...f, commissionPct: parseFloat(e.target.value) || 0 }))}
                  placeholder="0"
                  style={{ paddingRight: 32 }}
                />
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: 14, pointerEvents: 'none' }}>%</span>
              </div>
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                % que cobra el PdV sobre cada venta. Ej: 30 si se queda con el 30% de lo vendido.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="storeActive"
                checked={storeForm.active}
                onChange={e => setStoreForm(f => ({ ...f, active: e.target.checked }))}
              />
              <label htmlFor="storeActive" style={{ fontSize: 13, color: '#374151' }}>Punto de venta activo</label>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" className="btn btn-secondary" onClick={() => setShowStoreForm(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">
                {editingStore ? 'Guardar cambios' : 'Crear Punto de Venta'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Product assignment modal ──────────────────────────────── */}
      {showProductForm && productFormStoreId && (
        <Modal title="Asignar Producto a Punto de Venta" onClose={() => setShowProductForm(false)}>
          <form onSubmit={handleProductSubmit} className="flex flex-col gap-4">
            <div>
              <label className="label">Producto *</label>
              <select
                className="input"
                required
                value={productForm.productId}
                onChange={e => setProductForm(f => ({ ...f, productId: e.target.value }))}
              >
                <option value="">Seleccionar producto…</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Stock actual</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={productForm.quantity}
                  onChange={e => setProductForm(f => ({ ...f, quantity: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Stock mínimo alerta</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={productForm.minStock}
                  onChange={e => setProductForm(f => ({ ...f, minStock: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Precio que le cobras al PdV (CLP)</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={productForm.costPrice_CLP}
                  onChange={e => setProductForm(f => ({ ...f, costPrice_CLP: e.target.value }))}
                  placeholder="Ej: 8000"
                />
                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>Lo que tú le cobras al punto de venta</p>
              </div>
              <div>
                <label className="label">Precio venta al público (CLP)</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={productForm.salePrice_CLP}
                  onChange={e => setProductForm(f => ({ ...f, salePrice_CLP: e.target.value }))}
                  placeholder="Ej: 15000"
                />
                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>Precio final al consumidor</p>
              </div>
            </div>
            {productForm.costPrice_CLP && productForm.salePrice_CLP && (
              <div style={{ background: '#eff6ff', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#1d4ed8' }}>
                Margen del PdV: <strong>
                  {(((parseFloat(productForm.salePrice_CLP) - parseFloat(productForm.costPrice_CLP)) / parseFloat(productForm.salePrice_CLP)) * 100).toFixed(1)}%
                </strong>
                {' '}· Ganancia PdV por unidad: <strong>
                  {clp(parseFloat(productForm.salePrice_CLP) - parseFloat(productForm.costPrice_CLP))}
                </strong>
              </div>
            )}
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" className="btn btn-secondary" onClick={() => setShowProductForm(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Guardar</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Confirm delete ────────────────────────────────────────── */}
      {confirmStoreId && (
        <ConfirmDialog
          message={`¿Eliminar el punto de venta "${stores.find(s => s.id === confirmStoreId)?.name}"? Se perderá el stock asignado.`}
          onConfirm={() => { deleteStore(confirmStoreId!); setConfirmStoreId(null) }}
          onCancel={() => setConfirmStoreId(null)}
        />
      )}
    </div>
  )
}
