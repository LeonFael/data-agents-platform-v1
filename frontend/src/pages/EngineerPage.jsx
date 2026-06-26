import { useState } from 'react'
import {
  startEngineerSession, applyEngineerAction, undoEngineerAction,
  exportEngineerData, exportEngineerCode,
} from '../services/api'
import { downloadBlob } from '../utils/download'
import DropZone from '../components/DropZone'
import SuggestionCard from '../components/SuggestionCard'
import BeforeAfterDiff from '../components/BeforeAfterDiff'
import TransformLog from '../components/TransformLog'
import { Wrench, RefreshCw, AlertTriangle, Download, FileCode, Sparkles, PartyPopper } from 'lucide-react'

export default function EngineerPage() {
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [session, setSession]       = useState(null)
  const [applying, setApplying]     = useState(null)
  const [undoing, setUndoing]       = useState(false)
  const [log, setLog]               = useState([])
  const [lastDiff, setLastDiff]     = useState(null)
  const [exporting, setExporting]   = useState(null)

  async function handleFiles(files) {
    if (!files.length) return
    setLoading(true)
    setError(null)
    try {
      const result = await startEngineerSession(files[0])
      setSession(result)
      setLog([])
      setLastDiff(null)
    } catch (e) {
      setError(e?.response?.data?.detail || 'No se pudo conectar con el backend.')
    } finally {
      setLoading(false)
    }
  }

  async function handleApply(suggestionId, action) {
    setApplying(suggestionId)
    setError(null)
    try {
      const result = await applyEngineerAction(session.session_id, suggestionId, action)
      setSession(s => ({ ...s, summary: result.summary_after, suggestions: result.remaining_suggestions }))
      setLog(result.applied_log)
      setLastDiff({ note: result.applied.note, before: result.summary_before, after: result.summary_after })
    } catch (e) {
      setError(e?.response?.data?.detail || 'Error al aplicar la transformación.')
    } finally {
      setApplying(null)
    }
  }

  async function handleUndo() {
    setUndoing(true)
    setError(null)
    try {
      const result = await undoEngineerAction(session.session_id)
      setSession(s => ({ ...s, summary: result.summary_after, suggestions: result.remaining_suggestions }))
      setLog(result.applied_log)
      setLastDiff({ note: result.applied.note, before: result.summary_before, after: result.summary_after })
    } catch (e) {
      setError(e?.response?.data?.detail || 'No se pudo deshacer.')
    } finally {
      setUndoing(false)
    }
  }

  async function handleExport(format) {
    setExporting(format)
    try {
      const blob = await exportEngineerData(session.session_id, format)
      const ext = format === 'xlsx' ? 'xlsx' : 'csv'
      downloadBlob(blob, `dataset_limpio.${ext}`)
    } catch {
      setError('No se pudo exportar el archivo.')
    } finally {
      setExporting(null)
    }
  }

  async function handleExportCode() {
    setExporting('code')
    try {
      const blob = await exportEngineerCode(session.session_id)
      downloadBlob(blob, 'limpieza_datos.py')
    } catch {
      setError('No se pudo exportar el código.')
    } finally {
      setExporting(null)
    }
  }

  function reset() {
    setSession(null)
    setError(null)
    setLog([])
    setLastDiff(null)
  }

  if (!session) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', gap: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 480 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'rgba(245,158,11,.12)', border: '1px solid rgba(245,158,11,.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          }}>
            <Wrench size={22} color="var(--amber)" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
            Agente Ingeniero
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
            Sube un archivo y el agente detectará problemas de calidad — nulos, duplicados, outliers — y te propondrá cómo resolverlos. Tú decides cada cambio.
          </p>
          <DropZone onFiles={handleFiles} loading={loading} />
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
      </div>
    )
  }

  const { summary, suggestions } = session
  const hasIssues = suggestions.length > 0

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      <div style={{
        padding: '14px 24px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-surface)',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {summary.file_name}
            </span>
            <span className="badge badge-amber">{suggestions.length} sugerencias</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
            {summary.rows.toLocaleString()} filas · {summary.columns} columnas · {summary.completeness_pct}% completitud
          </div>
        </div>
        <button onClick={reset} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8,
          border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)',
          fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-ui)', flexShrink: 0,
        }}>
          <RefreshCw size={12} /> Nuevo archivo
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', maxWidth: 720 }}>

        {error && (
          <div style={{
            marginBottom: 16, padding: '10px 14px', borderRadius: 'var(--radius-md)',
            background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)',
            color: 'var(--red)', fontSize: 13, display: 'flex', gap: 8, alignItems: 'flex-start',
          }}>
            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            {error}
          </div>
        )}

        {lastDiff && (
          <BeforeAfterDiff note={lastDiff.note} summaryBefore={lastDiff.before} summaryAfter={lastDiff.after} />
        )}

        {log.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <TransformLog log={log} onUndo={handleUndo} undoing={undoing} />
          </div>
        )}

        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
          {hasIssues ? 'Sugerencias pendientes' : 'Estado del dataset'}
        </div>

        {!hasIssues ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            padding: '32px 20px', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--accent-border)', background: 'var(--accent-dim)',
            textAlign: 'center', marginBottom: 20,
          }}>
            <PartyPopper size={24} color="var(--accent)" />
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
              No quedan problemas de calidad detectados
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 360 }}>
              El dataset está listo para análisis o para pasar al Agente Científico.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {suggestions.map(s => (
              <SuggestionCard key={s.id} suggestion={s} onApply={handleApply} applying={applying} />
            ))}
          </div>
        )}

        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
          Exportar resultado
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
          <ExportButton icon={Download} label="Descargar CSV" loading={exporting === 'csv'} onClick={() => handleExport('csv')} />
          <ExportButton icon={Download} label="Descargar Excel" loading={exporting === 'xlsx'} onClick={() => handleExport('xlsx')} />
          <ExportButton icon={FileCode} label="Descargar código Python" loading={exporting === 'code'} onClick={handleExportCode} />
        </div>
      </div>
    </div>
  )
}

function ExportButton({ icon: Icon, label, loading, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '8px 14px', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)', background: 'var(--bg-surface)',
        color: 'var(--text-primary)', fontSize: 12.5,
        cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-ui)',
      }}
      onMouseEnter={e => !loading && (e.currentTarget.style.borderColor = 'var(--accent)')}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      {loading
        ? <Sparkles size={13} style={{ animation: 'spin .8s linear infinite' }} />
        : <Icon size={13} />
      }
      {label}
    </button>
  )
}
