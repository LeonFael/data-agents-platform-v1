import { useState, useEffect } from 'react'
import { uploadFile } from '../services/api'
import DropZone from '../components/DropZone'
import MetricCard from '../components/MetricCard'
import InsightsList from '../components/InsightsList'
import ChatPanel from '../components/ChatPanel'
import DataTable from '../components/DataTable'
import { CompletenessChart, HistogramChart, ColumnTypesChart } from '../components/Charts'
import { BarChart2, MessageCircle, Table, Lightbulb, TrendingUp, RefreshCw } from 'lucide-react'

const TABS = [
  { id: 'overview',  label: 'Resumen',    icon: BarChart2 },
  { id: 'charts',    label: 'Gráficas',   icon: TrendingUp },
  { id: 'data',      label: 'Datos',      icon: Table },
  { id: 'insights',  label: 'Insights',   icon: Lightbulb },
  { id: 'chat',      label: 'Preguntar',  icon: MessageCircle },
]

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
      {children}
    </div>
  )
}

function ChartCard({ title, children }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  )
}

export default function AnalystPage() {
  const [loading, setLoading]       = useState(false)
  const [summary, setSummary]       = useState(null)
  const [error, setError]           = useState(null)
  const [activeTab, setActiveTab]   = useState('overview')
  const [tableRows, setTableRows]   = useState([])
  const [tableHeaders, setTableHeaders] = useState([])

  // Parsear filas planas para la tabla desde el summary
  useEffect(() => {
    if (!summary) return
    setTableHeaders(summary.column_info.map(c => c.name))
    // Reconstruir filas desde top_values + stats (datos demo para preview)
    // En producción el endpoint devolverá las filas reales
    setTableRows([])
  }, [summary])

  async function handleFile(file) {
    setLoading(true)
    setError(null)
    setSummary(null)
    try {
      const result = await uploadFile(file)
      if (result.status === 'failed') {
        setError(result.error || 'Error al procesar el archivo')
      } else {
        setSummary(result.summary)
        setActiveTab('overview')
      }
    } catch (e) {
      setError(e?.response?.data?.detail || 'No se pudo conectar con el backend. ¿Está corriendo en localhost:8000?')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setSummary(null)
    setError(null)
    setTableRows([])
    setTableHeaders([])
  }

  /* ── Sin datos: pantalla de carga ─────────────────────────────────────── */
  if (!summary) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', gap: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 480 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          }}>
            <BarChart2 size={22} color="var(--accent)" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
            Agente Analista
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
            Sube un archivo CSV, Excel o JSON y el agente generará un análisis completo: estadísticas, insights automáticos, visualizaciones y chat en lenguaje natural.
          </p>
          <DropZone onFile={handleFile} loading={loading} />
          {error && (
            <div style={{
              marginTop: 16, padding: '10px 14px', borderRadius: 'var(--radius-md)',
              background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)',
              color: 'var(--red)', fontSize: 13, textAlign: 'left',
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Capacidades */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, maxWidth: 600, width: '100%' }}>
          {[
            { label: 'EDA automático',     sub: 'Estadísticas descriptivas completas' },
            { label: 'Detección de nulos', sub: 'Alertas por columna y porcentaje' },
            { label: 'Outliers IQR',       sub: 'Detección automática de valores atípicos' },
            { label: 'Chat analítico',     sub: 'Preguntas en lenguaje natural' },
          ].map((f, i) => (
            <div key={i} style={{
              padding: '12px 14px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)', background: 'var(--bg-surface)',
            }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 3 }}>{f.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{f.sub}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  /* ── Con datos: dashboard ─────────────────────────────────────────────── */
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header del análisis */}
      <div style={{
        padding: '14px 24px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'var(--bg-surface)',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {summary.file_name}
            </span>
            <span className="badge badge-teal">{summary.file_type}</span>
            <span className="badge badge-gray">{(summary.size_kb / 1024).toFixed(2)} MB</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
            {summary.rows.toLocaleString()} filas · {summary.columns} columnas · {summary.completeness_pct}% completitud
          </div>
        </div>
        <button
          onClick={reset}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text-secondary)', fontSize: 12,
            cursor: 'pointer', fontFamily: 'var(--font-ui)',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <RefreshCw size={12} />
          Nuevo análisis
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 2, padding: '8px 24px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-surface)',
      }}>
        {TABS.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 8, border: 'none',
                background: active ? 'var(--accent-dim)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: 13, fontWeight: active ? 500 : 400,
                cursor: 'pointer', fontFamily: 'var(--font-ui)',
                transition: 'all .15s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

        {/* ── RESUMEN ── */}
        {activeTab === 'overview' && (
          <div className="fade-up">
            <SectionTitle>Métricas principales</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: 10, marginBottom: 24 }}>
              <MetricCard label="Total filas"      value={summary.rows}              sub="registros"           accent />
              <MetricCard label="Columnas"         value={summary.columns}            sub={`${summary.numeric_cols} numéricas`} />
              <MetricCard label="Completitud"      value={`${summary.completeness_pct}%`} sub={`${summary.column_info.reduce((s,c)=>s+c.missing,0)} nulos`} />
              <MetricCard label="Categóricas"      value={summary.categorical_cols}   sub="texto / categoría" />
            </div>

            <SectionTitle>Distribución de columnas</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
              <ChartCard title="Tipo por columna">
                <ColumnTypesChart numericCols={summary.numeric_cols} categoricalCols={summary.categorical_cols} />
              </ChartCard>
              <ChartCard title="Completitud por columna">
                <CompletenessChart columnInfo={summary.column_info} />
              </ChartCard>
            </div>

            <SectionTitle>Columnas detectadas</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {summary.column_info.map((col, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)', background: 'var(--bg-surface)',
                }}>
                  <span style={{ flex: 1, fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{col.name}</span>
                  <span className={`badge ${col.is_numeric ? 'badge-teal' : 'badge-violet'}`}>
                    {col.is_numeric ? 'numérica' : 'categórica'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', width: 80, textAlign: 'right' }}>
                    {col.unique_count} únicos
                  </span>
                  {col.missing > 0 && (
                    <span className="badge badge-amber">{col.missing_pct}% nulos</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── GRÁFICAS ── */}
        {activeTab === 'charts' && (
          <div className="fade-up">
            <SectionTitle>Distribución de variables numéricas</SectionTitle>
            {Object.keys(summary.numeric_stats).length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 40, fontSize: 13 }}>
                No hay columnas numéricas en este dataset.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px,1fr))', gap: 10 }}>
                {Object.entries(summary.numeric_stats).map(([name, stats]) => (
                  <ChartCard key={name} title={name}>
                    <HistogramChart stats={stats} name={name} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 10 }}>
                      {[
                        { l: 'min',    v: stats.min },
                        { l: 'media',  v: stats.mean },
                        { l: 'max',    v: stats.max },
                        { l: 'Q1',     v: stats.q25 },
                        { l: 'mediana',v: stats.median },
                        { l: 'Q3',     v: stats.q75 },
                      ].map(s => (
                        <div key={s.l} style={{ background: 'var(--bg-elevated)', borderRadius: 6, padding: '5px 8px' }}>
                          <div style={{ fontSize: 9, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{s.l}</div>
                          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: 1 }}>{s.v.toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </ChartCard>
                ))}
              </div>
            )}

            {Object.keys(summary.top_values).length > 0 && (
              <>
                <SectionTitle style={{ marginTop: 24 }}>Valores más frecuentes — categóricas</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px,1fr))', gap: 10 }}>
                  {Object.entries(summary.top_values).map(([col, vals]) => (
                    <div key={col} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 10, fontFamily: 'var(--font-mono)' }}>{col}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {vals.map((v, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.value}</div>
                            <div style={{ width: `${v.pct}%`, maxWidth: 80, height: 4, background: 'var(--accent)', borderRadius: 2, opacity: 0.7 }} />
                            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', width: 36, textAlign: 'right' }}>{v.pct}%</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── DATOS ── */}
        {activeTab === 'data' && (
          <div className="fade-up">
            <SectionTitle>Vista previa del dataset</SectionTitle>
            <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: 'var(--bg-surface)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)' }}>
              Vista de muestra disponible. Para ver todas las filas, conecta directamente al backend.
            </div>
            <DataTable columnInfo={summary.column_info} rows={tableRows} headers={tableHeaders} />
          </div>
        )}

        {/* ── INSIGHTS ── */}
        {activeTab === 'insights' && (
          <div className="fade-up">
            <SectionTitle>Insights automáticos — {summary.insights.length} detectados</SectionTitle>
            <InsightsList insights={summary.insights} />
          </div>
        )}

        {/* ── CHAT ── */}
        {activeTab === 'chat' && (
          <div className="fade-up" style={{ height: 'calc(100vh - 260px)', minHeight: 400 }}>
            <SectionTitle>Chat con el agente analista</SectionTitle>
            <ChatPanel summary={summary} />
          </div>
        )}
      </div>
    </div>
  )
}
