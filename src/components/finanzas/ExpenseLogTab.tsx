import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useStore } from '../../store'
import { useFmt } from '../../hooks/useExchangeRate'
import { Modal } from '../shared/Modal'
import type { ExpenseItem } from '../../types'

const CATEGORIES: { value: ExpenseItem['category']; label: string }[] = [
  { value: 'housing', label: 'Vivienda' },
  { value: 'transport', label: 'Transporte' },
  { value: 'food', label: 'Alimentación' },
  { value: 'health', label: 'Salud' },
  { value: 'education', label: 'Educación' },
  { value: 'entertainment', label: 'Entretenimiento' },
  { value: 'subscriptions', label: 'Suscripciones' },
  { value: 'business', label: 'Negocio' },
  { value: 'other', label: 'Otro' },
]

function today() { return new Date().toISOString().split('T')[0] }

export function ExpenseLogTab() {
  const { expenseLogs, addExpenseLog, deleteExpenseLog } = useStore()
  const { clp } = useFmt()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', amount_CLP: '', date: today(), category: 'other' as ExpenseItem['category'], notes: '' })
  const [filterMonth, setFilterMonth] = useState(today().slice(0, 7))

  const filtered = expenseLogs
    .filter(l => l.date.startsWith(filterMonth))
    .sort((a, b) => b.date.localeCompare(a.date))

  const totalMonth = filtered.reduce((sum, l) => sum + l.amount_CLP, 0)

  const byCategory = CATEGORIES.map(c => ({
    label: c.label,
    value: c.value,
    total: filtered.filter(l => l.category === c.value).reduce((sum, l) => sum + l.amount_CLP, 0)
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    addExpenseLog({ name: form.name, amount_CLP: parseFloat(form.amount_CLP) || 0, date: form.date, category: form.category, notes: form.notes })
    setShowForm(false)
    setForm({ name: '', amount_CLP: '', date: today(), category: 'other', notes: '' })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Registro de Gastos</h2>
          <p className="text-sm text-gray-500 mt-0.5">Anota cada gasto para proyectar tus flujos</p>
        </div>
        <div className="flex gap-3 items-center">
          <input className="input" type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ width: 150 }} />
          <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={16} /> Agregar gasto</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="stat-card">
          <div className="stat-label text-red-500">Total gastado ({filterMonth})</div>
          <div className="stat-value text-red-600">{clp(totalMonth)}</div>
          <div className="text-xs text-gray-400 mt-1">{filtered.length} transacciones</div>
        </div>
        <div className="card">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Por categoría</p>
          {byCategory.length === 0 ? <p className="text-gray-300 text-sm">Sin datos</p> : (
            <div className="flex flex-col gap-1.5">
              {byCategory.map(c => (
                <div key={c.value} className="flex items-center gap-2">
                  <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${(c.total / totalMonth) * 140}px`, minWidth: 4, maxWidth: 140 }} />
                  <span className="text-xs text-gray-600">{c.label}</span>
                  <span className="text-xs font-semibold text-gray-800 ml-auto">{clp(c.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-400">Sin gastos registrados en este mes</div>
        ) : (
          <table>
            <thead><tr><th>Fecha</th><th>Nombre</th><th>Categoría</th><th style={{ textAlign: 'right' }}>Monto</th><th>Notas</th><th></th></tr></thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id}>
                  <td>{new Date(l.date + 'T12:00:00').toLocaleDateString('es-CL')}</td>
                  <td className="font-medium">{l.name}</td>
                  <td><span className="badge badge-gray">{CATEGORIES.find(c => c.value === l.category)?.label}</span></td>
                  <td style={{ textAlign: 'right' }} className="font-semibold text-red-600">{clp(l.amount_CLP)}</td>
                  <td className="text-xs text-gray-400">{l.notes || '—'}</td>
                  <td><button className="btn btn-danger" style={{ padding: '4px 8px' }} onClick={() => deleteExpenseLog(l.id)}><Trash2 size={12} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <Modal title="Registrar gasto" onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div><label className="label">Descripción *</label><input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Supermercado, bencina, medicamentos…" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Monto (CLP) *</label><input className="input" type="number" min="0" required value={form.amount_CLP} onChange={e => setForm(f => ({ ...f, amount_CLP: e.target.value }))} /></div>
              <div><label className="label">Categoría</label><select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as ExpenseItem['category'] }))}>{CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
            </div>
            <div><label className="label">Fecha *</label><input className="input" type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div><label className="label">Notas</label><input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <div className="flex gap-3 justify-end pt-2"><button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button><button type="submit" className="btn btn-primary">Registrar</button></div>
          </form>
        </Modal>
      )}
    </div>
  )
}
