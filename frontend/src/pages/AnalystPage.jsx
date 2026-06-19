import { useState } from 'react'
import { uploadFile, uploadBatch } from '../services/api'
import DropZone from '../components/DropZone'
import FileQueue from '../components/FileQueue'
import FileTabs from '../components/FileTabs'
import DatasetDashboard from '../components/DatasetDashboard'
import { BarChart2, RefreshCw, Link2, AlertTriangle } from 'lucide-react'

export default function AnalystPage() {
  const [pendingFiles, setPendingFiles] = useState([])   // File[] aún no enviados
  const [mode, setMode]                 = useState('separate')
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState(null)
  const [result, setResult]             = useState(null) // respuesta del backend (single o batch)
  const [activeFileIdx, setActiveFileIdx] = useState(0)

  /* ── Selección de archivos (aún no enviados) ──────────────────────────── */
  function handleFiles(files) {
    setError(null)
    setPendingFiles(prev => {
      const merged = [...prev, ...files]
      // de-duplicar por nombre+tamaño
      const seen = new Set()
      return merged.filter(f => {
        const key = `${f.name}-${f.size}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    })
  }

  function removeFile(idx) {
    setPendingFiles(prev => prev.filter((_, i) => i !== idx))
  }

  /* ── Disparar análisis ─────────────────────────────────────────────────── */
  async function handleAnalyze() {
    if (!pendingFiles.length) return
    setLoading(true)
    setError(null)

    try {
      if (pendingFiles.length === 1) {
        const r = await uploadFile(pendingFiles[0])
        if (r.status === 'failed') {
          setError(r.error || 'Error al procesar el archivo')
        } else {
          setResult({ kind: 'single', data: r })
        }
      } else {
        const r = await uploadBatch(pendingFiles, mode)
        setResult({ kind: 'batch', data: r })
        setActiveFileIdx(0)
      }
    } catch (e) {
      setError(e?.response?.data?.detail || 'No se pudo conectar con el backend.')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setPendingFiles([])
    setResult(null)
    setError(null)
    setMode('separate')
    setActiveFileIdx(0)
  }

  /* ════════════════════════════════════════════════════════════════════════
     ESTADO 1 — Sin resultado todavía: zona de carga + cola de archivos
     ════════════════════════════════════════════════════════════════════════ */
  if (!result) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', gap: 24, overflowY: 'auto' }}>
        <div style={{ textAlign: 'center', maxWidth: 480, width: '100%' }}>
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
            Sube uno o varios archivos CSV, Excel o JSON. El agente generará un análisis completo: estadísticas, insights automáticos, visualizaciones y chat en lenguaje natural.
          </p>

          {pendingFiles.length === 0 ? (
            <DropZone onFiles={handleFiles} loading={loading} />
          ) : (
            <FileQueue
              files={pendingFiles}
              mode={mode}
              onModeChange={setMode}
              onRemove={removeFile}
              onAnalyze={handleAnalyze}
              onAddMore={() => document.getElementById('add-more-input')?.click()}
              loading={loading}
            />
          )}

          {/* input oculto para "agregar más" reusando el mismo flujo de selección */}
          <input
            id="add-more-input"
            type="file"
            multiple
            accept=".csv,.xlsx,.xls,.json"
            style={{ display: 'none' }}
            onChange={e => { if (e.target.files.length) handleFiles(Array.from(e.target.files)); e.target.value = '' }}
          />

          {error && (
            <div style={{
              marginTop: 16, padding: '10px 14px', borderRadius: 'var(--radius-md)',
              background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)',
              color: 'var(--red)', fontSize: 13, textAlign: 'left',
              display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              {error}
            </div>
          )}
        </div>

        {pendingFiles.length === 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, maxWidth: 600, width: '100%' }}>
            {[
              { label: 'Multi-archivo',      sub: 'Sube hasta 10 archivos a la vez' },
              { label: 'Combinar o separar', sub: 'Tú decides cómo se analizan' },
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
        )}
      </div>
    )
  }

  /* ════════════════════════════════════════════════════════════════════════
     ESTADO 2 — Resultado: armar la lista de "summaries navegables"
     ════════════════════════════════════════════════════════════════════════ */
  let summaries = []       // [{ file_name, summary, status, error }]
  let headerNote = null

  if (result.kind === 'single') {
    const s = result.data.summary
    summaries = [{ file_name: s.file_name, summary: s, status: 'completed' }]
  } else {
    const batch = result.data
    if (batch.mode === 'combined' && batch.combined_summary) {
      summaries = [{ file_name: batch.combined_summary.file_name, summary: batch.combined_summary, status: 'completed' }]
      headerNote = (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--accent)' }}>
          <Link2 size={13} />
          {batch.combine_check?.reason}
        </div>
      )
    } else {
      summaries = batch.files.map(f => ({ file_name: f.file_name, summary: f.summary, status: f.status, error: f.error }))
      if (batch.combine_check && !batch.combine_check.combinable) {
        headerNote = (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--amber)' }}>
            <AlertTriangle size={13} />
            No se combinaron — {batch.combine_check.reason}
          </div>
        )
      }
    }
  }

  const active = summaries[activeFileIdx] || summaries[0]

  /* ════════════════════════════════════════════════════════════════════════
     ESTADO 3 — Dashboard
     ════════════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{
        padding: '14px 24px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'var(--bg-surface)',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {active?.summary?.file_name || active?.file_name}
            </span>
            {active?.summary && <span className="badge badge-teal">{active.summary.file_type}</span>}
            {summaries.length > 1 && <span className="badge badge-gray">{summaries.length} archivos</span>}
          </div>
          {active?.summary ? (
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
              {active.summary.rows.toLocaleString()} filas · {active.summary.columns} columnas · {active.summary.completeness_pct}% completitud
            </div>
          ) : headerNote}
        </div>
        {headerNote && active?.summary && <div style={{ marginRight: 8 }}>{headerNote}</div>}
        <button
          onClick={reset}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text-secondary)', fontSize: 12,
            cursor: 'pointer', fontFamily: 'var(--font-ui)', flexShrink: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <RefreshCw size={12} />
          Nuevo análisis
        </button>
      </div>

      {/* Pestañas de archivo (solo modo separado con 2+) */}
      <FileTabs files={summaries} activeIndex={activeFileIdx} onSelect={setActiveFileIdx} />

      {/* Dashboard del archivo activo */}
      {active?.status === 'failed' ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, color: 'var(--text-tertiary)' }}>
          <AlertTriangle size={28} color="var(--red)" />
          <div style={{ fontSize: 13 }}>{active.error || 'Error al procesar este archivo'}</div>
        </div>
      ) : active?.summary ? (
        <DatasetDashboard summary={active.summary} />
      ) : null}
    </div>
  )
}
