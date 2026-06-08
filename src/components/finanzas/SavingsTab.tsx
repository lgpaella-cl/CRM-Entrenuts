import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useStore } from '../../store'
import { useFmt } from '../../hooks/useExchangeRate'
import { Modal } from '../shared/Modal'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import type { SavingsItem } from '../../types'

const TYPES: { value: SavingsItem['type']; label: string; color: string }[] = [
  { value: 'savings', label: 'Ahorro', color: 'badge-blue' },
  { value: 'investment', label: 'Inversión', color: 'badge-green' },
  { value: 'emergency', label: 'Emergencia', color: 'badge-yellow' },
  { value: 'retirement', label: 'Jubilación / APV', color: 'badge-gray' },
]

function emptyForm() {
  return { name: '', balance_CLP: '', targetAmount_CLP: '', annualReturn: '', type: 'savings' as SavingsItem['type'], institution: '', notes: '' }
}

export function SavingsTab() {
  const { savings, addSavings, updateSavings, deleteSavings } = useStore()
  const { clp } = useFmt()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<SavingsItem | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm())

  const totalBalance = savings.reduce((sum, s) => sum + s.balance_CLP, 0)
  const totalTarget = savings.reduce((sum, s) => sum + s.targetAmount_CLP, 0)

  function openAdd() { setForm(emptyForm()); setEditing(null); setShowForm(true) }
  function openEdit(s: SavingsItem) {
    setForm({ name: s.name, balance_CLP: String(s.balance_CLP), targetAmount_CLP: String(s.targetAmount_CLP), annualReturn: String(s.annualReturn), type: s.type, institution: s.institution, notes: s.notes ?? '' })
    setEditing(s); setShowForm(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const data: Omit<SavingsItem, 'id'> = { name: form.name, balance_CLP: parseFloat(form.balance_CLP) || 0, targetAmount_CLP: parseFloat(form.targetAmount_CLP) || 0, annualReturn: parseFloat(form.annualReturn) || 0, type: form.type, institution: form.institution, notes: form.notes }
    if (editing) updateSavings(editing.id, data)
    else addSavings(data)
    setShowForm(false)
  }

  function projected1Year(s: SavingsItem) {
    return s.balance_CLP * Math.pow(1 + s.annualReturn / 100, 1)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Ahorros e Inversiones</h2>
          <p className="text-sm text-gray-500 mt-0.5">{savings.length} ítems</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Nuevo ítem</button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="stat-card"><div className="stat-label text-green-600">Total acumulado</div><div className="stat-value text-green-600">{clp(totalBalance)}</div></div>
        <div className="stat-card"><div className="stat-label">Meta total</div><div className="stat-value">{clp(totalTarget)}<span className="text-sm text-gray-400 font-normal ml-2">{totalTarget > 0 ? `${((totalBalance / totalTarget) * 100).toFixed(1)}% logrado` : ''}</span></div></div>
      </div>

      {savings.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">Agrega tus cuentas de ahorro e inversiones</div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {savings.map(s => {
            const pct = s.targetAmount_CLP > 0 ? Math.min(100, (s.balance_CLP / s.targetAmount_CLP) * 100) : 0
            const typeInfo = TYPES.find(t => t.value === s.type)
            return (
              <div key={s.id} className="card" style={{ padding: 20 }}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.institution}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`badge ${typeInfo?.color}`}>{typeInfo?.label}</span>
                    <button className="btn btn-secondary" style={{ padding: '4px 7px' }} onClick={() => openEdit(s)}><Pencil size={11} /></button>
                    <button className="btn btn-danger" style={{ padding: '4px 7px' }} onClick={() => setConfirmId(s.id)}><Trash2 size={11} /></button>
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-1">{clp(s.balance_CLP)}</p>
                {s.targetAmount_CLP > 0 && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-400 mb-1"><span>Meta: {clp(s.targetAmount_CLP)}</span><span>{pct.toFixed(1)}%</span></div>
                    <div className="h-1.5 bg-gray-100 rounded-full"><div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} /></div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                  <div><p className="text-gray-400">Rentabilidad anual</p><p className="font-semibold text-green-600">{s.annualReturn}%</p></div>
                  <div><p className="text-gray-400">Proyectado 1 año</p><p className="font-semibold">{clp(projected1Year(s))}</p></div>
                </div>
                {s.notes && <p className="text-xs text-gray-400 mt-2 border-t border-gray-50 pt-2">{s.notes}</p>}
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <Modal title={editing ? 'Editar ítem' : 'Nuevo ahorro / inversión'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div><label className="label">Nombre *</label><input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Fondo mutuo, APV, cuenta 2 AFP…" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Tipo</label><select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as SavingsItem['type'] }))}>{TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
              <div><label className="label">Institución</label><input className="input" value={form.institution} onChange={e => setForm(f => ({ ...f, institution: e.target.value }))} placeholder="AFP, banco, corredora…" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Saldo actual (CLP) *</label><input className="input" type="number" min="0" required value={form.balance_CLP} onChange={e => setForm(f => ({ ...f, balance_CLP: e.target.value }))} /></div>
              <div><label className="label">Meta (CLP)</label><input className="input" type="number" min="0" value={form.targetAmount_CLP} onChange={e => setForm(f => ({ ...f, targetAmount_CLP: e.target.value }))} /></div>
            </div>
            <div><label className="label">Rentabilidad anual estimada (%)</label><input className="input" type="number" step="0.1" min="0" value={form.annualReturn} onChange={e => setForm(f => ({ ...f, annualReturn: e.target.value }))} placeholder="Ej: 7.5" /></div>
            <div><label className="label">Notas</label><input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <div className="flex gap-3 justify-end pt-2"><button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button><button type="submit" className="btn btn-primary">{editing ? 'Guardar' : 'Agregar'}</button></div>
          </form>
        </Modal>
      )}

      {confirmId && <ConfirmDialog message={`¿Eliminar "${savings.find(s => s.id === confirmId)?.name}"?`} onConfirm={() => { deleteSavings(confirmId!); setConfirmId(null) }} onCancel={() => setConfirmId(null)} />}
    </div>
  )
}
