import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Product, Store, StockEntry, SaleRecord, PurchaseOrder,
  IncomeItem, ExpenseItem, ExpenseLog, Debt, SavingsItem, ExchangeRate,
  MonthLineItem, MonthSection, MonthlyFinanceRecord, BusinessExpense, DebtInstallment,
  AppSettings
} from './types'


function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function generateSKU(name: string, existing: Product[]): string {
  const prefix = name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4).padEnd(4, 'X')
  const num = String(existing.length + 1).padStart(4, '0')
  return `${prefix}-${num}`
}

// ── Store shape ──────────────────────────────────────────────────

interface AppState {
  // Settings
  settings: AppSettings
  updateSettings: (data: Partial<AppSettings>) => void

  // Importadora
  products: Product[]
  stores: Store[]
  stock: StockEntry[]
  sales: SaleRecord[]
  orders: PurchaseOrder[]

  // Finanzas
  incomes: IncomeItem[]
  expenses: ExpenseItem[]
  expenseLogs: ExpenseLog[]
  debts: Debt[]
  savings: SavingsItem[]

  // Tipo de cambio
  exchangeRate: ExchangeRate | null

  // Balance mensual
  monthlyRecords: MonthlyFinanceRecord[]

  // Finanzas del negocio
  businessExpenses: BusinessExpense[]

  // Cuotas de deudas
  debtInstallments: DebtInstallment[]

  // ── Productos ──
  addProduct: (data: Omit<Product, 'id' | 'sku' | 'createdAt' | 'updatedAt'>) => void
  updateProduct: (id: string, data: Partial<Product>) => void
  deleteProduct: (id: string) => void

  // ── Tiendas ──
  addStore: (data: Omit<Store, 'id'>) => void
  updateStore: (id: string, data: Partial<Store>) => void
  deleteStore: (id: string) => void

  // ── Stock ──
  setStock: (productId: string, storeId: string, data: Partial<Omit<StockEntry, 'id' | 'productId' | 'storeId'>>) => void

  // ── Ventas ──
  addSale: (data: Omit<SaleRecord, 'id'>) => void
  deleteSale: (id: string) => void

  // ── Órdenes de compra ──
  addOrder: (data: Omit<PurchaseOrder, 'id'>) => void
  updateOrder: (id: string, data: Partial<PurchaseOrder>) => void
  deleteOrder: (id: string) => void

  // ── Ingresos ──
  addIncome: (data: Omit<IncomeItem, 'id'>) => void
  updateIncome: (id: string, data: Partial<IncomeItem>) => void
  deleteIncome: (id: string) => void

  // ── Gastos fijos/variables ──
  addExpense: (data: Omit<ExpenseItem, 'id'>) => void
  updateExpense: (id: string, data: Partial<ExpenseItem>) => void
  deleteExpense: (id: string) => void

  // ── Registro de gastos ──
  addExpenseLog: (data: Omit<ExpenseLog, 'id'>) => void
  deleteExpenseLog: (id: string) => void

  // ── Deudas ──
  addDebt: (data: Omit<Debt, 'id'>) => void
  updateDebt: (id: string, data: Partial<Debt>) => void
  deleteDebt: (id: string) => void

  // ── Ahorros/Inversiones ──
  addSavings: (data: Omit<SavingsItem, 'id'>) => void
  updateSavings: (id: string, data: Partial<SavingsItem>) => void
  deleteSavings: (id: string) => void

  // ── Tipo de cambio ──
  setExchangeRate: (rate: ExchangeRate) => void

  // ── Balance mensual ──
  addMonthlyRecord: (yearMonth: string) => void
  copyMonthlyRecord: (fromYearMonth: string, toYearMonth: string) => void
  deleteMonthlyRecord: (id: string) => void
  addMonthItem: (recordId: string, section: MonthSection, item: Omit<MonthLineItem, 'id'>) => void
  updateMonthItem: (recordId: string, section: MonthSection, itemId: string, name: string, amount: number) => void
  updateMonthItemCategory: (recordId: string, section: MonthSection, itemId: string, category: ExpenseItem['category']) => void
  deleteMonthItem: (recordId: string, section: MonthSection, itemId: string) => void

  // ── Gastos del negocio ──
  addBusinessExpense: (data: Omit<BusinessExpense, 'id'>) => void
  updateBusinessExpense: (id: string, data: Partial<BusinessExpense>) => void
  deleteBusinessExpense: (id: string) => void

  // ── Cuotas de deudas ──
  generateInstallments: (debtId: string, startDate: string, total: number, amount: number) => void
  toggleInstallmentPaid: (installmentId: string) => void
  deleteDebtInstallments: (debtId: string) => void

  // ── Recibir stock de orden ──
  receiveStock: (productId: string, storeId: string, qty: number) => void
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      settings: { businessName: 'CRM Control', darkMode: false, availableBalance_CLP: 0 },
      products: [],
      stores: [],
      stock: [],
      sales: [],
      orders: [],
      incomes: [],
      expenses: [],
      expenseLogs: [],
      debts: [],
      savings: [],
      exchangeRate: null,
      monthlyRecords: [],
      businessExpenses: [],
      debtInstallments: [],

      // Settings
      updateSettings: (data) => set(s => ({ settings: { ...s.settings, ...data } })),

      // Productos
      addProduct: (data) => {
        const products = get().products
        const sku = generateSKU(data.name, products)
        const now = new Date().toISOString()
        set({ products: [...products, { ...data, id: uid(), sku, createdAt: now, updatedAt: now }] })
      },
      updateProduct: (id, data) => set(s => ({
        products: s.products.map(p => p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p)
      })),
      deleteProduct: (id) => set(s => ({ products: s.products.filter(p => p.id !== id) })),

      // Tiendas
      addStore: (data) => set(s => ({ stores: [...s.stores, { ...data, id: uid() }] })),
      updateStore: (id, data) => set(s => ({ stores: s.stores.map(st => st.id === id ? { ...st, ...data } : st) })),
      deleteStore: (id) => set(s => ({ stores: s.stores.filter(st => st.id !== id) })),

      // Stock
      setStock: (productId, storeId, data) => set(s => {
        const existing = s.stock.find(e => e.productId === productId && e.storeId === storeId)
        if (existing) {
          return { stock: s.stock.map(e => e.productId === productId && e.storeId === storeId ? { ...e, ...data, updatedAt: new Date().toISOString() } : e) }
        }
        return { stock: [...s.stock, { id: uid(), productId, storeId, quantity: 0, minStock: 5, costPrice_CLP: 0, salePrice_CLP: 0, ...data, updatedAt: new Date().toISOString() }] }
      }),

      // Ventas
      addSale: (data) => {
        const sale: SaleRecord = { ...data, id: uid() }
        set(s => {
          const updatedStock = s.stock.map(e =>
            e.productId === data.productId && e.storeId === data.storeId
              ? { ...e, quantity: Math.max(0, e.quantity - data.quantity), updatedAt: new Date().toISOString() }
              : e
          )
          return { sales: [...s.sales, sale], stock: updatedStock }
        })
      },
      deleteSale: (id) => set(s => ({ sales: s.sales.filter(sa => sa.id !== id) })),

      // Órdenes
      addOrder: (data) => set(s => ({ orders: [...s.orders, { ...data, id: uid() }] })),
      updateOrder: (id, data) => set(s => ({ orders: s.orders.map(o => o.id === id ? { ...o, ...data } : o) })),
      deleteOrder: (id) => set(s => ({ orders: s.orders.filter(o => o.id !== id) })),

      // Ingresos
      addIncome: (data) => set(s => ({ incomes: [...s.incomes, { ...data, id: uid() }] })),
      updateIncome: (id, data) => set(s => ({ incomes: s.incomes.map(i => i.id === id ? { ...i, ...data } : i) })),
      deleteIncome: (id) => set(s => ({ incomes: s.incomes.filter(i => i.id !== id) })),

      // Gastos
      addExpense: (data) => set(s => ({ expenses: [...s.expenses, { ...data, id: uid() }] })),
      updateExpense: (id, data) => set(s => ({ expenses: s.expenses.map(e => e.id === id ? { ...e, ...data } : e) })),
      deleteExpense: (id) => set(s => ({ expenses: s.expenses.filter(e => e.id !== id) })),

      // Registro gastos
      addExpenseLog: (data) => set(s => ({ expenseLogs: [...s.expenseLogs, { ...data, id: uid() }] })),
      deleteExpenseLog: (id) => set(s => ({ expenseLogs: s.expenseLogs.filter(l => l.id !== id) })),

      // Deudas
      addDebt: (data) => set(s => ({ debts: [...s.debts, { ...data, id: uid() }] })),
      updateDebt: (id, data) => set(s => ({ debts: s.debts.map(d => d.id === id ? { ...d, ...data } : d) })),
      deleteDebt: (id) => set(s => ({ debts: s.debts.filter(d => d.id !== id) })),

      // Ahorros
      addSavings: (data) => set(s => ({ savings: [...s.savings, { ...data, id: uid() }] })),
      updateSavings: (id, data) => set(s => ({ savings: s.savings.map(sv => sv.id === id ? { ...sv, ...data } : sv) })),
      deleteSavings: (id) => set(s => ({ savings: s.savings.filter(sv => sv.id !== id) })),

      // Tipo de cambio
      setExchangeRate: (rate) => set({ exchangeRate: rate }),

      // Balance mensual
      addMonthlyRecord: (yearMonth) => {
        if (get().monthlyRecords.some(r => r.yearMonth === yearMonth)) return
        set(s => ({
          monthlyRecords: [...s.monthlyRecords, {
            id: uid(), yearMonth,
            incomes: [], fixedExpenses: [], variableExpenses: [], investments: [],
            notes: '', createdAt: new Date().toISOString(),
          }]
        }))
      },

      copyMonthlyRecord: (fromYearMonth, toYearMonth) => {
        if (get().monthlyRecords.some(r => r.yearMonth === toYearMonth)) return
        const source = get().monthlyRecords.find(r => r.yearMonth === fromYearMonth)
        if (!source) return
        set(s => ({
          monthlyRecords: [...s.monthlyRecords, {
            id: uid(), yearMonth: toYearMonth,
            incomes: source.incomes.map(i => ({ ...i, id: uid() })),
            fixedExpenses: source.fixedExpenses.map(i => ({ ...i, id: uid() })),
            variableExpenses: source.variableExpenses.map(i => ({ ...i, id: uid() })),
            investments: source.investments.map(i => ({ ...i, id: uid() })),
            notes: source.notes,
            createdAt: new Date().toISOString(),
          }]
        }))
      },

      deleteMonthlyRecord: (id) => set(s => ({ monthlyRecords: s.monthlyRecords.filter(r => r.id !== id) })),

      addMonthItem: (recordId, section, item) => set(s => ({
        monthlyRecords: s.monthlyRecords.map(r =>
          r.id === recordId ? { ...r, [section]: [...r[section], { ...item, id: uid() }] } : r
        )
      })),

      updateMonthItem: (recordId, section, itemId, name, amount) => set(s => ({
        monthlyRecords: s.monthlyRecords.map(r =>
          r.id === recordId
            ? { ...r, [section]: r[section].map(i => i.id === itemId ? { ...i, name, amount_CLP: amount } : i) }
            : r
        )
      })),

      updateMonthItemCategory: (recordId, section, itemId, category) => set(s => ({
        monthlyRecords: s.monthlyRecords.map(r =>
          r.id === recordId
            ? { ...r, [section]: r[section].map(i => i.id === itemId ? { ...i, category } : i) }
            : r
        )
      })),

      deleteMonthItem: (recordId, section, itemId) => set(s => ({
        monthlyRecords: s.monthlyRecords.map(r =>
          r.id === recordId ? { ...r, [section]: r[section].filter(i => i.id !== itemId) } : r
        )
      })),

      // Gastos del negocio
      addBusinessExpense: (data) => set(s => ({ businessExpenses: [...s.businessExpenses, { ...data, id: uid() }] })),
      updateBusinessExpense: (id, data) => set(s => ({ businessExpenses: s.businessExpenses.map(e => e.id === id ? { ...e, ...data } : e) })),
      deleteBusinessExpense: (id) => set(s => ({ businessExpenses: s.businessExpenses.filter(e => e.id !== id) })),

      // Cuotas de deudas
      generateInstallments: (debtId, startDate, total, amount) => set(s => {
        const existing = s.debtInstallments.filter(i => i.debtId !== debtId)
        const [y, m, d] = startDate.split('-').map(Number)
        const newInstallments: DebtInstallment[] = Array.from({ length: total }, (_, n) => {
          // Clamp day to last valid day of each target month to avoid overflow
          // e.g. Jan 31 + 5 months → Jun 30 (not Jul 1)
          const lastDayOfTargetMonth = new Date(y, m + n, 0).getDate()
          const safeDay = Math.min(d || 1, lastDayOfTargetMonth)
          const date = new Date(y, m - 1 + n, safeDay)
          return {
            id: uid(), debtId, number: n + 1,
            dueDate: date.toISOString().split('T')[0],
            amount_CLP: amount, paid: false,
          }
        })
        return { debtInstallments: [...existing, ...newInstallments] }
      }),

      toggleInstallmentPaid: (installmentId) => set(s => {
        const inst = s.debtInstallments.find(i => i.id === installmentId)
        if (!inst) return s
        const updated = s.debtInstallments.map(i => i.id === installmentId ? { ...i, paid: !i.paid } : i)
        const unpaidBalance = updated.filter(i => i.debtId === inst.debtId && !i.paid).reduce((sum, i) => sum + i.amount_CLP, 0)
        const debts = s.debts.map(d => d.id === inst.debtId ? { ...d, balance_CLP: unpaidBalance } : d)
        return { debtInstallments: updated, debts }
      }),

      deleteDebtInstallments: (debtId) => set(s => ({
        debtInstallments: s.debtInstallments.filter(i => i.debtId !== debtId)
      })),

      receiveStock: (productId, storeId, qty) => set(s => {
        const existing = s.stock.find(e => e.productId === productId && e.storeId === storeId)
        if (existing) {
          return {
            stock: s.stock.map(e =>
              e.productId === productId && e.storeId === storeId
                ? { ...e, quantity: e.quantity + qty, updatedAt: new Date().toISOString() }
                : e
            )
          }
        }
        return {
          stock: [...s.stock, {
            id: uid(), productId, storeId,
            quantity: qty, minStock: 5, costPrice_CLP: 0, salePrice_CLP: 0,
            updatedAt: new Date().toISOString()
          }]
        }
      }),
    }),
    { name: 'crm-importadora-v1' }
  )
)
