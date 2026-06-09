export interface AppSettings {
  businessName: string
  darkMode: boolean
  availableBalance_CLP: number   // saldo disponible en cuenta (actualizable desde dashboard)
}

export interface Product {
  id: string
  sku: string
  name: string
  description: string
  category: string
  costFCA_USD: number   // Free Carrier, costo en origen
  costFOB_USD: number   // Free On Board, incluye flete a puerto
  unit: string          // unidad de medida: caja, pieza, kg, etc.
  imageUrl?: string
  createdAt: string
  updatedAt: string
}

export interface Store {
  id: string
  name: string
  address: string
  city: string
  contactName: string
  contactPhone: string
  active: boolean
  commissionPct?: number   // % de comisión que cobra el PdV sobre la venta
}

export interface StockEntry {
  id: string
  productId: string
  storeId: string
  quantity: number
  minStock: number       // stock mínimo para alerta
  costPrice_CLP?: number // precio al que yo le entrego el producto al PdV
  salePrice_CLP: number  // precio de venta al público en este PdV
  updatedAt: string
}

export interface SaleRecord {
  id: string
  productId: string
  storeId: string
  quantity: number
  salePrice_CLP: number
  date: string
  notes?: string
}

export interface PurchaseOrder {
  id: string
  productId: string
  quantity: number
  costFOB_USD: number
  costTotal_USD: number
  status: 'pending' | 'in_transit' | 'received'
  orderDate: string
  estimatedArrival?: string
  notes?: string
}

// ── Finanzas Personales ─────────────────────────────────────────

export type FinanceFrequency = 'monthly' | 'biweekly' | 'weekly' | 'annual' | 'one_time'

export interface IncomeItem {
  id: string
  name: string
  amount_CLP: number
  frequency: FinanceFrequency
  type: 'fixed' | 'variable'
  source: string
  active: boolean
}

export interface ExpenseItem {
  id: string
  name: string
  amount_CLP: number
  frequency: FinanceFrequency
  category: 'housing' | 'transport' | 'food' | 'health' | 'education' | 'entertainment' | 'subscriptions' | 'business' | 'other'
  type: 'fixed' | 'variable'
  active: boolean
}

export interface ExpenseLog {
  id: string
  expenseCategoryId?: string
  name: string
  amount_CLP: number
  date: string
  category: ExpenseItem['category']
  notes?: string
}

export interface Debt {
  id: string
  name: string
  institution: string
  principal_CLP: number        // deuda original
  balance_CLP: number          // saldo actual
  monthlyPayment_CLP: number
  interestRate: number         // tasa mensual %
  startDate: string
  endDate: string              // fecha término estimada
  type: 'mortgage' | 'consumer' | 'credit_card' | 'car' | 'other'
  totalInstallments?: number   // si se usa sistema de cuotas
}

export interface DebtInstallment {
  id: string
  debtId: string
  number: number       // #1, #2, …
  dueDate: string      // "2026-08-01"
  amount_CLP: number
  paid: boolean
}

export interface SavingsItem {
  id: string
  name: string
  balance_CLP: number
  targetAmount_CLP: number
  annualReturn: number         // % rentabilidad anual
  type: 'savings' | 'investment' | 'emergency' | 'retirement'
  institution: string
  notes?: string
}

// ── Finanzas del Negocio ────────────────────────────────────────

export interface BusinessExpense {
  id: string
  name: string
  amount_CLP: number
  category: 'fixed' | 'variable' | 'other'
  yearMonth: string   // "2026-06"
}

export interface ExchangeRate {
  date: string
  usdToCLP: number
  lastUpdated: string
}

// ── Balance Mensual ─────────────────────────────────────────────

export interface MonthLineItem {
  id: string
  name: string
  amount_CLP: number
}

export type MonthSection = 'incomes' | 'fixedExpenses' | 'variableExpenses' | 'investments'

export interface MonthlyFinanceRecord {
  id: string
  yearMonth: string   // "2026-06"
  incomes: MonthLineItem[]
  fixedExpenses: MonthLineItem[]
  variableExpenses: MonthLineItem[]
  investments: MonthLineItem[]
  notes: string
  createdAt: string
}
