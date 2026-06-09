import { useStore } from '../../store'
import { useFmt } from '../../hooks/useExchangeRate'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { BarChart2 } from 'lucide-react'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

export function PdVAnalysisTab() {
  const { stores, products, sales, stock } = useStore()
  const { clp, usdToClp } = useFmt()

  const activeStores = stores.filter(s => s.active)

  const storeData = activeStores.map((store, idx) => {
    const storeSales = sales.filter(s => s.storeId === store.id)
    const totalRevenue = storeSales.reduce((sum, s) => sum + s.quantity * s.salePrice_CLP, 0)
    const totalUnits = storeSales.reduce((sum, s) => sum + s.quantity, 0)

    // Average margin
    const margins = storeSales
      .map(s => {
        const prod = products.find(p => p.id === s.productId)
        if (!prod || !s.salePrice_CLP) return null
        const cost = usdToClp(prod.costFOB_USD)
        return (s.salePrice_CLP - cost) / s.salePrice_CLP * 100
      })
      .filter((m): m is number => m !== null)
    const avgMargin = margins.length > 0 ? margins.reduce((a, b) => a + b, 0) / margins.length : 0

    // Top product by revenue
    const productRevMap: Record<string, number> = {}
    storeSales.forEach(s => {
      productRevMap[s.productId] = (productRevMap[s.productId] ?? 0) + s.quantity * s.salePrice_CLP
    })
    const topProductId = Object.entries(productRevMap).sort((a, b) => b[1] - a[1])[0]?.[0]
    const topProduct = products.find(p => p.id === topProductId)

    // Stock valor total
    const storeStock = stock.filter(e => e.storeId === store.id)
    const stockValue = storeStock.reduce((sum, e) => sum + e.quantity * e.salePrice_CLP, 0)

    return {
      id: store.id,
      name: store.name,
      totalRevenue,
      totalUnits,
      avgMargin,
      topProduct: topProduct?.name ?? '—',
      stockValue,
      color: COLORS[idx % COLORS.length],
    }
  })

  const chartData = storeData.map(d => ({ name: d.name, Ventas: d.totalRevenue }))

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Análisis por Punto de Venta</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Comparativa de rendimiento entre puntos de venta</p>
      </div>

      {activeStores.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
          <BarChart2 size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ fontWeight: 500 }}>Sin puntos de venta activos</p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
            <table>
              <thead>
                <tr>
                  <th>Punto de Venta</th>
                  <th style={{ textAlign: 'right' }}>Total Ventas (CLP)</th>
                  <th style={{ textAlign: 'center' }}>Unidades</th>
                  <th style={{ textAlign: 'right' }}>Margen prom.</th>
                  <th>Top producto</th>
                  <th style={{ textAlign: 'right' }}>Valor stock</th>
                </tr>
              </thead>
              <tbody>
                {storeData.map(row => (
                  <tr key={row.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: row.color, flexShrink: 0 }} />
                        <span style={{ fontWeight: 500, color: 'var(--text-1)' }}>{row.name}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#15803d' }}>{clp(row.totalRevenue)}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{row.totalUnits}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{
                        fontWeight: 600,
                        color: row.avgMargin > 30 ? '#16a34a' : row.avgMargin > 15 ? '#d97706' : '#dc2626'
                      }}>
                        {row.avgMargin > 0 ? `${row.avgMargin.toFixed(1)}%` : '—'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{row.topProduct}</td>
                    <td style={{ textAlign: 'right', color: '#1d4ed8', fontWeight: 600 }}>{clp(row.stockValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Chart */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, color: 'var(--text-1)' }}>Comparativa de ingresos por PdV</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(Number(v) / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => clp(Number(v))} />
                <Bar dataKey="Ventas" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}
