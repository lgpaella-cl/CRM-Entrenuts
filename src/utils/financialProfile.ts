import type { SavingsItem, Debt, MonthlyFinanceRecord, FinancialGoal } from '../types'

export interface FinancialProfile {
  generatedAt: string
  summary: {
    netWorth: number
    totalAssets: number
    totalLiabilities: number
    monthlyIncome: number
    monthlyExpenses: number
    monthlyInvestments: number
    savingsRate: number
    debtRatio: number
    emergencyFundMonths: number
  }
  savings: { name: string; type: string; balance: number; target: number; annualReturn: number }[]
  debts: { name: string; type: string; balance: number; monthlyPayment: number; rate: number }[]
  recentMonths: { month: string; income: number; fixed: number; variable: number; investments: number }[]
  goals: FinancialGoal[]
}

function sum(items: { amount_CLP: number }[]) {
  return items.reduce((s, i) => s + i.amount_CLP, 0)
}

export function buildFinancialProfile(
  savings: SavingsItem[],
  debts: Debt[],
  monthlyRecords: MonthlyFinanceRecord[],
  goals: FinancialGoal[],
): FinancialProfile {
  const sorted = [...monthlyRecords].sort((a, b) => b.yearMonth.localeCompare(a.yearMonth))
  const latest = sorted[0]

  const totalAssets = savings.reduce((s, sv) => s + sv.balance_CLP, 0)
  const totalLiabilities = debts.reduce((s, d) => s + d.balance_CLP, 0)
  const netWorth = totalAssets - totalLiabilities

  const monthlyIncome = latest ? sum(latest.incomes) : 0
  const monthlyFixed = latest ? sum(latest.fixedExpenses) : 0
  const monthlyVariable = latest ? sum(latest.variableExpenses) : 0
  const monthlyInvestments = latest ? sum(latest.investments) : 0
  const monthlyDebt = debts.reduce((s, d) => s + d.monthlyPayment_CLP, 0)
  const monthlyExpenses = monthlyFixed + monthlyVariable + monthlyDebt

  const savingsRate = monthlyIncome > 0 ? (monthlyInvestments / monthlyIncome) * 100 : 0
  const annualIncome = monthlyIncome * 12
  const debtRatio = annualIncome > 0 ? totalLiabilities / annualIncome : 0

  const liquidSavings = savings
    .filter(s => s.type === 'savings' || s.type === 'emergency')
    .reduce((s, sv) => s + sv.balance_CLP, 0)
  const emergencyFundMonths = monthlyExpenses > 0 ? liquidSavings / monthlyExpenses : 0

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      netWorth, totalAssets, totalLiabilities,
      monthlyIncome, monthlyExpenses, monthlyInvestments,
      savingsRate, debtRatio, emergencyFundMonths,
    },
    savings: savings.map(s => ({
      name: s.name, type: s.type,
      balance: s.balance_CLP, target: s.targetAmount_CLP, annualReturn: s.annualReturn,
    })),
    debts: debts.map(d => ({
      name: d.name, type: d.type,
      balance: d.balance_CLP, monthlyPayment: d.monthlyPayment_CLP, rate: d.interestRate,
    })),
    recentMonths: sorted.slice(0, 6).map(r => ({
      month: r.yearMonth,
      income: sum(r.incomes),
      fixed: sum(r.fixedExpenses),
      variable: sum(r.variableExpenses),
      investments: sum(r.investments),
    })),
    goals,
  }
}

// Prompt listo para enviar a Claude API cuando tengas tu API key
export function buildCoachPrompt(profile: FinancialProfile): string {
  return `Eres un asesor financiero personal experto. Analiza el siguiente perfil financiero y entrega:
1. 5-7 insights específicos y accionables
2. Las 3 principales fortalezas financieras
3. Las 3 principales áreas de mejora con pasos concretos
4. Una recomendación prioritaria para los próximos 90 días

Responde en español, con tono profesional pero cercano. Usa números concretos del perfil.

PERFIL FINANCIERO:
${JSON.stringify(profile, null, 2)}

Formato de respuesta: JSON con claves "insights" (array), "strengths" (array), "improvements" (array), "priority" (string).`
}
