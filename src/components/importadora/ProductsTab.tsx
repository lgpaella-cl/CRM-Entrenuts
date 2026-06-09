import { useState } from 'react'
import { Plus, Pencil, Trash2, Package, Calculator } from 'lucide-react'
import { useStore } from '../../store'
import { useFmt } from '../../hooks/useExchangeRate'
import { Modal } from '../shared/Modal'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import type { Product } from '../../types'

const CATEGORIES = ['Electrónica', 'Textil', 'Hogar', 'Alimentos', 'Belleza', 'Deporte', 'Juguetes', 'Industrial', 'Otro']
const UNITS = ['Unidad', 'Caja', 'Par', 'Kg', 'Litro', 'Metro', 'Pack']

function emptyForm() {
  return { name: '', description: '', category: 'Otro', costFCA_USD: '', costFOB_USD: '', unit: 'Unidad' }
}

export function ProductsTab() {
  const { products, addProduct, updateProduct, deleteProduct } = useStore()
  const { clp, usd, usdToClp, rate } = useFmt()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [search, setSearch] = useState('')

  // Price calculator
  const [calcProduct, setCalcProduct] = useState<Product | null>(null)
  const [calcMargin, setCalcMargin] = useState(40)
  const [calcCommission, setCalcCommission] = useState(30)

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  )

  function openAdd() { setForm(emptyForm()); setEditing(null); setShowForm(true) }
  function openEdit(p: Product) {
    setForm({ name: p.name, description: p.description, category: p.category, costFCA_USD: String(p.costFCA_USD), costFOB_USD: String(p.costFOB_USD), unit: p.unit })
    setEditing(p)
    setShowForm(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const data = {
      name: form.name,
      description: form.description,
      category: form.category,
      costFCA_USD: parseFloat(form.costFCA_USD) || 0,
      costFOB_USD: parseFloat(form.costFOB_USD) || 0,
      unit: form.unit,
    }
    if (editing) updateProduct(editing.id, data)
    else addProduct(data)
    setShowForm(false)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Catálogo de Productos</h2>
          <p className="text-sm text-gray-500 mt-0.5">{products.length} productos · Dólar hoy: {clp(rate)}</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Nuevo Producto</button>
      </div>

      {/* Buscador */}
      <div className="mb-4">
        <input className="input" style={{ maxWidth: 320 }} placeholder="Buscar por nombre, SKU o categoría..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Tabla */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Package size={40} className="mb-3 opacity-30" />
            <p className="font-medium">Sin productos</p>
            <p className="text-sm">Agrega tu primer producto para comenzar</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Unidad</th>
                <th style={{ textAlign: 'right' }}>Costo FCA (USD)</th>
                <th style={{ textAlign: 'right' }}>Costo FOB (USD)</th>
                <th style={{ textAlign: 'right' }}>FOB en CLP</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td><span className="badge badge-blue font-mono">{p.sku}</span></td>
                  <td><span className="font-medium text-gray-900">{p.name}</span><br /><span className="text-xs text-gray-400">{p.description}</span></td>
                  <td><span className="badge badge-gray">{p.category}</span></td>
                  <td>{p.unit}</td>
                  <td style={{ textAlign: 'right' }}>{usd(p.costFCA_USD)}</td>
                  <td style={{ textAlign: 'right' }}>{usd(p.costFOB_USD)}</td>
                  <td style={{ textAlign: 'right' }} className="font-semibold text-gray-900">{clp(usdToClp(p.costFOB_USD))}</td>
                  <td>
                    <div className="flex gap-2 justify-end">
                      <button className="btn btn-secondary" style={{ padding: '6px 10px' }} title="Calcular precio sugerido" onClick={() => { setCalcProduct(p); setCalcMargin(40); setCalcCommission(30) }}><Calculator size={13} /></button>
                      <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => openEdit(p)}><Pencil size={13} /></button>
                      <button className="btn btn-danger" style={{ padding: '6px 10px' }} onClick={() => setConfirmId(p.id)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <Modal title={editing ? 'Editar Producto' : 'Nuevo Producto'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="label">Nombre del producto *</label>
              <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Audífonos Bluetooth Pro" />
            </div>
            <div>
              <label className="label">Descripción</label>
              <input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción breve" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Categoría</label>
                <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Unidad de medida</label>
                <select className="input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                  {UNITS.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Costo FCA (USD) — en origen</label>
                <input className="input" type="number" step="0.01" min="0" required value={form.costFCA_USD} onChange={e => setForm(f => ({ ...f, costFCA_USD: e.target.value }))} placeholder="0.00" />
              </div>
              <div>
                <label className="label">Costo FOB (USD) — puesto a bordo</label>
                <input className="input" type="number" step="0.01" min="0" required value={form.costFOB_USD} onChange={e => setForm(f => ({ ...f, costFOB_USD: e.target.value }))} placeholder="0.00" />
              </div>
            </div>
            {form.costFOB_USD && (
              <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                FOB equivale a <strong>{clp(usdToClp(parseFloat(form.costFOB_USD) || 0))}</strong> al dólar de hoy ({clp(rate)})
              </div>
            )}
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">{editing ? 'Guardar cambios' : 'Agregar producto'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirm delete */}
      {confirmId && (
        <ConfirmDialog
          message={`¿Eliminar el producto "${products.find(p => p.id === confirmId)?.name}"? Esta acción no se puede deshacer.`}
          onConfirm={() => { deleteProduct(confirmId!); setConfirmId(null) }}
          onCancel={() => setConfirmId(null)}
        />
      )}

      {/* Price calculator modal */}
      {calcProduct && (() => {
        const fobCLP = usdToClp(calcProduct.costFOB_USD)
        const deliveryPrice = calcMargin < 100 ? fobCLP / (1 - calcMargin / 100) : 0
        const publicPrice = calcCommission < 100 ? deliveryPrice / (1 - calcCommission / 100) : 0
        const profitPerUnit = deliveryPrice - fobCLP
        return (
          <Modal title={`Calculadora de precio — ${calcProduct.name}`} onClose={() => setCalcProduct(null)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="label">Costo FOB en CLP (hoy)</label>
                <input className="input" readOnly value={clp(fobCLP)} style={{ background: '#f8fafc', fontWeight: 600 }} />
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Basado en {usd(calcProduct.costFOB_USD)} × dólar de hoy ({clp(rate)})</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Margen que quiero ganar (%)</label>
                  <input className="input" type="number" min="0" max="99" step="1" value={calcMargin} onChange={e => setCalcMargin(parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="label">Comisión del PdV (%)</label>
                  <input className="input" type="number" min="0" max="99" step="1" value={calcCommission} onChange={e => setCalcCommission(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
              <div style={{ background: '#eff6ff', borderRadius: 10, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#374151' }}>Precio mínimo de entrega al PdV</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#1d4ed8' }}>{clp(deliveryPrice)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#374151' }}>Precio mínimo venta al público</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#0284c7' }}>{clp(publicPrice)}</span>
                </div>
                <div style={{ borderTop: '1px solid #bfdbfe', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Tu ganancia por unidad</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#15803d' }}>{clp(profitPerUnit)}</span>
                </div>
              </div>
              <button className="btn btn-secondary" onClick={() => setCalcProduct(null)} style={{ alignSelf: 'flex-end' }}>Cerrar</button>
            </div>
          </Modal>
        )
      })()}
    </div>
  )
}
