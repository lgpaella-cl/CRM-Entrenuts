import { useState } from 'react'
import { RefreshCw, Calculator } from 'lucide-react'
import { useFmt } from '../../hooks/useExchangeRate'

// Todos los montos son manuales — los campos calculados se derivan automáticamente
// Estructura basada en Calculadora Aduanera.xlsx

function n(val: string): number { return parseFloat(val) || 0 }

function InputCell({ value, onChange, placeholder }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      className="input"
      type="text"
      inputMode="decimal"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder ?? '0'}
      style={{ textAlign: 'right', fontWeight: 500 }}
    />
  )
}

function Row({ label, value, computed, children, note }: {
  label: string
  value?: string
  computed?: boolean
  children?: React.ReactNode
  note?: string
}) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 160px', gap: 8,
      alignItems: 'center', padding: '10px 0',
      borderBottom: '1px solid #e2e8f0',
    }}>
      <div>
        <span style={{ fontSize: 13, fontWeight: computed ? 600 : 400, color: computed ? '#1e3a5f' : '#374151' }}>
          {label}
        </span>
        {note && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{note}</div>}
      </div>
      <div>
        {children ?? (
          <div style={{
            background: computed ? '#eff6ff' : '#f8fafc',
            border: `1px solid ${computed ? '#bfdbfe' : '#e2e8f0'}`,
            borderRadius: 8, padding: '7px 12px', textAlign: 'right',
            fontSize: 14, fontWeight: computed ? 700 : 400,
            color: computed ? '#1d4ed8' : '#374151',
          }}>
            {value}
          </div>
        )}
      </div>
    </div>
  )
}

export function CustomsCalculatorTab() {
  const { clp, rate: siiRate } = useFmt()

  // ── Sección 1: Carga y transporte ───────────────────────────────
  const [valorCarga, setValorCarga] = useState('')       // Valor FOB carga (USD)
  const [flete, setFlete] = useState('')                  // Flete internacional (USD)
  const [seguro, setSeguro] = useState('')                // Seguro (USD)

  // ── Sección 2: Aranceles y derechos ────────────────────────────
  const [derechoAduana, setDerechoAduana] = useState('')  // Derecho de aduana (CLP)
  const [tasaIVA, setTasaIVA] = useState('19')            // Tasa IVA aduanero %

  // ── Sección 3: Servicios locales ────────────────────────────────
  const [almacenaje, setAlmacenaje] = useState('')        // Almacenaje y terminal (CLP)
  const [agenciaAduana, setAgenciaAduana] = useState('') // Honorarios agencia (CLP)
  const [transporte, setTransporte] = useState('')        // Transporte local (CLP)
  const [otrosServicios, setOtrosServicios] = useState('')// Otros servicios locales (CLP)
  const [tasaIVAServ, setTasaIVAServ] = useState('19')   // IVA servicios %

  // ── Sección 4: Distribución ──────────────────────────────────────
  const [cantidadPallets, setCantidadPallets] = useState('')
  const [cantidadUnidades, setCantidadUnidades] = useState('')

  // ── Tipo de cambio ───────────────────────────────────────────────
  const [tipoCambio, setTipoCambio] = useState(siiRate > 0 ? String(Math.round(siiRate)) : '')
  const tc = n(tipoCambio) || siiRate

  // ── Cálculos automáticos ─────────────────────────────────────────
  const cifUSD = n(valorCarga) + n(flete) + n(seguro)
  const cifCLP = cifUSD * tc

  const ivaAduaneroCLP = cifCLP * (n(tasaIVA) / 100)

  const derechoAduanaCLP = n(derechoAduana)
  const gcpCLP = derechoAduanaCLP + ivaAduaneroCLP

  const serviciosLocalesCLP = n(almacenaje) + n(agenciaAduana) + n(transporte) + n(otrosServicios)
  const ivaServiciosCLP = serviciosLocalesCLP * (n(tasaIVAServ) / 100)

  const totalImportacionCLP = cifCLP + gcpCLP + serviciosLocalesCLP + ivaServiciosCLP

  const costoPorPallet = n(cantidadPallets) > 0 ? totalImportacionCLP / n(cantidadPallets) : 0
  const costoPorUnidad = n(cantidadUnidades) > 0 ? totalImportacionCLP / n(cantidadUnidades) : 0

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Calculadora Aduanera</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Ingresa todos los valores manualmente · Los campos en azul se calculan automáticamente
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calculator size={18} style={{ color: '#64748b' }} />
        </div>
      </div>

      {/* Tipo de cambio */}
      <div className="card mb-4" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 8, alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>💱 Tipo de cambio (CLP por USD)</span>
            {siiRate > 0 && (
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                Dólar SII hoy: {clp(siiRate)} — se precarga automáticamente
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              className="input"
              type="text"
              inputMode="numeric"
              value={tipoCambio}
              onChange={e => setTipoCambio(e.target.value)}
              style={{ textAlign: 'right', fontWeight: 600 }}
              placeholder={siiRate > 0 ? String(Math.round(siiRate)) : '950'}
            />
            {siiRate > 0 && (
              <button
                className="btn btn-secondary"
                style={{ padding: '7px 10px', flexShrink: 0 }}
                title="Restaurar dólar SII"
                onClick={() => setTipoCambio(String(Math.round(siiRate)))}
              >
                <RefreshCw size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* ── Columna izquierda: Inputs ──────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Sección 1: Carga y transporte (USD) */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <h3 style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 4 }}>
              🚢 Carga y Transporte
            </h3>
            <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12 }}>Montos en USD</p>
            <Row label="Valor FOB / Carga (USD)" note="Valor de la mercancía puesta en origen">
              <InputCell value={valorCarga} onChange={setValorCarga} placeholder="0.00" />
            </Row>
            <Row label="Flete internacional (USD)" note="Costo de transporte hasta Chile">
              <InputCell value={flete} onChange={setFlete} placeholder="0.00" />
            </Row>
            <Row label="Seguro (USD)" note="Seguro de la carga">
              <InputCell value={seguro} onChange={setSeguro} placeholder="0.00" />
            </Row>
          </div>

          {/* Sección 2: Aranceles */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <h3 style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 12 }}>
              🏛️ Aranceles y Derechos
            </h3>
            <Row label="Derecho de aduana (CLP)" note="Arancel aplicado por aduana">
              <InputCell value={derechoAduana} onChange={setDerechoAduana} />
            </Row>
            <Row label="Tasa IVA aduanero (%)" note="Generalmente 19%">
              <InputCell value={tasaIVA} onChange={setTasaIVA} placeholder="19" />
            </Row>
          </div>

          {/* Sección 3: Servicios locales */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <h3 style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 12 }}>
              🏭 Servicios Locales (CLP)
            </h3>
            <Row label="Almacenaje y terminal" note="Puerto / zona primaria">
              <InputCell value={almacenaje} onChange={setAlmacenaje} />
            </Row>
            <Row label="Agencia de aduana" note="Honorarios del despachador">
              <InputCell value={agenciaAduana} onChange={setAgenciaAduana} />
            </Row>
            <Row label="Transporte local" note="Flete hasta bodega">
              <InputCell value={transporte} onChange={setTransporte} />
            </Row>
            <Row label="Otros servicios" note="Fumigación, certificados, etc.">
              <InputCell value={otrosServicios} onChange={setOtrosServicios} />
            </Row>
            <Row label="Tasa IVA servicios (%)" note="IVA sobre servicios locales">
              <InputCell value={tasaIVAServ} onChange={setTasaIVAServ} placeholder="19" />
            </Row>
          </div>

          {/* Sección 4: Distribución */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <h3 style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 12 }}>
              📦 Distribución
            </h3>
            <Row label="Cantidad de pallets">
              <InputCell value={cantidadPallets} onChange={setCantidadPallets} />
            </Row>
            <Row label="Cantidad total de unidades">
              <InputCell value={cantidadUnidades} onChange={setCantidadUnidades} />
            </Row>
          </div>
        </div>

        {/* ── Columna derecha: Resultados ───────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* CIF */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <h3 style={{ fontWeight: 700, fontSize: 14, color: '#1e3a5f', marginBottom: 4 }}>
              📊 CIF — Costo, Seguro y Flete
            </h3>
            <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12 }}>= Carga + Flete + Seguro</p>
            <Row label="CIF en USD" computed value={`USD ${cifUSD.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
            <Row label="CIF en CLP" computed note={`× tipo de cambio ${clp(tc)}`} value={clp(cifCLP)} />
          </div>

          {/* GCP */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <h3 style={{ fontWeight: 700, fontSize: 14, color: '#1e3a5f', marginBottom: 4 }}>
              🏛️ GCP — Gastos en Cuenta Personal
            </h3>
            <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12 }}>= Derecho de aduana + IVA aduanero</p>
            <Row label={`IVA aduanero (${tasaIVA}%)`} computed note="CIF × tasa IVA" value={clp(ivaAduaneroCLP)} />
            <Row label="GCP total" computed value={clp(gcpCLP)} />
          </div>

          {/* Servicios */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <h3 style={{ fontWeight: 700, fontSize: 14, color: '#1e3a5f', marginBottom: 4 }}>
              🏭 Servicios Totales
            </h3>
            <Row label="Subtotal servicios" computed value={clp(serviciosLocalesCLP)} />
            <Row label={`IVA servicios (${tasaIVAServ}%)`} computed value={clp(ivaServiciosCLP)} />
            <Row label="Servicios + IVA" computed value={clp(serviciosLocalesCLP + ivaServiciosCLP)} />
          </div>

          {/* TOTAL */}
          <div style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)',
            borderRadius: 14, padding: '22px 24px', color: 'white',
          }}>
            <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 16, opacity: 0.9 }}>
              💰 Total Importación
            </h3>
            <p style={{ fontSize: 11, opacity: 0.65, marginBottom: 18, lineHeight: 1.5 }}>
              CIF × TC + GCP + Servicios + IVA servicios
            </p>
            <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.5px' }}>
              {clp(totalImportacionCLP)}
            </div>

            {(costoPorPallet > 0 || costoPorUnidad > 0) && (
              <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {costoPorPallet > 0 && (
                  <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '12px 16px', flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Costo por pallet</div>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>{clp(costoPorPallet)}</div>
                  </div>
                )}
                {costoPorUnidad > 0 && (
                  <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '12px 16px', flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Costo por unidad</div>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>{clp(costoPorUnidad)}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Desglose resumen */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <h3 style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 12 }}>
              📋 Resumen de componentes
            </h3>
            {[
              { label: 'CIF (mercancía en Chile)', value: cifCLP },
              { label: 'Derecho de aduana', value: derechoAduanaCLP },
              { label: `IVA aduanero (${tasaIVA}%)`, value: ivaAduaneroCLP },
              { label: 'Servicios locales', value: serviciosLocalesCLP },
              { label: `IVA servicios (${tasaIVAServ}%)`, value: ivaServiciosCLP },
            ].map(({ label, value }) => {
              const pct = totalImportacionCLP > 0 ? (value / totalImportacionCLP) * 100 : 0
              return (
                <div key={label} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 12 }}>
                    <span style={{ color: '#374151' }}>{label}</span>
                    <span style={{ fontWeight: 600 }}>{clp(value)} <span style={{ color: '#94a3b8', fontWeight: 400 }}>({pct.toFixed(1)}%)</span></span>
                  </div>
                  <div style={{ height: 5, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: '#3b82f6', borderRadius: 999, transition: 'width 0.3s' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
