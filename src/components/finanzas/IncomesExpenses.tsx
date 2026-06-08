import { useState } from 'react'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { useStore } from '../../store'
import { useFmt } from '../../hooks/useExchangeRate'
import { Modal } from '../shared/Modal'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import type { IncomeItem, ExpenseItem, FinanceFrequency } from '../../types'

const FREQUENCIES: { value: FinanceFrequency; label: string; monthlyFactor: number }[] = [
  { value: 'monthly', label: 'Mensual', monthlyFactor: 1 },
  { value: 'biweekly', label: 'Quincenal', monthlyFactor: 2 },
  { value: 'weekly', label: 'Semanal', monthlyFactor: 4.33 },
  { value: 'annual', label: 'Anual', monthlyFactor: 1 / 12 },
  { value: 'one_time', label: 'Único', monthlyFactor: 0 },
]

const EXPENSE_CATEGORIES: { value: ExpenseItem['category']; label: string }[] = [
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

export function toMonthly(amount: number, freq: FinanceFrequency): number {
  const f = FREQUENCIES.find(x => x.value === freq)
  return amount * (f?.monthlyFactor ?? 1)
}

export function IncomesExpenses() {
  const { incomes, expenses, addIncome, updateIncome, deleteIncome, addExpense, updateExpense, deleteExpense } = useStore()
  const { clp } = useFmt()
  const [tab, setTab] = useState<'income' | 'expense'>('income')
  const [showForm, setShowForm] = useState(false)
  const [editingIncome, setEditingIncome] = useState<IncomeItem | null>(null)
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const [incomeForm, setIncomeForm] = useState({ name: '', amount_CLP: '', frequency: 'monthly' as FinanceFrequency, type: 'fixed' as 'fixed' | 'variable', source: '', active: true })
  const [expenseForm, setExpenseForm] = useState({ name: '', amount_CLP: '', frequency: 'monthly' as FinanceFrequency, type: 'fixed' as 'fixed' | 'variable', category: 'other' as ExpenseItem['category'], active: true })

  const totalMonthlyIncome = incomes.filter(i => i.active).reduce((sum, i) => sum + toMonthly(i.amount_CLP, i.frequency), 0)
  const totalMonthlyExpense = expenses.filter(e => e.active).reduce((sum, e) => sum + toMonthly(e.amount_CLP, e.frequency), 0)
  const balance = totalMonthlyIncome - totalMonthlyExpense

  function openAddIncome() { setIncomeForm({ name: '', amount_CLP: '', frequency: 'monthly', type: 'fixed', source: '', active: true }); setEditingIncome(null); setTab('income'); setShowForm(true) }
  function openAddExpense() { setExpenseForm({ name: '', amount_CLP: '', frequency: 'monthly', type: 'fixed', category: 'other', active: true }); setEditingExpense(null); setTab('expense'); setShowForm(true) }
  function openEditIncome(i: IncomeItem) { setIncomeForm({ name: i.name, amount_CLP: String(i.amount_CLP), frequency: i.frequency, type: i.type, source: i.source, active: i.active }); setEditingIncome(i); setTab('income'); setShowForm(true) }
  function openEditExpense(e: ExpenseItem) { setExpenseForm({ name: e.name, amount_CLP: String(e.amount_CLP), frequency: e.frequency, type: e.type, category: e.category, active: e.active }); setEditingExpense(e); setTab('expense'); setShowForm(true) }

  function handleSubmitIncome(ev: React.FormEvent) {
    ev.preventDefault()
    const data = { ...incomeForm, amount_CLP: parseFloat(incomeForm.amount_CLP) || 0 }
    if (editingIncome) updateIncome(editingIncome.id, data)
    else addIncome(data)
    setShowForm(false)
  }

  function handleSubmitExpense(ev: React.FormEvent) {
    ev.preventDefault()
    const data = { ...expenseForm, amount_CLP: parseFloat(expenseForm.amount_CLP) || 0 }
    if (editingExpense) updateExpense(editingExpense.id, data)
    else addExpense(data)
    setShowForm(false)
  }

  return (
    <div>
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <div className="stat-label text-green-600">Ingresos mensuales</div>
          <div className="stat-value text-green-600">{clp(totalMonthlyIncome)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label text-red-500">Gastos mensuales</div>
          <div className="stat-value text-red-600">{clp(totalMonthlyExpense)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Balance neto</div>
          <div className={`stat-value ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{clp(balance)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-lg" style={{ width: 'fit-content' }}>
        <button className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === 'income' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`} onClick={() => setTab('income')}>Ingresos ({incomes.length})</button>
        <button className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === 'expense' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`} onClick={() => setTab('expense')}>Gastos ({expenses.length})</button>
      </div>

      {tab === 'income' && (
        <div>
          <div className="flex justify-end mb-3">
            <button className="btn btn-primary" onClick={openAddIncome}><Plus size={16} /> Nuevo ingreso</button>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {incomes.length === 0 ? <div className="py-12 text-center text-gray-400">Agrega tus fuentes de ingreso</div> : (
              <table>
                <thead><tr><th>Nombre</th><th>Fuente</th><th>Tipo</th><th>Frecuencia</th><th style={{ textAlign: 'right' }}>Monto</th><th style={{ textAlign: 'right' }}>Mensual equiv.</th><th>Estado</th><th></th></tr></thead>
                <tbody>
                  {incomes.map(i => (
                    <tr key={i.id}>
                      <td className="font-medium">{i.name}</td>
                      <td className="text-gray-500">{i.source}</td>
                      <td><span className={`badge ${i.type === 'fixed' ? 'badge-blue' : 'badge-yellow'}`}>{i.type === 'fixed' ? 'Fijo' : 'Variable'}</span></td>
                      <td>{FREQUENCIES.find(f => f.value === i.frequency)?.label}</td>
                      <td style={{ textAlign: 'right' }}>{clp(i.amount_CLP)}</td>
                      <td style={{ textAlign: 'right' }} className="font-semibold text-green-600">{clp(toMonthly(i.amount_CLP, i.frequency))}</td>
                      <td><span className={`badge ${i.active ? 'badge-green' : 'badge-gray'}`}>{i.active ? 'Activo' : 'Inactivo'}</span></td>
                      <td><div className="flex gap-2 justify-end"><button className="btn btn-secondary" style={{ padding: '5px 8px' }} onClick={() => openEditIncome(i)}><Pencil size={12} /></button><button className="btn btn-danger" style={{ padding: '5px 8px' }} onClick={() => setConfirmId(i.id)}><Trash2 size={12} /></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'expense' && (
        <div>
          <div className="flex justify-end mb-3">
            <button className="btn btn-primary" onClick={openAddExpense}><Plus size={16} /> Nuevo gasto</button>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {expenses.length === 0 ? <div className="py-12 text-center text-gray-400">Agrega tus gastos fijos y variables</div> : (
              <table>
                <thead><tr><th>Nombre</th><th>Categoría</th><th>Tipo</th><th>Frecuencia</th><th style={{ textAlign: 'right' }}>Monto</th><th style={{ textAlign: 'right' }}>Mensual equiv.</th><th>Estado</th><th></th></tr></thead>
                <tbody>
                  {expenses.map(e => (
                    <tr key={e.id}>
                      <td className="font-medium">{e.name}</td>
                      <td><span className="badge badge-gray">{EXPENSE_CATEGORIES.find(c => c.value === e.category)?.label}</span></td>
                      <td><span className={`badge ${e.type === 'fixed' ? 'badge-blue' : 'badge-yellow'}`}>{e.type === 'fixed' ? 'Fijo' : 'Variable'}</span></td>
                      <td>{FREQUENCIES.find(f => f.value === e.frequency)?.label}</td>
                      <td style={{ textAlign: 'right' }}>{clp(e.amount_CLP)}</td>
                      <td style={{ textAlign: 'right' }} className="font-semibold text-red-600">{clp(toMonthly(e.amount_CLP, e.frequency))}</td>
                      <td><span className={`badge ${e.active ? 'badge-green' : 'badge-gray'}`}>{e.active ? 'Activo' : 'Inactivo'}</span></td>
                      <td><div className="flex gap-2 justify-end"><button className="btn btn-secondary" style={{ padding: '5px 8px' }} onClick={() => openEditExpense(e)}><Pencil size={12} /></button><button className="btn btn-danger" style={{ padding: '5px 8px' }} onClick={() => setConfirmId(e.id)}><Trash2 size={12} /></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Income form */}
      {showForm && tab === 'income' && (
        <Modal title={editingIncome ? 'Editar ingreso' : 'Nuevo ingreso'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmitIncome} className="flex flex-col gap-4">
            <div><label className="label">Nombre *</label><input className="input" required value={incomeForm.name} onChange={e => setIncomeForm(f => ({ ...f, name: e.target.value }))} placeholder="Sueldo, arriendo, dividendo…" /></div>
            <div><label className="label">Fuente</label><input className="input" value={incomeForm.source} onChange={e => setIncomeForm(f => ({ ...f, source: e.target.value }))} placeholder="Empresa, cliente, banco…" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Monto (CLP) *</label><input className="input" type="number" min="0" required value={incomeForm.amount_CLP} onChange={e => setIncomeForm(f => ({ ...f, amount_CLP: e.target.value }))} /></div>
              <div><label className="label">Frecuencia</label><select className="input" value={incomeForm.frequency} onChange={e => setIncomeForm(f => ({ ...f, frequency: e.target.value as FinanceFrequency }))}>{FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Tipo</label><select className="input" value={incomeForm.type} onChange={e => setIncomeForm(f => ({ ...f, type: e.target.value as 'fixed' | 'variable' }))}><option value="fixed">Fijo</option><option value="variable">Variable</option></select></div>
              <div className="flex items-end pb-1"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={incomeForm.active} onChange={e => setIncomeForm(f => ({ ...f, active: e.target.checked }))} /> Activo</label></div>
            </div>
            <div className="flex gap-3 justify-end pt-2"><button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button><button type="submit" className="btn btn-primary">{editingIncome ? 'Guardar' : 'Agregar'}</button></div>
          </form>
        </Modal>
      )}

      {/* Expense form */}
      {showForm && tab === 'expense' && (
        <Modal title={editingExpense ? 'Editar gasto' : 'Nuevo gasto'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmitExpense} className="flex flex-col gap-4">
            <div><label className="label">Nombre *</label><input className="input" required value={expenseForm.name} onChange={e => setExpenseForm(f => ({ ...f, name: e.target.value }))} placeholder="Arriendo, dividendo auto, Netflix…" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Monto (CLP) *</label><input className="input" type="number" min="0" required value={expenseForm.amount_CLP} onChange={e => setExpenseForm(f => ({ ...f, amount_CLP: e.target.value }))} /></div>
              <div><label className="label">Categoría</label><select className="input" value={expenseForm.category} onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value as ExpenseItem['category'] }))}>{EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Frecuencia</label><select className="input" value={expenseForm.frequency} onChange={e => setExpenseForm(f => ({ ...f, frequency: e.target.value as FinanceFrequency }))}>{FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}</select></div>
              <div><label className="label">Tipo</label><select className="input" value={expenseForm.type} onChange={e => setExpenseForm(f => ({ ...f, type: e.target.value as 'fixed' | 'variable' }))}><option value="fixed">Fijo</option><option value="variable">Variable</option></select></div>
            </div>
            <div className="flex items-center gap-2"><input type="checkbox" id="exp-active" checked={expenseForm.active} onChange={e => setExpenseForm(f => ({ ...f, active: e.target.checked }))} /><label htmlFor="exp-active" className="text-sm">Activo</label></div>
            <div className="flex gap-3 justify-end pt-2"><button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button><button type="submit" className="btn btn-primary">{editingExpense ? 'Guardar' : 'Agregar'}</button></div>
          </form>
        </Modal>
      )}

      {confirmId && (
        <ConfirmDialog
          message="¿Eliminar este ítem?"
          onConfirm={() => {
            if (tab === 'income') deleteIncome(confirmId!)
            else deleteExpense(confirmId!)
            setConfirmId(null)
          }}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}
