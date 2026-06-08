# CRM Control — Importadora + Finanzas Personales

## Qué es esto
Aplicación web local (localhost) para gestión de una importadora y finanzas personales personales del dueño. Un solo usuario.

## Stack
- **React + TypeScript + Vite**
- **Tailwind CSS v4** (via `@tailwindcss/vite`)
- **Zustand** con `persist` middleware — todo el estado se guarda en `localStorage` bajo la clave `crm-importadora-v1`
- **Recharts** para gráficos
- **lucide-react** para iconos
- No hay backend. No hay base de datos. No hay autenticación.

## Correr el proyecto
```bash
npm run dev      # http://localhost:5173
npm run build    # build de producción
```

## Estructura de archivos
```
src/
  types.ts                          # Todos los tipos TypeScript (Product, Store, StockEntry, SaleRecord, Debt, etc.)
  store.ts                          # Store global Zustand con persistencia localStorage
  hooks/
    useExchangeRate.ts              # Obtiene USD→CLP desde mindicador.cl, expone useFmt() con helpers clp(), usd(), usdToClp()
  components/
    shared/
      Modal.tsx                     # Modal genérico reutilizable
      ConfirmDialog.tsx             # Dialog de confirmación para eliminar
    importadora/
      DashboardImportadora.tsx      # KPIs, gráficos ventas 14d, top productos
      ProductsTab.tsx               # CRUD productos: SKU auto-generado, costos FCA/FOB USD→CLP
      StoresTab.tsx                 # CRUD tiendas/canales de venta
      InventoryTab.tsx              # Stock por tienda: edición inline, margen %, días de stock, alertas
      SalesTab.tsx                  # Registro ventas: descuenta stock automático, filtros, métricas
      ProjectionTab.tsx             # Proyección reposición: velocidad venta 60d, días restantes, cantidad a pedir
    finanzas/
      IncomesExpenses.tsx           # Ingresos y gastos fijos/variables con equivalente mensual (exporta toMonthly())
      ExpenseLogTab.tsx             # Diario de gastos por categoría, análisis mensual
      DebtsTab.tsx                  # Deudas: barra progreso, cuota, tasa, meses restantes
      SavingsTab.tsx                # Ahorros e inversiones: meta, rentabilidad, proyección 1 año
      CashflowProjection.tsx        # Flujo 5 años (60 meses): patrimonio con rentabilidad compuesta, deuda, milestones
  App.tsx                           # Layout: header (2 tabs principales), sidebar (sub-tabs), router de vistas
  index.css                         # Estilos globales: .card, .input, .label, .btn, .btn-primary/secondary/danger/success, .badge-*, .stat-card, table th/td
```

## Tipos principales (types.ts)
- `Product` — id, sku, name, category, costFCA_USD, costFOB_USD, unit
- `Store` — id, name, city, address, contactName, contactPhone, active
- `StockEntry` — productId + storeId + quantity + minStock + salePrice_CLP
- `SaleRecord` — productId, storeId, quantity, salePrice_CLP, date
- `PurchaseOrder` — productId, quantity, costFOB_USD, status (pending/in_transit/received)
- `IncomeItem` — amount_CLP, frequency (monthly/biweekly/weekly/annual/one_time), type (fixed/variable)
- `ExpenseItem` — igual que IncomeItem + category (housing/transport/food/health/education/entertainment/subscriptions/business/other)
- `ExpenseLog` — gastos individuales registrados con fecha
- `Debt` — principal_CLP, balance_CLP, monthlyPayment_CLP, interestRate, startDate, endDate
- `SavingsItem` — balance_CLP, targetAmount_CLP, annualReturn%, type (savings/investment/emergency/retirement)
- `ExchangeRate` — date, usdToCLP, lastUpdated

## Convenciones
- Montos siempre en CLP salvo los campos explícitamente `_USD`
- `useFmt()` devuelve `{ clp, usd, usdToClp, rate, pct }` — usar siempre para formatear montos
- Tooltip de Recharts: usar `formatter={(v) => clp(Number(v))}` (no `v: number` por typing de la lib)
- Los estilos de clases CSS viven en `index.css` como clases globales — no usar Tailwind inline cuando ya existe una clase equivalente
- SKU se autogenera en el store al crear un producto (4 letras del nombre + número secuencial)
- Al registrar una venta, el stock se descuenta automáticamente en el store

## Pendientes / próximas features sugeridas
- Exportar a Excel/CSV (productos, ventas, finanzas)
- Órdenes de compra: formulario completo para crear y gestionar (el tipo `PurchaseOrder` ya existe en el store)
- Dashboard finanzas personales con KPIs resumen
- Importar precios desde archivo
- Múltiples monedas (EUR además de USD)
- Modo oscuro
