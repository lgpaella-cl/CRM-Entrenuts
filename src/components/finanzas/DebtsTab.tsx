import { useState } from 'react'
import { Plus, Pencil, Trash2, ListChecks, CheckCircle, Clock } from 'lucide-react'
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
  return {
    name: '', institution: '', principal_CLP: '', balance_CLP: '',
    monthlyPayment_CLP: '', interestRate: '', startDate: '', endDate: '',
    type: 'consumer' as Debt['type'], totalInstallments: '',
  }
}

function addMonths(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1 + months, d || 1)
  return date.toISOString().split('T')[0]
}

export function DebtsTab() {
  const { debts, debtInstallments, addDebt, updateDebt, deleteDebt, generateInstallments, toggleInstallmentPaid, deleteDebtInstallments } = useStore()
  const { clp } = useFmt()

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Debt | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [viewingDebtId, setViewingDebtId] = useState<string | null>(null)

  const totalBalance = debts.reduce((sum, d) => sum + d.balance_CLP, 0)
  const totalMonthlyPayment = debts.reduce((sum, d) => sum + d.monthlyPayment_CLP, 0)

  /* ── Form helpers ─────────────────────────────────────────── */

  function openAdd() { setForm(emptyForm()); setEditing(null); setShowForm(true) }

  function openEdit(d: Debt) {
    setForm({
      name: d.name, institution: d.institution, type: d.type,
      principal_CLP: String(d.principal_CLP), balance_CLP: String(d.balance_CLP),
      monthlyPayment_CLP: String(d.monthlyPayment_CLP), interestRate: String(d.interestRate),
      startDate: d.startDate, endDate: d.endDate,
      totalInstallments: d.totalInstallments ? String(d.totalInstallments) : '',
    })
    setEditing(d)
    setShowForm(true)
  }

  // Auto-compute endDate and balance when installments + payment + startDate are set
  function handleInstallmentsChange(val: string) {
    const n = parseInt(val) || 0
    const amount = parseFloat(form.monthlyPayment_CLP) || 0
    const updates: Partial<typeof form> = { totalInstallments: val }
    if (n > 0 && form.startDate) {
      updates.endDate = addMonths(form.startDate, n - 1)
    }
    if (n > 0 && amount > 0) {
      updates.balance_CLP = String(n * amount)
      updates.principal_CLP = updates.principal_CLP ?? String(n * amount)
    }
    setForm(f => ({ ...f, ...updates }))
  }

  function handleStartDateChange(val: string) {
    const n = parseInt(form.totalInstallments) || 0
    const updates: Partial<typeof form> = { startDate: val }
    if (n > 0 && val) updates.endDate = addMonths(val, n - 1)
    setForm(f => ({ ...f, ...updates }))
  }

  function handlePaymentChange(val: string) {
    const n = parseInt(form.totalInstallments) || 0
    const amount = parseFloat(val) || 0
    const updates: Partial<typeof form> = { monthlyPayment_CLP: val }
    if (n > 0 && amount > 0) {
      updates.balance_CLP = String(n * amount)
      if (!form.principal_CLP) updates.principal_CLP = String(n * amount)
    }
    setForm(f => ({ ...f, ...updates }))
  }

  function handleSubmitWithInstallments(e: React.FormEvent) {
    e.preventDefault()
    const n = parseInt(form.totalInstallments) || 0
    const amount = parseFloat(form.monthlyPayment_CLP) || 0
    const data: Omit<Debt, 'id'> = {
      name: form.name, institution: form.institution, type: form.type,
      principal_CLP: parseFloat(form.principal_CLP) || 0,
      balance_CLP: n > 0 && amount > 0 ? n * amount : parseFloat(form.balance_CLP) || 0,
      monthlyPayment_CLP: amount,
      interestRate: parseFloat(form.interestRate) || 0,
      startDate: form.startDate, endDate: form.endDate,
      totalInstallments: n > 0 ? n : undefined,
    }

    if (editing) {
      updateDebt(editing.id, data)
      if (n > 0 && form.startDate && amount > 0) {
        generateInstallments(editing.id, form.startDate, n, amount)
      } else if (n === 0) {
        deleteDebtInstallments(editing.id)
      }
    } else {
      addDebt(data)
      // Get the newly created debt id (last added)
      if (n > 0 && form.startDate && amount > 0) {
        // Use setTimeout to let the store update first
        setTimeout(() => {
          const allDebts = useStore.getState().debts
          const newDebt = allDebts.find(d => d.name === data.name && d.institution === data.institution)
          if (newDebt) generateInstallments(newDebt.id, form.startDate, n, amount)
        }, 0)
      }
    }
    setShowForm(false)
    setEditing(null)
  }

  /* ── Progress helpers ─────────────────────────────────────── */

  function getInstallmentStats(debtId: string) {
    const inst = debtInstallments.filter(i => i.debtId === debtId)
    if (inst.length === 0) return null
    const paid = inst.filter(i => i.paid).length
    return { total: inst.length, paid, pct: (paid / inst.length) * 100 }
  }

  function progressPct(d: Debt) {
    const stats = getInstallmentStats(d.id)
    if (stats) return stats.pct
    if (d.principal_CLP === 0) return 0
    return Math.min(100, ((d.principal_CLP - d.balance_CLP) / d.principal_CLP) * 100)
  }

  /* ── Installments modal ───────────────────────────────────── */

  const viewingDebt = debts.find(d => d.id === viewingDebtId)
  const viewingInstallments = viewingDebtId
    ? debtInstallments.filter(i => i.debtId === viewingDebtId).sort((a, b) => a.number - b.number)
    : []
  const paidCount = viewingInstallments.filter(i => i.paid).length
  const paidAmount = viewingInstallments.filter(i => i.paid).reduce((s, i) => s + i.amount_CLP, 0)
  const pendingAmount = viewingInstallments.filter(i => !i.paid).reduce((s, i) => s + i.amount_CLP, 0)
  const instPct = viewingInstallments.length > 0 ? (paidCount / viewingInstallments.length) * 100 : 0

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Deudas</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {debts.length} deudas · Cuota total: <strong>{clp(totalMonthlyPayment)}/mes</strong>
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Nueva deuda</button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="stat-card">
          <div className="stat-label text-red-500">Deuda total</div>
          <div className="stat-value text-red-600">{clp(totalBalance)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Cuota mensual total</div>
          <div className="stat-value">{clp(totalMonthlyPayment)}</div>
        </div>
      </div>

      {debts.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">Agrega tus deudas para llevar el control</div>
      ) : (
        <div className="flex flex-col gap-4">
          {debts.map(d => {
            const pct = progressPct(d)
            const stats = getInstallmentStats(d.id)
            const monthsLeft = d.monthlyPayment_CLP > 0 ? Math.ceil(d.balance_CLP / d.monthlyPayment_CLP) : null

            return (
              <div key={d.id} className="card" style={{ padding: 20 }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{d.name}</p>
                    <p className="text-xs text-gray-500">{d.institution} · {DEBT_TYPES.find(t => t.value === d.type)?.label}</p>
                  </div>
                  <div className="flex gap-2 items-center flex-wrap justify-end">
                    <span className="badge badge-red">{clp(d.balance_CLP)}</span>
                    {stats && (
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '5px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
                        onClick={() => setViewingDebtId(d.id)}
                      >
                        <ListChecks size={13} /> Ver cuotas
                      </button>
                    )}
                    <button className="btn btn-secondary" style={{ padding: '5px 8px' }} onClick={() => openEdit(d)}><Pencil size={12} /></button>
                    <button className="btn btn-danger" style={{ padding: '5px 8px' }} onClick={() => setConfirmId(d.id)}><Trash2 size={12} /></button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    {stats
                      ? <span>{stats.paid}/{stats.total} cuotas pagadas · {clp(d.principal_CLP - d.balance_CLP)} pagado</span>
                      : <span>Pagado: {clp(d.principal_CLP - d.balance_CLP)}</span>
                    }
                    <span style={{ fontWeight: 600 }}>{pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: pct > 70 ? '#10b981' : pct > 40 ? '#3b82f6' : '#f59e0b' }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 text-xs">
                  <div><p className="text-gray-400">Cuota mensual</p><p className="font-semibold">{clp(d.monthlyPayment_CLP)}</p></div>
                  <div><p className="text-gray-400">Tasa mensual</p><p className="font-semibold">{d.interestRate}%</p></div>
                  <div><p className="text-gray-400">{stats ? 'Cuotas restantes' : 'Meses restantes'}</p><p className="font-semibold">{stats ? stats.total - stats.paid : (monthsLeft ?? '—')}</p></div>
                  <div><p className="text-gray-400">Término estimado</p><p className="font-semibold">{d.endDate ? new Date(d.endDate + 'T12:00:00').toLocaleDateString('es-CL', { year: 'numeric', month: 'short' }) : '—'}</p></div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Formulario ────────────────────────────────────────── */}
      {showForm && (
        <Modal title={editing ? 'Editar deuda' : 'Nueva deuda'} onClose={() => { setShowForm(false); setEditing(null) }}>
          <form onSubmit={handleSubmitWithInstallments} className="flex flex-col gap-4">
            <div>
              <label className="label">Nombre *</label>
              <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Hipoteca casa, auto, crédito BCI…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Institución</label>
                <input className="input" value={form.institution} onChange={e => setForm(f => ({ ...f, institution: e.target.value }))} placeholder="Banco, financiera…" />
              </div>
              <div>
                <label className="label">Tipo</label>
                <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as Debt['type'] }))}>
                  {DEBT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>

            {/* Cuotas */}
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Sistema de cuotas (opcional)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">N° de cuotas</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={form.totalInstallments}
                    onChange={e => handleInstallmentsChange(e.target.value)}
                    placeholder="Ej: 24"
                  />
                </div>
                <div>
                  <label className="label">Valor de cada cuota (CLP) *</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    required
                    value={form.monthlyPayment_CLP}
                    onChange={e => handlePaymentChange(e.target.value)}
                    placeholder="250000"
                  />
                </div>
              </div>
              {form.totalInstallments && form.monthlyPayment_CLP && (
                <p style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
                  💡 Se generarán <strong>{form.totalInstallments} cuotas</strong> de <strong>{clp(parseFloat(form.monthlyPayment_CLP) || 0)}</strong> · Total: <strong>{clp((parseInt(form.totalInstallments) || 0) * (parseFloat(form.monthlyPayment_CLP) || 0))}</strong>
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Deuda original (CLP)</label>
                <input className="input" type="number" min="0" value={form.principal_CLP} onChange={e => setForm(f => ({ ...f, principal_CLP: e.target.value }))} />
              </div>
              <div>
                <label className="label">Saldo pendiente (CLP)</label>
                <input className="input" type="number" min="0" value={form.balance_CLP} onChange={e => setForm(f => ({ ...f, balance_CLP: e.target.value }))} />
                {parseInt(form.totalInstallments) > 0 && <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Auto-calculado por cuotas</p>}
              </div>
            </div>

            <div>
              <label className="label">Tasa mensual (%)</label>
              <input className="input" type="number" step="0.01" min="0" value={form.interestRate} onChange={e => setForm(f => ({ ...f, interestRate: e.target.value }))} placeholder="0.5" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Fecha primera cuota *</label>
                <input className="input" type="date" required value={form.startDate} onChange={e => handleStartDateChange(e.target.value)} />
              </div>
              <div>
                <label className="label">Fecha última cuota</label>
                <input className="input" type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                {parseInt(form.totalInstallments) > 0 && form.startDate && <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Auto-calculado</p>}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditing(null) }}>Cancelar</button>
              <button type="submit" className="btn btn-primary">{editing ? 'Guardar cambios' : 'Agregar deuda'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal detalle cuotas ───────────────────────────────── */}
      {viewingDebtId && viewingDebt && (
        <Modal
          title={`Detalle cuotas — ${viewingDebt.name}`}
          onClose={() => setViewingDebtId(null)}
        >
          <div>
            {/* Summary */}
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>
                  {paidCount}/{viewingInstallments.length} cuotas pagadas · {instPct.toFixed(1)}%
                </span>
                <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
                  Pendiente: {clp(pendingAmount)}
                </span>
              </div>
              <div style={{ height: 8, background: '#e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 6, transition: 'width 0.3s',
                  width: `${instPct}%`,
                  background: instPct > 70 ? '#10b981' : instPct > 40 ? '#3b82f6' : '#f59e0b'
                }} />
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, color: '#6b7280' }}>
                <span>✅ Pagado: {clp(paidAmount)}</span>
                <span>⏳ Pendiente: {clp(pendingAmount)}</span>
              </div>
            </div>

            {/* Table */}
            <div style={{ maxHeight: 420, overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>Cuota</th>
                    <th>Fecha</th>
                    <th style={{ textAlign: 'right' }}>Monto</th>
                    <th style={{ textAlign: 'center' }}>Estado</th>
                    <th style={{ textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingInstallments.map(inst => {
                    const isOverdue = !inst.paid && inst.dueDate < new Date().toISOString().split('T')[0]
                    return (
                      <tr key={inst.id} style={{ background: inst.paid ? '#f0fdf4' : isOverdue ? '#fef2f2' : 'white' }}>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: '#6b7280' }}>#{inst.number}</td>
                        <td>{new Date(inst.dueDate + 'T12:00:00').toLocaleDateString('es-CL', { year: 'numeric', month: 'long' })}</td>
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>{clp(inst.amount_CLP)}</td>
                        <td style={{ textAlign: 'center' }}>
                          {inst.paid
                            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#15803d', fontSize: 12, fontWeight: 600 }}><CheckCircle size={13} /> Pagada</span>
                            : isOverdue
                              ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#dc2626', fontSize: 12, fontWeight: 600 }}><Clock size={13} /> Vencida</span>
                              : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#d97706', fontSize: 12 }}><Clock size={13} /> Pendiente</span>
                          }
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            onClick={() => toggleInstallmentPaid(inst.id)}
                            className={inst.paid ? 'btn btn-secondary' : 'btn btn-success'}
                            style={{ padding: '4px 10px', fontSize: 11 }}
                          >
                            {inst.paid ? 'Desmarcar' : 'Marcar pagada'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}

      {confirmId && (
        <ConfirmDialog
          message={`¿Eliminar la deuda "${debts.find(d => d.id === confirmId)?.name}"? También se eliminarán sus cuotas.`}
          onConfirm={() => { deleteDebt(confirmId!); deleteDebtInstallments(confirmId!); setConfirmId(null) }}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}
