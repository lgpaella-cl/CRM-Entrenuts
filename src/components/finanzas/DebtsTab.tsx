import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useStore } from '../../store'
import { useFmt } from '../../hooks/useExchangeRate'
import { Modal } from '../shared/Modal'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import type { Debt } from '../../types'

const DEBT_TYPES: { value: Debt['type']; label: string }[] = [
  { value: 'mortgage', label: 'Hipoteca' },
  { value: 'consumer', label: 'Crédito de consumo' },
  { value: 'credit_card', label: 'Tarjeta de crédito' },
  { value: 'car', label: 'Crédito automotriz' },
  { value: 'other', label: 'Otro' },
]

function emptyForm() {
  return { name: '', institution: '', principal_CLP: '', balance_CLP: '', monthlyPayment_CLP: '', interestRate: '', startDate: '', endDate: '', type: 'consumer' as Debt['type'] }
}

export function DebtsTab() {
  const { debts, addDebt, updateDebt, deleteDebt } = useStore()
  const { clp } = useFmt()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Debt | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm())

  const totalBalance = debts.reduce((sum, d) => sum + d.balance_CLP, 0)
  const totalMonthlyPayment = debts.reduce((sum, d) => sum + d.monthlyPayment_CLP, 0)

  function openAdd() { setForm(emptyForm()); setEditing(null); setShowForm(true) }
  function openEdit(d: Debt) {
    setForm({ name: d.name, institution: d.institution, principal_CLP: String(d.principal_CLP), balance_CLP: String(d.balance_CLP), monthlyPayment_CLP: String(d.monthlyPayment_CLP), interestRate: String(d.interestRate), startDate: d.startDate, endDate: d.endDate, type: d.type })
    setEditing(d); setShowForm(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const data: Omit<Debt, 'id'> = {
      name: form.name, institution: form.institution, type: form.type,
      principal_CLP: parseFloat(form.principal_CLP) || 0,
      balance_CLP: parseFloat(form.balance_CLP) || 0,
      monthlyPayment_CLP: parseFloat(form.monthlyPayment_CLP) || 0,
      interestRate: parseFloat(form.interestRate) || 0,
      startDate: form.startDate, endDate: form.endDate,
    }
    if (editing) updateDebt(editing.id, data)
    else addDebt(data)
    setShowForm(false)
  }

  function progressPct(d: Debt) {
    if (d.principal_CLP === 0) return 0
    return Math.min(100, ((d.principal_CLP - d.balance_CLP) / d.principal_CLP) * 100)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Deudas</h2>
          <p className="text-sm text-gray-500 mt-0.5">{debts.length} deudas · Cuota total: <strong>{clp(totalMonthlyPayment)}/mes</strong></p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Nueva deuda</button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="stat-card"><div className="stat-label text-red-500">Deuda total</div><div className="stat-value text-red-600">{clp(totalBalance)}</div></div>
        <div className="stat-card"><div className="stat-label">Cuota mensual total</div><div className="stat-value">{clp(totalMonthlyPayment)}</div></div>
      </div>

      {debts.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">Agrega tus deudas para llevar el control</div>
      ) : (
        <div className="flex flex-col gap-4">
          {debts.map(d => {
            const pct = progressPct(d)
            const monthsLeft = d.monthlyPayment_CLP > 0 ? Math.ceil(d.balance_CLP / d.monthlyPayment_CLP) : null
            return (
              <div key={d.id} className="card" style={{ padding: 20 }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{d.name}</p>
                    <p className="text-xs text-gray-500">{d.institution} · {DEBT_TYPES.find(t => t.value === d.type)?.label}</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="badge badge-red">{clp(d.balance_CLP)}</span>
                    <button className="btn btn-secondary" style={{ padding: '5px 8px' }} onClick={() => openEdit(d)}><Pencil size={12} /></button>
                    <button className="btn btn-danger" style={{ padding: '5px 8px' }} onClick={() => setConfirmId(d.id)}><Trash2 size={12} /></button>
                  </div>
                </div>
                {/* Progreso */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Pagado: {clp(d.principal_CLP - d.balance_CLP)}</span>
                    <span>{pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3 text-xs">
                  <div><p className="text-gray-400">Cuota mensual</p><p className="font-semibold">{clp(d.monthlyPayment_CLP)}</p></div>
                  <div><p className="text-gray-400">Tasa mensual</p><p className="font-semibold">{d.interestRate}%</p></div>
                  <div><p className="text-gray-400">Meses restantes</p><p className="font-semibold">{monthsLeft ?? '—'}</p></div>
                  <div><p className="text-gray-400">Término estimado</p><p className="font-semibold">{d.endDate ? new Date(d.endDate + 'T12:00:00').toLocaleDateString('es-CL', { year: 'numeric', month: 'short' }) : '—'}</p></div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <Modal title={editing ? 'Editar deuda' : 'Nueva deuda'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div><label className="label">Nombre *</label><input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Hipoteca casa, auto, crédito BCI…" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Institución</label><input className="input" value={form.institution} onChange={e => setForm(f => ({ ...f, institution: e.target.value }))} placeholder="Banco, financiera…" /></div>
              <div><label className="label">Tipo</label><select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as Debt['type'] }))}>{DEBT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Deuda original (CLP)</label><input className="input" type="number" min="0" value={form.principal_CLP} onChange={e => setForm(f => ({ ...f, principal_CLP: e.target.value }))} /></div>
              <div><label className="label">Saldo actual (CLP) *</label><input className="input" type="number" min="0" required value={form.balance_CLP} onChange={e => setForm(f => ({ ...f, balance_CLP: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Cuota mensual (CLP) *</label><input className="input" type="number" min="0" required value={form.monthlyPayment_CLP} onChange={e => setForm(f => ({ ...f, monthlyPayment_CLP: e.target.value }))} /></div>
              <div><label className="label">Tasa mensual (%)</label><input className="input" type="number" step="0.01" min="0" value={form.interestRate} onChange={e => setForm(f => ({ ...f, interestRate: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Fecha inicio</label><input className="input" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></div>
              <div><label className="label">Fecha término</label><input className="input" type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} /></div>
            </div>
            <div className="flex gap-3 justify-end pt-2"><button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button><button type="submit" className="btn btn-primary">{editing ? 'Guardar' : 'Agregar'}</button></div>
          </form>
        </Modal>
      )}

      {confirmId && (
        <ConfirmDialog
          message={`¿Eliminar la deuda "${debts.find(d => d.id === confirmId)?.name}"?`}
          onConfirm={() => { deleteDebt(confirmId!); setConfirmId(null) }}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}
