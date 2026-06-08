import { useStore } from '../../store'
import { useFmt } from '../../hooks/useExchangeRate'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Package, Store, TrendingUp, DollarSign } from 'lucide-react'

export function DashboardImportadora() {
  const { products, stores, sales, stock } = useStore()
  const { clp, rate } = useFmt()

  // Ventas últimos 30 días agrupadas por día
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const recentSales = sales.filter(s => new Date(s.date) >= thirtyDaysAgo)
  const totalRevenue30 = recentSales.reduce((sum, s) => sum + s.quantity * s.salePrice_CLP, 0)
  const totalUnits30 = recentSales.reduce((sum, s) => sum + s.quantity, 0)

  // Alertas stock bajo
  const lowStockCount = stock.filter(e => e.quantity <= e.minStock && e.quantity > 0).length
  const outStockCount = stock.filter(e => e.quantity === 0).length

  // Top productos por ingresos
  const revenueByProduct = products.map(p => {
    const rev = recentSales.filter(s => s.productId === p.id).reduce((sum, s) => sum + s.quantity * s.salePrice_CLP, 0)
    return { name: p.name.length > 18 ? p.name.slice(0, 18) + '…' : p.name, ingresos: rev }
  }).filter(r => r.ingresos > 0).sort((a, b) => b.ingresos - a.ingresos).slice(0, 8)

  // Ventas por día (últimos 14 días)
  const salesByDay: Record<string, number> = {}
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i))
    return d.toISOString().split('T')[0]
  })
  last14.forEach(d => { salesByDay[d] = 0 })
  recentSales.forEach(s => { if (salesByDay[s.date] !== undefined) salesByDay[s.date] += s.quantity * s.salePrice_CLP })
  const dailyData = last14.map(d => ({ dia: d.slice(5), ventas: salesByDay[d] }))

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Dashboard Importadora</h2>
        <p className="text-sm text-gray-500 mt-0.5">Dólar hoy (BCC): <strong>{clp(rate)}</strong></p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="stat-card flex items-center gap-4">
          <div className="rounded-xl p-3" style={{ background: '#dbeafe' }}><Package size={22} color="#1d4ed8" /></div>
          <div>
            <div className="stat-label">Productos</div>
            <div className="stat-value">{products.length}</div>
          </div>
        </div>
        <div className="stat-card flex items-center gap-4">
          <div className="rounded-xl p-3" style={{ background: '#dcfce7' }}><Store size={22} color="#15803d" /></div>
          <div>
            <div className="stat-label">Tiendas activas</div>
            <div className="stat-value">{stores.filter(s => s.active).length}</div>
          </div>
        </div>
        <div className="stat-card flex items-center gap-4">
          <div className="rounded-xl p-3" style={{ background: '#fef9c3' }}><TrendingUp size={22} color="#a16207" /></div>
          <div>
            <div className="stat-label">Unidades vendidas (30d)</div>
            <div className="stat-value">{totalUnits30}</div>
          </div>
        </div>
        <div className="stat-card flex items-center gap-4">
          <div className="rounded-xl p-3" style={{ background: '#dcfce7' }}><DollarSign size={22} color="#15803d" /></div>
          <div>
            <div className="stat-label">Ingresos (30d)</div>
            <div className="stat-value text-green-600" style={{ fontSize: 18 }}>{clp(totalRevenue30)}</div>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {(lowStockCount > 0 || outStockCount > 0) && (
        <div className="mb-6 flex gap-3">
          {outStockCount > 0 && <div className="badge badge-red px-4 py-2 text-sm">⚠ {outStockCount} posición(es) sin stock</div>}
          {lowStockCount > 0 && <div className="badge badge-yellow px-4 py-2 text-sm">⚠ {lowStockCount} posición(es) con stock bajo mínimo</div>}
        </div>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Ventas diarias (últimos 14 días)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => clp(v).replace('$', '$').replace(/\.000$/, 'k')} width={80} />
              <Tooltip formatter={(v) => clp(Number(v))} />
              <Bar dataKey="ventas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Top productos por ingreso (30d)</h3>
          {revenueByProduct.length === 0
            ? <div className="flex items-center justify-center h-48 text-gray-300 text-sm">Sin ventas registradas</div>
            : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={revenueByProduct} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `$${Math.round(Number(v) / 1000)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip formatter={(v) => clp(Number(v))} />
                  <Bar dataKey="ingresos" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </div>
      </div>
    </div>
  )
}
