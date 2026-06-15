import { useState } from 'react'
import { Plus, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle, ChevronDown, ChevronUp, X } from 'lucide-react'
import { useStore } from '../../store'
import { useFmt } from '../../hooks/useExchangeRate'
import { Modal } from '../shared/Modal'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import type { SavingsItem } from '../../types'

const TYPES: { value: SavingsItem['type']; label: string; color: string }[] = [
  { value: 'savings',    label: 'Ahorro',          color: 'badge-blue' },
  { value: 'investment', label: 'Inversión',        color: 'badge-green' },
  { value: 'emergency',  label: 'Emergencia',       color: 'badge-yellow' },
  { value: 'retirement', label: 'APV / Jubilación', color: 'badge-gray' },
]

function today() { return new Date().toISOString().split('T')[0] }
function emptyForm() {
  return { name: '', balance_CLP: '', targetAmount_CLP: '', annualReturn: '', type: 'savings' as SavingsItem['type'], institution: '', notes: '' }
}

export function SavingsTab() {
  const { savings, addSavings, updateSavings, deleteSavings, savingsTransactions, addSavingsTransaction, deleteSavingsTransaction } = useStore()
  const { clp } = useFmt()

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<SavingsItem | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm())

  const [quickId, setQuickId] = useState<string | null>(null)
  const [quickType, setQuickType] = useState<'deposit' | 'withdrawal'>('deposit')
  const [quickAmount, setQuickAmount] = useState('')
  const [quickDate, setQuickDate] = useState(today())
  const [quickNotes, setQuickNotes] = useState('')

  const [expandedId, setExpandedId] = useState<string | null>(null)

  const totalBalance = savings.reduce((sum, s) => sum + s.balance_CLP, 0)
  const totalTarget  = savings.reduce((sum, s) => sum + s.targetAmount_CLP, 0)

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

  function openQuick(savingsId: string, type: 'deposit' | 'withdrawal') {
    setExpandedId(null)
    setQuickId(savingsId); setQuickType(type)
    setQuickAmount(''); setQuickDate(today()); setQuickNotes('')
  }

  function submitQuick(e: React.FormEvent) {
    e.preventDefault()
    if (!quickId || !quickAmount) return
    addSavingsTransaction({ savingsItemId: quickId, type: quickType, amount_CLP: parseFloat(quickAmount) || 0, date: quickDate, notes: quickNotes.trim() || undefined })
    setQuickId(null)
  }

  function getTxForSavings(id: string) {
    return savingsTransactions.filter(t => t.savingsItemId === id).sort((a, b) => b.date.localeCompare(a.date))
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Ahorros e Inversiones</h2>
          <p className="text-sm text-gray-500">{savings.length} ítems</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={15} /> Nuevo</button>
      </div>

      {/* Totales */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="stat-card">
          <div className="stat-label text-green-600">Total acumulado</div>
          <div className="stat-value text-green-600">{clp(totalBalance)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Meta total</div>
          <div className="stat-value">
            {clp(totalTarget)}
            {totalTarget > 0 && <span className="text-sm text-gray-400 font-normal ml-2">{((totalBalance / totalTarget) * 100).toFixed(1)}%</span>}
          </div>
        </div>
      </div>

      {savings.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">Agrega tus cuentas de ahorro e inversiones</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {savings.map(s => {
            const pct      = s.targetAmount_CLP > 0 ? Math.min(100, (s.balance_CLP / s.targetAmount_CLP) * 100) : 0
            const typeInfo = TYPES.find(t => t.value === s.type)
            const txList   = getTxForSavings(s.id)
            const isExpanded  = expandedId === s.id
            const isQuickOpen = quickId === s.id

            return (
              <div key={s.id} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

                {/* Cuerpo compacto */}
                <div style={{ padding: '14px 14px 10px' }}>

                  {/* Fila superior: nombre + acciones */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</p>
                      {s.institution && <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{s.institution}</p>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginLeft: 6, flexShrink: 0 }}>
                      <span className={`badge ${typeInfo?.color}`} style={{ fontSize: 10 }}>{typeInfo?.label}</span>
                      <button className="btn btn-secondary" style={{ padding: '2px 5px' }} onClick={() => openEdit(s)}><Pencil size={10} /></button>
                      <button className="btn btn-danger"    style={{ padding: '2px 5px' }} onClick={() => setConfirmId(s.id)}><Trash2 size={10} /></button>
                    </div>
                  </div>

                  {/* Saldo */}
                  <p style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', lineHeight: 1.2, marginBottom: 6 }}>{clp(s.balance_CLP)}</p>

                  {/* Barra de progreso */}
                  {s.targetAmount_CLP > 0 && (
                    <div style={{ marginBottom: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', marginBottom: 3 }}>
                        <span>Meta: {clp(s.targetAmount_CLP)}</span>
                        <span>{pct.toFixed(1)}%</span>
                      </div>
                      <div style={{ height: 4, background: '#f1f5f9', borderRadius: 9999 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: '#22c55e', borderRadius: 9999, transition: 'width 0.4s' }} />
                      </div>
                    </div>
                  )}

                  {/* Stats mini */}
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#64748b', marginBottom: 10 }}>
                    {s.annualReturn > 0 && <span style={{ color: '#16a34a', fontWeight: 600 }}>{s.annualReturn}% anual</span>}
                    {s.notes && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{s.notes}</span>}
                  </div>

                  {/* Botones de acción */}
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <button
                      className="btn btn-success"
                      style={{ fontSize: 11, padding: '4px 8px', fontWeight: 600, opacity: isQuickOpen && quickType === 'deposit' ? 0.6 : 1 }}
                      onClick={() => isQuickOpen && quickType === 'deposit' ? setQuickId(null) : openQuick(s.id, 'deposit')}
                    >
                      <ArrowDownCircle size={11} /> Dep.
                    </button>
                    <button
                      style={{
                        display: 'flex', alignItems: 'center', gap: 3,
                        padding: '4px 8px', borderRadius: 7, border: 'none', cursor: 'pointer',
                        fontSize: 11, fontWeight: 600,
                        background: '#fee2e2', color: '#dc2626',
                        opacity: isQuickOpen && quickType === 'withdrawal' ? 0.6 : 1,
                      }}
                      onClick={() => isQuickOpen && quickType === 'withdrawal' ? setQuickId(null) : openQuick(s.id, 'withdrawal')}
                    >
                      <ArrowUpCircle size={11} /> Ret.
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ marginLeft: 'auto', padding: '4px 7px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}
                      onClick={() => { setQuickId(null); setExpandedId(isExpanded ? null : s.id) }}
                    >
                      {txList.length > 0 && (
                        <span style={{ background: '#e2e8f0', borderRadius: 9999, padding: '0 5px', fontSize: 10, fontWeight: 700 }}>
                          {txList.length}
                        </span>
                      )}
                      {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    </button>
                  </div>
                </div>

                {/* Panel depósito / retiro */}
                {isQuickOpen && (
                  <div style={{
                    borderTop: `2px solid ${quickType === 'deposit' ? '#22c55e' : '#ef4444'}`,
                    background: quickType === 'deposit' ? '#f0fdf4' : '#fef2f2',
                    padding: '12px 14px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 12, color: quickType === 'deposit' ? '#15803d' : '#dc2626' }}>
                        {quickType === 'deposit' ? '＋ Depositar' : '− Retirar'}
                      </span>
                      <button onClick={() => setQuickId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2, display: 'flex' }}>
                        <X size={13} />
                      </button>
                    </div>
                    <form onSubmit={submitQuick} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div>
                          <label className="label" style={{ fontSize: 10 }}>Monto (CLP) *</label>
                          <input className="input" type="number" min="1" required autoFocus value={quickAmount} onChange={e => setQuickAmount(e.target.value)} placeholder="100000" style={{ fontSize: 12, padding: '5px 8px' }} />
                        </div>
                        <div>
                          <label className="label" style={{ fontSize: 10 }}>Fecha</label>
                          <input className="input" type="date" value={quickDate} onChange={e => setQuickDate(e.target.value)} style={{ fontSize: 12, padding: '5px 8px' }} />
                        </div>
                      </div>
                      <div>
                        <label className="label" style={{ fontSize: 10 }}>Nota (opcional)</label>
                        <input className="input" value={quickNotes} onChange={e => setQuickNotes(e.target.value)} placeholder="Cuota mensual, bono…" style={{ fontSize: 12, padding: '5px 8px' }} />
                      </div>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => setQuickId(null)}>Cancelar</button>
                        <button type="submit" className={quickType === 'deposit' ? 'btn btn-success' : 'btn btn-danger'} style={{ fontSize: 11, padding: '4px 10px', fontWeight: 700 }}>
                          Confirmar
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Historial */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #e2e8f0', background: '#f8fafc', flex: 1 }}>
                    <div style={{ padding: '8px 14px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Movimientos</span>
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>{txList.length} registro{txList.length !== 1 ? 's' : ''}</span>
                    </div>
                    {txList.length === 0 ? (
                      <p style={{ color: '#94a3b8', fontSize: 11, padding: '6px 14px 12px' }}>Sin movimientos aún.</p>
                    ) : (
                      <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                        {txList.map(tx => (
                          <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{
                              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: tx.type === 'deposit' ? '#dcfce7' : '#fee2e2',
                            }}>
                              {tx.type === 'deposit'
                                ? <ArrowDownCircle size={11} style={{ color: '#16a34a' }} />
                                : <ArrowUpCircle   size={11} style={{ color: '#dc2626' }} />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: tx.type === 'deposit' ? '#15803d' : '#dc2626' }}>
                                {tx.type === 'deposit' ? '+' : '−'}{clp(tx.amount_CLP)}
                              </div>
                              {tx.notes && <div style={{ fontSize: 10, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.notes}</div>}
                            </div>
                            <div style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0 }}>
                              {new Date(tx.date + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                            </div>
                            <button
                              onClick={() => deleteSavingsTransaction(tx.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: 2, flexShrink: 0, display: 'flex' }}
                              onMouseOver={e => (e.currentTarget.style.color = '#ef4444')}
                              onMouseOut={e  => (e.currentTarget.style.color = '#cbd5e1')}
                            >
                              <X size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal nuevo / editar */}
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
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">{editing ? 'Guardar' : 'Agregar'}</button>
            </div>
          </form>
        </Modal>
      )}

      {confirmId && (
        <ConfirmDialog
          message={`¿Eliminar "${savings.find(s => s.id === confirmId)?.name}"? También se eliminarán todos sus movimientos.`}
          onConfirm={() => { deleteSavings(confirmId!); setConfirmId(null) }}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}
