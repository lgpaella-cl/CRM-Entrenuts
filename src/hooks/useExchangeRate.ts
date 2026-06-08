import { useEffect } from 'react'
import { useStore } from '../store'

const PROXY_URL = 'https://mindicador.cl/api/dolar'

export function useExchangeRate() {
  const { exchangeRate, setExchangeRate } = useStore()

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    if (exchangeRate?.date === today) return

    fetch(PROXY_URL)
      .then(r => r.json())
      .then(data => {
        const valor = data?.serie?.[0]?.valor
        if (valor) {
          setExchangeRate({
            date: today,
            usdToCLP: valor,
            lastUpdated: new Date().toISOString(),
          })
        }
      })
      .catch(() => {
        // fallback: conserva el último valor conocido
      })
  }, [exchangeRate, setExchangeRate])

  return exchangeRate?.usdToCLP ?? 950
}

export function useFmt() {
  const rate = useExchangeRate()

  const clp = (amount: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount)

  const usd = (amount: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount)

  const usdToClp = (usdAmount: number) => usdAmount * rate

  const pct = (value: number) => `${value.toFixed(1)}%`

  return { clp, usd, usdToClp, rate, pct }
}
