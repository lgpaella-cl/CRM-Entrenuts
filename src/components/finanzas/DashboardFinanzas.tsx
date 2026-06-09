import { useStore } from '../../store'
import { useFmt } from '../../hooks/useExchangeRate'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { TrendingDown, TrendingUp, CreditCard, PiggyBank, Calendar } from 'lucide-react'

function sumSection(items: { amount_CLP: number }[]) {
  return items.reduce((s, i) => s + i.amount_CLP, 0)
}

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function formatYM(ym: string) {
  const [, m] = ym.split('-')
  return MONTH_NAMES[parseInt(m) - 1] ?? ym
}

export function DashboardFinanzas() {
  const { monthlyRecords, debts, savings, debtInstallments } = useStore()
  const { clp } = useFmt()

  // Latest monthly record
  const sorted = [...monthlyRecords].sort((a, b) => b.yearMonth.localeCompare(a.yearMonth))
  const latest = sorted[0]

  const monthlyIncome = latest ? sumSection(latest.incomes) : 0
  const monthlyFixed = latest ? sumSection(latest.fixedExpenses) : 0
  const monthlyVariable = latest ? sumSection(latest.variableExpenses) : 0
  const monthlyInvestments = latest ? sumSection(latest.investments) : 0

  // Monthly debt payments
  const todayYM = new Date().toISOString().slice(0, 7)
  const monthlyDebts = debtInstallments
    .filter(i => i.dueDate.startsWith(todayYM))
    .reduce((s, i) => s + i.amount_CLP, 0)

  const freeFlow = monthlyIncome - monthlyFixed - monthlyVariable - monthlyInvestments - monthlyDebts

  // Totals
  const totalDebt = debts.reduce((s, d) => s + d.balance_CLP, 0)
  const totalSavings = savings.reduce((s, sv) => s + sv.balance_CLP, 0)

  // Next 5 upcoming installments
  const today = new Date().toISOString().split('T')[0]
  const upcoming = debtInstallments
    .filter(i => !i.paid && i.dueDate >= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5)

  // Last 6 monthly records for chart
  const last6 = sorted.slice(0, 6).reverse()
  const chartData = last6.map(r => {
    const income = sumSection(r.incomes)
    const expenses = sumSection(r.fixedExpenses) + sumSection(r.variableExpenses) + sumSection(r.investments)
    const debtsPaid = debtInstallments
      .filter(i => i.paid && i.dueDate.startsWith(r.yearMonth))
      .reduce((s, i) => s + i.amount_CLP, 0)
    return {
      name: formatYM(r.yearMonth),
      Ingresos: income,
      Gastos: expenses + debtsPaid,
      Neto: income - expenses - debtsPaid,
    }
  })

  const statCards = [
    { label: 'Ingreso mensual', value: monthlyIncome, icon: <TrendingUp size={18} />, color: '#16a34a', bg: '#dcfce7' },
    { label: 'Gastos fijos', value: monthlyFixed + monthlyVariable, icon: <TrendingDown size={18} />, color: '#dc2626', bg: '#fee2e2' },
    { label: 'Deuda total', value: totalDebt, icon: <CreditCard size={18} />, color: '#d97706', bg: '#fef9c3' },
    { label: 'Patrimonio', value: totalSavings, icon: <PiggyBank size={18} />, color: '#1d4ed8', bg: '#dbeafe' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-1)', marginBottom: 4 }}>Resumen Financiero Personal</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {latest ? `Datos del mes ${latest.yearMonth}` : 'Sin datos. Agrega un balance mensual.'}
        </p>
      </div>

      {/* 4 stat cards */}
      <div className="grid grid-cols-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {statCards.map((c, i) => (
          <div key={i} className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-label">{c.label}</div>
                <div className="stat-value" style={{ color: c.color, fontSize: 20 }}>{clp(c.value)}</div>
              </div>
              <div style={{ background: c.bg, color: c.color, borderRadius: 10, padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {c.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Flujo libre */}
      <div style={{
        background: freeFlow >= 0 ? '#f0fdf4' : '#fef2f2',
        border: `1.5px solid ${freeFlow >= 0 ? '#bbf7d0' : '#fecaca'}`,
        borderRadius: 12, padding: '16px 20px', marginBottom: 24,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: freeFlow >= 0 ? '#15803d' : '#dc2626' }}>Flujo libre estimado del mes</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
            Ingresos − Gastos fijos − Gastos variables − Inversiones − Cuotas deudas
          </div>
        </div>
        <div style={{ fontSize: 26, fontWeight: 900, color: freeFlow >= 0 ? '#15803d' : '#dc2626' }}>
          {clp(freeFlow)}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
        {/* Chart */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, color: 'var(--text-1)' }}>Balance últimos meses</div>
          {chartData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>Sin datos de meses anteriores</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(Number(v) / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => clp(Number(v))} />
                <Bar dataKey="Ingresos" fill="#4ade80" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Gastos" fill="#f87171" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Neto" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Upcoming installments */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={15} /> Próximas cuotas
          </div>
          {upcoming.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>Sin cuotas pendientes</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {upcoming.map(inst => {
                const debt = useStore.getState().debts.find(d => d.id === inst.debtId)
                const isOverdue = inst.dueDate < today
                return (
                  <div key={inst.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 10px', borderRadius: 8,
                    background: isOverdue ? '#fef2f2' : 'var(--bg-secondary)',
                    border: `1px solid ${isOverdue ? '#fecaca' : 'var(--border)'}`,
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{debt?.name ?? 'Deuda'}</div>
                      <div style={{ fontSize: 11, color: isOverdue ? '#dc2626' : 'var(--text-muted)' }}>
                        {isOverdue ? '⚠ Vencida · ' : ''}{new Date(inst.dueDate + 'T12:00:00').toLocaleDateString('es-CL')}
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: isOverdue ? '#dc2626' : 'var(--text-1)' }}>
                      {clp(inst.amount_CLP)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
