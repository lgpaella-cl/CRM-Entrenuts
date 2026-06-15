import type { ExpenseItem } from '../types'

export const EXPENSE_CATEGORIES: {
  value: ExpenseItem['category']
  label: string
  color: string
  emoji: string
}[] = [
  { value: 'housing',       label: 'Vivienda',        color: '#6366f1', emoji: '🏠' },
  { value: 'transport',     label: 'Transporte',      color: '#f59e0b', emoji: '🚗' },
  { value: 'food',          label: 'Alimentación',    color: '#10b981', emoji: '🍽️' },
  { value: 'health',        label: 'Salud',           color: '#ef4444', emoji: '🏥' },
  { value: 'education',     label: 'Educación',       color: '#3b82f6', emoji: '📚' },
  { value: 'entertainment', label: 'Entretenimiento', color: '#ec4899', emoji: '🎬' },
  { value: 'subscriptions', label: 'Suscripciones',   color: '#8b5cf6', emoji: '📱' },
  { value: 'business',      label: 'Negocio',         color: '#0ea5e9', emoji: '💼' },
  { value: 'leisure',       label: 'Ocio',            color: '#f97316', emoji: '🎉' },
  { value: 'tc_billing',    label: 'Gasto TC x Fact.', color: '#e11d48', emoji: '💳' },
  { value: 'sport',         label: 'Deporte',         color: '#22c55e', emoji: '🏋️' },
  { value: 'supermarket',   label: 'Supermercado',    color: '#14b8a6', emoji: '🛒' },
  { value: 'restaurant',    label: 'Restoranes',      color: '#fb923c', emoji: '🍴' },
  { value: 'other',         label: 'Otro',            color: '#94a3b8', emoji: '📦' },
]

export function getCatInfo(value: ExpenseItem['category'] | undefined) {
  return EXPENSE_CATEGORIES.find(c => c.value === value)
    ?? { value: 'other' as ExpenseItem['category'], label: 'Sin categoría', color: '#cbd5e1', emoji: '—' }
}
