import { useState, useRef } from 'react'
import { useExchangeRate } from './hooks/useExchangeRate'
import { DashboardImportadora } from './components/importadora/DashboardImportadora'
import { ProductsTab } from './components/importadora/ProductsTab'
import { StoresTab } from './components/importadora/StoresTab'
import { InventoryTab } from './components/importadora/InventoryTab'
import { SalesTab } from './components/importadora/SalesTab'
import { ProjectionTab } from './components/importadora/ProjectionTab'
import { MonthlyBalance } from './components/finanzas/MonthlyBalance'
import { DebtsTab } from './components/finanzas/DebtsTab'
import { SavingsTab } from './components/finanzas/SavingsTab'
import { ExpenseLogTab } from './components/finanzas/ExpenseLogTab'
import { CashflowProjection } from './components/finanzas/CashflowProjection'
import { BarChart2, Package, Store, Grid3X3, TrendingUp, TrendingDown, CreditCard, PiggyBank, Receipt, LineChart, Building2, Wallet, Download, Upload } from 'lucide-react'
import './index.css'

type MainTab = 'importadora' | 'finanzas'
type ImportadoraSubTab = 'dashboard' | 'products' | 'stores' | 'inventory' | 'sales' | 'projection'
type FinanzasSubTab = 'incomes' | 'logs' | 'debts' | 'savings' | 'projection'

const importadoraTabs: { id: ImportadoraSubTab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Resumen', icon: <BarChart2 size={15} /> },
  { id: 'products', label: 'Productos', icon: <Package size={15} /> },
  { id: 'stores', label: 'Tiendas', icon: <Store size={15} /> },
  { id: 'inventory', label: 'Inventario', icon: <Grid3X3 size={15} /> },
  { id: 'sales', label: 'Ventas', icon: <TrendingUp size={15} /> },
  { id: 'projection', label: 'Proyección stock', icon: <TrendingDown size={15} /> },
]

const finanzasTabs: { id: FinanzasSubTab; label: string; icon: React.ReactNode }[] = [
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
  const [mainTab, setMainTab] = useState<MainTab>('importadora')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importadoraTab, setImportadoraTab] = useState<ImportadoraSubTab>('dashboard')
  const [finanzasTab, setFinanzasTab] = useState<FinanzasSubTab>('incomes')

  const subTabs = mainTab === 'importadora' ? importadoraTabs : finanzasTabs
  const activeSubTab = mainTab === 'importadora' ? importadoraTab : finanzasTab
  const setSubTab = mainTab === 'importadora'
    ? (id: string) => setImportadoraTab(id as ImportadoraSubTab)
    : (id: string) => setFinanzasTab(id as FinanzasSubTab)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <header style={{ background: '#1e293b', color: 'white', padding: '0 24px', display: 'flex', alignItems: 'center', height: 56, flexShrink: 0, gap: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 32 }}>
          <div style={{ width: 30, height: 30, background: '#3b82f6', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart2 size={16} color="white" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.3px' }}>CRM Control</span>
        </div>
        <div style={{ display: 'flex', gap: 2, flex: 1 }}>
          <button
            onClick={() => setMainTab('importadora')}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.15s', background: mainTab === 'importadora' ? '#3b82f6' : 'transparent', color: mainTab === 'importadora' ? 'white' : '#94a3b8' }}
          >
            <Building2 size={15} /> Importadora
          </button>
          <button
            onClick={() => setMainTab('finanzas')}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.15s', background: mainTab === 'finanzas' ? '#3b82f6' : 'transparent', color: mainTab === 'finanzas' ? 'white' : '#94a3b8' }}
          >
            <Wallet size={15} /> Finanzas Personales
          </button>
        </div>

        {/* Export / Import */}
        <div style={{ display: 'flex', gap: 6, marginLeft: 16 }}>
          <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) importData(f); e.target.value = '' }} />
          <button
            onClick={exportData}
            title="Exportar datos como JSON"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', fontSize: 12, fontWeight: 500, background: 'transparent', color: '#94a3b8', transition: 'all 0.15s' }}
            onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = 'white'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.4)' }}
            onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = '#94a3b8'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)' }}
          >
            <Download size={13} /> Backup
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Importar datos desde JSON"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', fontSize: 12, fontWeight: 500, background: 'transparent', color: '#94a3b8', transition: 'all 0.15s' }}
            onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = 'white'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.4)' }}
            onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = '#94a3b8'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)' }}
          >
            <Upload size={13} /> Restaurar
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar */}
        <nav style={{ width: 210, background: 'white', borderRight: '1px solid #e2e8f0', padding: '16px 12px', flexShrink: 0 }}>
          {subTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, textAlign: 'left', marginBottom: 2, transition: 'all 0.15s',
                background: activeSubTab === tab.id ? '#eff6ff' : 'transparent',
                color: activeSubTab === tab.id ? '#1d4ed8' : '#64748b',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Main content */}
        <main style={{ flex: 1, padding: 28, overflowY: 'auto', minWidth: 0 }}>
          {mainTab === 'importadora' && (
            <>
              {importadoraTab === 'dashboard' && <DashboardImportadora />}
              {importadoraTab === 'products' && <ProductsTab />}
              {importadoraTab === 'stores' && <StoresTab />}
              {importadoraTab === 'inventory' && <InventoryTab />}
              {importadoraTab === 'sales' && <SalesTab />}
              {importadoraTab === 'projection' && <ProjectionTab />}
            </>
          )}
          {mainTab === 'finanzas' && (
            <>
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
