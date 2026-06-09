import { useState, useRef, useEffect, useCallback } from 'react'
import { useExchangeRate } from './hooks/useExchangeRate'
import { useStore } from './store'
import { DashboardImportadora } from './components/importadora/DashboardImportadora'
import { ProductsTab } from './components/importadora/ProductsTab'
import { PuntosDeVentaTab } from './components/importadora/PuntosDeVentaTab'
import { InventoryTab } from './components/importadora/InventoryTab'
import { SalesTab } from './components/importadora/SalesTab'
import { ProjectionTab } from './components/importadora/ProjectionTab'
import { BusinessFinanceTab } from './components/importadora/BusinessFinanceTab'
import { PurchaseOrdersTab } from './components/importadora/PurchaseOrdersTab'
import { PdVAnalysisTab } from './components/importadora/PdVAnalysisTab'
import { DashboardFinanzas } from './components/finanzas/DashboardFinanzas'
import { MonthlyBalance } from './components/finanzas/MonthlyBalance'
import { DebtsTab } from './components/finanzas/DebtsTab'
import { SavingsTab } from './components/finanzas/SavingsTab'
import { ExpenseLogTab } from './components/finanzas/ExpenseLogTab'
import { CashflowProjection } from './components/finanzas/CashflowProjection'
import {
  BarChart2, Package, MapPin, Grid3X3, TrendingUp, TrendingDown,
  CreditCard, PiggyBank, Receipt, LineChart, Building2, Wallet,
  Download, Upload, DollarSign, Moon, Sun, Bell, Search, X,
  ClipboardList, LayoutDashboard, Menu
} from 'lucide-react'
import './index.css'

type MainTab = 'importadora' | 'finanzas'
type ImportadoraSubTab = 'dashboard' | 'products' | 'stores' | 'inventory' | 'sales' | 'projection' | 'bizfinance' | 'orders' | 'pdvanalysis'
type FinanzasSubTab = 'dashboard' | 'incomes' | 'logs' | 'debts' | 'savings' | 'projection'

const importadoraTabs: { id: ImportadoraSubTab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Resumen', icon: <BarChart2 size={15} /> },
  { id: 'products', label: 'Productos', icon: <Package size={15} /> },
  { id: 'stores', label: 'Puntos de Venta', icon: <MapPin size={15} /> },
  { id: 'inventory', label: 'Inventario', icon: <Grid3X3 size={15} /> },
  { id: 'sales', label: 'Ventas', icon: <TrendingUp size={15} /> },
  { id: 'projection', label: 'Proyección stock', icon: <TrendingDown size={15} /> },
  { id: 'bizfinance', label: 'Estado Result.', icon: <DollarSign size={15} /> },
  { id: 'orders', label: 'Órdenes', icon: <ClipboardList size={15} /> },
  { id: 'pdvanalysis', label: 'Análisis PdV', icon: <BarChart2 size={15} /> },
]

const finanzasTabs: { id: FinanzasSubTab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Resumen', icon: <LayoutDashboard size={15} /> },
  { id: 'incomes', label: 'Ingresos & Gastos', icon: <Wallet size={15} /> },
  { id: 'logs', label: 'Registro gastos', icon: <Receipt size={15} /> },
  { id: 'debts', label: 'Deudas', icon: <CreditCard size={15} /> },
  { id: 'savings', label: 'Ahorros & Inversiones', icon: <PiggyBank size={15} /> },
  { id: 'projection', label: 'Flujo 5 años', icon: <LineChart size={15} /> },
]

const STORE_KEY = 'crm-importadora-v1'

function exportData() {
  const data = localStorage.getItem(STORE_KEY)
  if (!data) return alert('No hay datos para exportar.')
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `crm-backup-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function importData(file: File) {
  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target?.result as string
    try {
      JSON.parse(content)
      if (!confirm('¿Reemplazar todos los datos actuales con el backup? Esta acción no se puede deshacer.')) return
      localStorage.setItem(STORE_KEY, content)
      window.location.reload()
    } catch {
      alert('Archivo inválido. Asegúrate de subir un backup generado por esta app.')
    }
  }
  reader.readAsText(file)
}

export default function App() {
  useExchangeRate()
  const { settings, updateSettings, stock, debtInstallments, products, stores } = useStore()

  const [mainTab, setMainTab] = useState<MainTab>('importadora')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importadoraTab, setImportadoraTab] = useState<ImportadoraSubTab>('dashboard')
  const [finanzasTab, setFinanzasTab] = useState<FinanzasSubTab>('dashboard')

  // Business name edit
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(settings.businessName)

  // Sidebar mobile
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Alerts dropdown
  const [showAlerts, setShowAlerts] = useState(false)
  const alertsRef = useRef<HTMLDivElement>(null)

  // Search
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const subTabs = mainTab === 'importadora' ? importadoraTabs : finanzasTabs
  const activeSubTab = mainTab === 'importadora' ? importadoraTab : finanzasTab
  const setSubTab = mainTab === 'importadora'
    ? (id: string) => { setImportadoraTab(id as ImportadoraSubTab); setSidebarOpen(false) }
    : (id: string) => { setFinanzasTab(id as FinanzasSubTab); setSidebarOpen(false) }

  // Dark mode effect
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }, [settings.darkMode])

  // Alert counts
  const todayString = new Date().toISOString().split('T')[0]
  const overdueCount = debtInstallments.filter(i => !i.paid && i.dueDate < todayString).length
  const lowStockCount = stock.filter(e => e.quantity <= e.minStock && e.quantity > 0).length
  const outStockCount = stock.filter(e => e.quantity === 0).length
  const totalAlerts = overdueCount + lowStockCount + outStockCount

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (alertsRef.current && !alertsRef.current.contains(e.target as Node)) setShowAlerts(false)
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearch(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Search results
  const searchResults = useCallback(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    const results: { label: string; sub: string; onClick: () => void }[] = []
    products.forEach(p => {
      if (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)) {
        results.push({
          label: p.name,
          sub: `Producto · ${p.sku} · ${p.category}`,
          onClick: () => { setMainTab('importadora'); setImportadoraTab('products'); setSearchQuery(''); setShowSearch(false) }
        })
      }
    })
    stores.forEach(s => {
      if (s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q)) {
        results.push({
          label: s.name,
          sub: `Punto de Venta · ${s.city}`,
          onClick: () => { setMainTab('importadora'); setImportadoraTab('stores'); setSearchQuery(''); setShowSearch(false) }
        })
      }
    })
    return results.slice(0, 8)
  }, [searchQuery, products, stores])

  const results = searchResults()

  const headerBg = settings.darkMode ? '#0f172a' : '#1e293b'
  const sidebarBg = settings.darkMode ? '#1e293b' : 'white'
  const sidebarBorder = settings.darkMode ? '#334155' : '#e2e8f0'
  const activeTabBg = settings.darkMode ? '#1e3a8a' : '#eff6ff'
  const activeTabColor = settings.darkMode ? '#93c5fd' : '#1d4ed8'
  const inactiveTabColor = settings.darkMode ? '#64748b' : '#64748b'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Top bar */}
      <header style={{ background: headerBg, color: 'white', padding: '0 16px', display: 'flex', alignItems: 'center', height: 56, flexShrink: 0, gap: 0, position: 'sticky', top: 0, zIndex: 100 }}>
        {/* Hamburger (mobile) */}
        <button
          className="hide-desktop"
          onClick={() => setSidebarOpen(o => !o)}
          style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '6px', marginRight: 8, display: 'none' }}
          aria-label="Menu"
        >
          <Menu size={20} />
        </button>
        <style>{`@media (max-width: 768px) { .hide-desktop { display: flex !important; } }`}</style>

        {/* Logo + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 24, flexShrink: 0 }}>
          <div style={{ width: 30, height: 30, background: '#3b82f6', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BarChart2 size={16} color="white" />
          </div>
          {editingName ? (
            <form onSubmit={e => { e.preventDefault(); updateSettings({ businessName: nameInput }); setEditingName(false) }} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                autoFocus
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, color: 'white', padding: '4px 8px', fontSize: 14, fontWeight: 700, width: 160, outline: 'none' }}
              />
              <button type="submit" style={{ background: '#3b82f6', border: 'none', borderRadius: 6, color: 'white', padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}>✓</button>
              <button type="button" onClick={() => { setEditingName(false); setNameInput(settings.businessName) }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, color: '#94a3b8', padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}>✕</button>
            </form>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.3px' }}>{settings.businessName}</span>
              <button
                onClick={() => { setNameInput(settings.businessName); setEditingName(true) }}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                title="Renombrar"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
            </div>
          )}
        </div>

        {/* Main tabs */}
        <div style={{ display: 'flex', gap: 2, flex: 1 }} className="hide-mobile">
          <button
            onClick={() => setMainTab('importadora')}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.15s', background: mainTab === 'importadora' ? '#3b82f6' : 'transparent', color: mainTab === 'importadora' ? 'white' : '#94a3b8' }}
          >
            <Building2 size={15} /> Control Inventario
          </button>
          <button
            onClick={() => setMainTab('finanzas')}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.15s', background: mainTab === 'finanzas' ? '#3b82f6' : 'transparent', color: mainTab === 'finanzas' ? 'white' : '#94a3b8' }}
          >
            <Wallet size={15} /> Finanzas Personales
          </button>
        </div>

        {/* Right side: search, alerts, dark mode, export/import */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 'auto' }}>
          {/* Global search */}
          <div ref={searchRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowSearch(s => !s)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center' }}
              title="Buscar"
            >
              <Search size={16} />
            </button>
            {showSearch && (
              <div style={{ position: 'absolute', right: 0, top: '110%', background: settings.darkMode ? '#1e293b' : 'white', border: `1px solid ${settings.darkMode ? '#334155' : '#e2e8f0'}`, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', width: 320, zIndex: 200 }}>
                <div style={{ padding: '10px 12px', borderBottom: `1px solid ${settings.darkMode ? '#334155' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Search size={14} color="#94a3b8" />
                  <input
                    autoFocus
                    placeholder="Buscar productos, PdV..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ background: 'none', border: 'none', outline: 'none', flex: 1, fontSize: 13, color: settings.darkMode ? '#f1f5f9' : '#0f172a' }}
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}><X size={12} /></button>
                  )}
                </div>
                {results.length > 0 ? (
                  <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                    {results.map((r, i) => (
                      <button
                        key={i}
                        onClick={r.onClick}
                        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 14px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 2, borderBottom: `1px solid ${settings.darkMode ? '#334155' : '#f1f5f9'}` }}
                        onMouseOver={e => (e.currentTarget.style.background = settings.darkMode ? '#334155' : '#f8fafc')}
                        onMouseOut={e => (e.currentTarget.style.background = 'none')}
                      >
                        <span style={{ fontSize: 13, fontWeight: 500, color: settings.darkMode ? '#f1f5f9' : '#0f172a' }}>{r.label}</span>
                        <span style={{ fontSize: 11, color: '#64748b' }}>{r.sub}</span>
                      </button>
                    ))}
                  </div>
                ) : searchQuery.trim() ? (
                  <div style={{ padding: '16px 14px', fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>Sin resultados</div>
                ) : (
                  <div style={{ padding: '12px 14px', fontSize: 12, color: '#94a3b8' }}>Escribe para buscar productos o puntos de venta</div>
                )}
              </div>
            )}
          </div>

          {/* Alerts bell */}
          <div ref={alertsRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowAlerts(s => !s)}
              style={{ background: 'none', border: 'none', color: totalAlerts > 0 ? '#f87171' : '#94a3b8', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', position: 'relative' }}
              title="Alertas"
            >
              <Bell size={16} />
              {totalAlerts > 0 && (
                <span style={{
                  position: 'absolute', top: 2, right: 2, background: '#ef4444', color: 'white',
                  borderRadius: 9999, fontSize: 9, fontWeight: 700, minWidth: 14, height: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2px',
                  lineHeight: 1,
                }}>{totalAlerts > 99 ? '99+' : totalAlerts}</span>
              )}
            </button>
            {showAlerts && (
              <div style={{ position: 'absolute', right: 0, top: '110%', background: settings.darkMode ? '#1e293b' : 'white', border: `1px solid ${settings.darkMode ? '#334155' : '#e2e8f0'}`, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', width: 260, zIndex: 200 }}>
                <div style={{ padding: '12px 14px', borderBottom: `1px solid ${settings.darkMode ? '#334155' : '#e2e8f0'}`, fontWeight: 700, fontSize: 13, color: settings.darkMode ? '#f1f5f9' : '#0f172a' }}>Alertas</div>
                <div style={{ padding: '8px 0' }}>
                  {totalAlerts === 0 ? (
                    <div style={{ padding: '12px 14px', fontSize: 13, color: '#94a3b8' }}>Sin alertas pendientes ✓</div>
                  ) : (
                    <>
                      {overdueCount > 0 && (
                        <div
                          onClick={() => { setMainTab('finanzas'); setFinanzasTab('debts'); setShowAlerts(false) }}
                          style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderBottom: `1px solid ${settings.darkMode ? '#334155' : '#f1f5f9'}` }}
                          onMouseOver={e => (e.currentTarget.style.background = settings.darkMode ? '#334155' : '#f8fafc')}
                          onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <span style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 9999, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{overdueCount}</span>
                          <span style={{ fontSize: 13, color: settings.darkMode ? '#f1f5f9' : '#374151' }}>cuota{overdueCount > 1 ? 's' : ''} vencida{overdueCount > 1 ? 's' : ''}</span>
                        </div>
                      )}
                      {lowStockCount > 0 && (
                        <div
                          onClick={() => { setMainTab('importadora'); setImportadoraTab('inventory'); setShowAlerts(false) }}
                          style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderBottom: `1px solid ${settings.darkMode ? '#334155' : '#f1f5f9'}` }}
                          onMouseOver={e => (e.currentTarget.style.background = settings.darkMode ? '#334155' : '#f8fafc')}
                          onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <span style={{ background: '#fef9c3', color: '#a16207', borderRadius: 9999, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{lowStockCount}</span>
                          <span style={{ fontSize: 13, color: settings.darkMode ? '#f1f5f9' : '#374151' }}>producto{lowStockCount > 1 ? 's' : ''} con stock bajo</span>
                        </div>
                      )}
                      {outStockCount > 0 && (
                        <div
                          onClick={() => { setMainTab('importadora'); setImportadoraTab('inventory'); setShowAlerts(false) }}
                          style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                          onMouseOver={e => (e.currentTarget.style.background = settings.darkMode ? '#334155' : '#f8fafc')}
                          onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <span style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 9999, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{outStockCount}</span>
                          <span style={{ fontSize: 13, color: settings.darkMode ? '#f1f5f9' : '#374151' }}>producto{outStockCount > 1 ? 's' : ''} agotado{outStockCount > 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Dark mode toggle */}
          <button
            onClick={() => updateSettings({ darkMode: !settings.darkMode })}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center' }}
            title={settings.darkMode ? 'Modo claro' : 'Modo oscuro'}
          >
            {settings.darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Export / Import */}
          <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) importData(f); e.target.value = '' }} />
          <button
            onClick={exportData}
            title="Exportar datos como JSON"
            className="hide-mobile"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', fontSize: 12, fontWeight: 500, background: 'transparent', color: '#94a3b8', transition: 'all 0.15s' }}
            onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = 'white'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.4)' }}
            onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = '#94a3b8'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)' }}
          >
            <Download size={13} /> Backup
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Importar datos desde JSON"
            className="hide-mobile"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', fontSize: 12, fontWeight: 500, background: 'transparent', color: '#94a3b8', transition: 'all 0.15s' }}
            onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = 'white'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.4)' }}
            onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = '#94a3b8'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)' }}
          >
            <Upload size={13} /> Restaurar
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar overlay (mobile) */}
        {sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <nav className={`sidebar${sidebarOpen ? ' open' : ''}`} style={{ background: sidebarBg, borderRight: `1px solid ${sidebarBorder}` }}>
          {/* Mobile: main tab switcher */}
          <div style={{ display: 'none', marginBottom: 12, gap: 4 }} className="mobile-tab-switcher">
            <style>{`@media (max-width: 768px) { .mobile-tab-switcher { display: flex !important; flex-direction: column; } }`}</style>
            <button
              onClick={() => { setMainTab('importadora'); setSidebarOpen(false) }}
              style={{ padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, textAlign: 'left', background: mainTab === 'importadora' ? '#3b82f6' : 'transparent', color: mainTab === 'importadora' ? 'white' : '#64748b' }}
            >
              <Building2 size={14} style={{ display: 'inline', marginRight: 6 }} />Control Inventario
            </button>
            <button
              onClick={() => { setMainTab('finanzas'); setSidebarOpen(false) }}
              style={{ padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, textAlign: 'left', background: mainTab === 'finanzas' ? '#3b82f6' : 'transparent', color: mainTab === 'finanzas' ? 'white' : '#64748b', marginBottom: 8 }}
            >
              <Wallet size={14} style={{ display: 'inline', marginRight: 6 }} />Finanzas Personales
            </button>
          </div>
          {subTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, textAlign: 'left', marginBottom: 2, transition: 'all 0.15s',
                background: activeSubTab === tab.id ? activeTabBg : 'transparent',
                color: activeSubTab === tab.id ? activeTabColor : inactiveTabColor,
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Main content */}
        <main className="main-content" style={{ flex: 1, padding: 28, overflowY: 'auto', minWidth: 0 }}>
          {mainTab === 'importadora' && (
            <>
              {importadoraTab === 'dashboard' && <DashboardImportadora />}
              {importadoraTab === 'products' && <ProductsTab />}
              {importadoraTab === 'stores' && <PuntosDeVentaTab />}
              {importadoraTab === 'inventory' && <InventoryTab />}
              {importadoraTab === 'sales' && <SalesTab />}
              {importadoraTab === 'projection' && <ProjectionTab />}
              {importadoraTab === 'bizfinance' && <BusinessFinanceTab />}
              {importadoraTab === 'orders' && <PurchaseOrdersTab />}
              {importadoraTab === 'pdvanalysis' && <PdVAnalysisTab />}
            </>
          )}
          {mainTab === 'finanzas' && (
            <>
              {finanzasTab === 'dashboard' && <DashboardFinanzas />}
              {finanzasTab === 'incomes' && <MonthlyBalance />}
              {finanzasTab === 'logs' && <ExpenseLogTab />}
              {finanzasTab === 'debts' && <DebtsTab />}
              {finanzasTab === 'savings' && <SavingsTab />}
              {finanzasTab === 'projection' && <CashflowProjection />}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
