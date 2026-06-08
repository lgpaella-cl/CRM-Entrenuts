import { useStore } from '../../store'
import { useFmt } from '../../hooks/useExchangeRate'
import { toMonthly } from './IncomesExpenses'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

function formatMillions(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}k`
  return `$${v}`
}

export function CashflowProjection() {
  const { incomes, expenses, debts, savings } = useStore()
  const { clp } = useFmt()

  const monthlyIncome = incomes.filter(i => i.active).reduce((sum, i) => sum + toMonthly(i.amount_CLP, i.frequency), 0)
  const monthlyExpenses = expenses.filter(e => e.active).reduce((sum, e) => sum + toMonthly(e.amount_CLP, e.frequency), 0)
  const monthlyDebtPayments = debts.reduce((sum, d) => sum + d.monthlyPayment_CLP, 0)
  const netMonthly = monthlyIncome - monthlyExpenses - monthlyDebtPayments
  const currentSavingsBalance = savings.reduce((sum, s) => sum + s.balance_CLP, 0)
  const avgSavingsReturn = savings.length > 0 ? savings.reduce((sum, s) => sum + s.annualReturn, 0) / savings.length : 5

  // Generar 60 meses (5 años)
  const now = new Date()
  const data = Array.from({ length: 61 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const label = date.toLocaleDateString('es-CL', { year: '2-digit', month: 'short' })

    // Acumulado neto (sin inversión)
    const acumulado = netMonthly * i

    // Ahorros proyectados con rentabilidad compuesta mensual
    const monthlyReturn = avgSavingsReturn / 100 / 12
    const savingsProjected = currentSavingsBalance * Math.pow(1 + monthlyReturn, i) + (netMonthly > 0 ? netMonthly * ((Math.pow(1 + monthlyReturn, i) - 1) / monthlyReturn) : 0)

    // Deuda restante simplificada
    const debtBalance = Math.max(0, debts.reduce((sum, d) => sum + Math.max(0, d.balance_CLP - d.monthlyPayment_CLP * i), 0))

    return { mes: label, acumulado: Math.round(acumulado), patrimonio: Math.round(savingsProjected), deuda: Math.round(debtBalance) }
  })

  // Milestones
  const debtFreeMonth = data.findIndex(d => d.deuda === 0)
  const firstMillion = data.findIndex(d => d.patrimonio >= 1_000_000_000)
  const firstHundredM = data.findIndex(d => d.patrimonio >= 100_000_000)

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Proyección de Flujo a 5 Años</h2>
        <p className="text-sm text-gray-500 mt-0.5">Basado en tus ingresos, gastos, deudas y rentabilidad promedio de ahorros</p>
      </div>

      {/* Supuestos */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="stat-label text-green-600">Ingreso mensual</div>
          <div className="stat-value text-green-600" style={{ fontSize: 18 }}>{clp(monthlyIncome)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label text-red-500">Egreso mensual</div>
          <div className="stat-value text-red-600" style={{ fontSize: 18 }}>{clp(monthlyExpenses + monthlyDebtPayments)}</div>
          <div className="text-xs text-gray-400">gastos + cuotas</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Flujo neto mensual</div>
          <div className={`stat-value ${netMonthly >= 0 ? 'text-green-600' : 'text-red-600'}`} style={{ fontSize: 18 }}>{clp(netMonthly)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Rentab. promedio ahorros</div>
          <div className="stat-value">{avgSavingsReturn.toFixed(1)}%</div>
          <div className="text-xs text-gray-400">anual</div>
        </div>
      </div>

      {/* Milestones */}
      {(debtFreeMonth > 0 || firstHundredM > 0 || firstMillion > 0) && (
        <div className="flex gap-3 mb-6 flex-wrap">
          {debtFreeMonth > 0 && debtFreeMonth < 60 && <div className="badge badge-green px-4 py-2 text-sm">🎯 Libre de deudas: mes {debtFreeMonth}</div>}
          {firstHundredM > 0 && firstHundredM < 60 && <div className="badge badge-blue px-4 py-2 text-sm">💰 $100M en patrimonio: mes {firstHundredM}</div>}
          {firstMillion > 0 && firstMillion < 60 && <div className="badge badge-yellow px-4 py-2 text-sm">🚀 $1B en patrimonio: mes {firstMillion}</div>}
        </div>
      )}

      {/* Gráfico patrimonio */}
      <div className="card mb-6">
        <h3 className="font-semibold text-gray-800 mb-4">Patrimonio proyectado (con reinversión)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="gradPatrimonio" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradDeuda" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="mes" tick={{ fontSize: 10 }} interval={5} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={formatMillions} />
            <Tooltip formatter={(v) => clp(Number(v))} />
            <Legend />
            <Area type="monotone" dataKey="patrimonio" name="Patrimonio (c/rentab.)" stroke="#10b981" fill="url(#gradPatrimonio)" strokeWidth={2} />
            <Area type="monotone" dataKey="deuda" name="Deuda pendiente" stroke="#ef4444" fill="url(#gradDeuda)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico flujo acumulado */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4">Flujo neto acumulado (sin reinversión)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="gradAcum" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="mes" tick={{ fontSize: 10 }} interval={5} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={formatMillions} />
            <Tooltip formatter={(v) => clp(Number(v))} />
            <Area type="monotone" dataKey="acumulado" name="Flujo acumulado" stroke="#3b82f6" fill="url(#gradAcum)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-400 mt-3">* Supone ingresos y gastos constantes. Ajusta tus datos periódicamente para mantener la proyección actualizada.</p>
      </div>
    </div>
  )
}
