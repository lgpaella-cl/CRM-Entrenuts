import { useState } from 'react'
import { Plus, Pencil, Trash2, Store as StoreIcon } from 'lucide-react'
import { useStore } from '../../store'
import { Modal } from '../shared/Modal'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import type { Store } from '../../types'

function emptyForm(): Omit<Store, 'id'> {
  return { name: '', address: '', city: '', contactName: '', contactPhone: '', active: true }
}

export function StoresTab() {
  const { stores, addStore, updateStore, deleteStore } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Store | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<Store, 'id'>>(emptyForm())

  function openAdd() { setForm(emptyForm()); setEditing(null); setShowForm(true) }
  function openEdit(s: Store) { setForm({ name: s.name, address: s.address, city: s.city, contactName: s.contactName, contactPhone: s.contactPhone, active: s.active }); setEditing(s); setShowForm(true) }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editing) updateStore(editing.id, form)
    else addStore(form)
    setShowForm(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Tiendas / Canales</h2>
          <p className="text-sm text-gray-500 mt-0.5">{stores.filter(s => s.active).length} activas de {stores.length} total</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Nueva Tienda</button>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {stores.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-gray-400 card">
            <StoreIcon size={40} className="mb-3 opacity-30" />
            <p className="font-medium">Sin tiendas registradas</p>
            <p className="text-sm">Agrega tus tiendas o canales de venta</p>
          </div>
        )}
        {stores.map(s => (
          <div key={s.id} className="card" style={{ padding: 20 }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-gray-900">{s.name}</p>
                <p className="text-xs text-gray-500">{s.city}</p>
              </div>
              <span className={`badge ${s.active ? 'badge-green' : 'badge-gray'}`}>{s.active ? 'Activa' : 'Inactiva'}</span>
            </div>
            <p className="text-xs text-gray-500 mb-1">{s.address}</p>
            {s.contactName && <p className="text-xs text-gray-600"><strong>Contacto:</strong> {s.contactName} {s.contactPhone && `· ${s.contactPhone}`}</p>}
            <div className="flex gap-2 mt-4">
              <button className="btn btn-secondary flex-1" style={{ padding: '6px' }} onClick={() => openEdit(s)}><Pencil size={13} /> Editar</button>
              <button className="btn btn-danger" style={{ padding: '6px 10px' }} onClick={() => setConfirmId(s.id)}><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <Modal title={editing ? 'Editar Tienda' : 'Nueva Tienda'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="label">Nombre de la tienda *</label>
              <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Tienda Mall Plaza" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Ciudad *</label>
                <input className="input" required value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Santiago" />
              </div>
              <div>
                <label className="label">Dirección</label>
                <input className="input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Av. Ejemplo 123" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Nombre contacto</label>
                <input className="input" value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} placeholder="Juan Pérez" />
              </div>
              <div>
                <label className="label">Teléfono contacto</label>
                <input className="input" value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} placeholder="+56 9 1234 5678" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="active" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
              <label htmlFor="active" className="text-sm text-gray-700">Tienda activa</label>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">{editing ? 'Guardar cambios' : 'Agregar tienda'}</button>
            </div>
          </form>
        </Modal>
      )}

      {confirmId && (
        <ConfirmDialog
          message={`¿Eliminar la tienda "${stores.find(s => s.id === confirmId)?.name}"?`}
          onConfirm={() => { deleteStore(confirmId!); setConfirmId(null) }}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}
