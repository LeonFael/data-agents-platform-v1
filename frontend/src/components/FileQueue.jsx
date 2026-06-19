import { X, FileSpreadsheet, Link2, Split, Play } from 'lucide-react'

function formatBytes(b) {
  if (b < 1024) return b + ' B'
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1048576).toFixed(1) + ' MB'
}

export default function FileQueue({ files, mode, onModeChange, onRemove, onAnalyze, onAddMore, loading }) {
  const canCombine = files.length > 1

  return (
    <div style={{ width: '100%', maxWidth: 520 }}>
      {/* Lista de archivos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
        {files.map((file, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)', background: 'var(--bg-surface)',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7, flexShrink: 0,
              background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FileSpreadsheet size={13} color="var(--accent)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {file.name}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>{formatBytes(file.size)}</div>
            </div>
            {!loading && (
              <button
                onClick={() => onRemove(i)}
                style={{
                  width: 22, height: 22, borderRadius: 6, border: 'none',
                  background: 'transparent', color: 'var(--text-tertiary)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--red)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)' }}
              >
                <X size={13} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Botón agregar más */}
      {!loading && (
        <button
          onClick={onAddMore}
          style={{
            width: '100%', padding: '8px', marginBottom: 16,
            borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)',
            background: 'transparent', color: 'var(--text-secondary)',
            fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-ui)',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          + Agregar más archivos
        </button>
      )}

      {/* Selector de modo — solo si hay 2+ archivos */}
      {canCombine && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>
            ¿Cómo analizamos estos {files.length} archivos?
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              onClick={() => onModeChange('separate')}
              disabled={loading}
              style={modeButtonStyle(mode === 'separate')}
            >
              <Split size={16} color={mode === 'separate' ? 'var(--accent)' : 'var(--text-secondary)'} />
              <div style={{ fontSize: 12.5, fontWeight: 500, color: mode === 'separate' ? 'var(--accent)' : 'var(--text-primary)' }}>
                Por separado
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                Un análisis independiente por archivo
              </div>
            </button>
            <button
              onClick={() => onModeChange('combined')}
              disabled={loading}
              style={modeButtonStyle(mode === 'combined')}
            >
              <Link2 size={16} color={mode === 'combined' ? 'var(--accent)' : 'var(--text-secondary)'} />
              <div style={{ fontSize: 12.5, fontWeight: 500, color: mode === 'combined' ? 'var(--accent)' : 'var(--text-primary)' }}>
                Combinarlos
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                Unir en un solo dataset si comparten columnas
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Botón analizar */}
      <button
        onClick={onAnalyze}
        disabled={loading || files.length === 0}
        style={{
          width: '100%', padding: '11px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          borderRadius: 'var(--radius-md)', border: 'none',
          background: loading ? 'var(--bg-elevated)' : 'var(--accent)',
          color: loading ? 'var(--text-tertiary)' : '#0E1117',
          fontSize: 13.5, fontWeight: 500,
          cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: 'var(--font-ui)',
        }}
      >
        {loading
          ? <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--text-tertiary)', borderTopColor: 'transparent', animation: 'spin .8s linear infinite' }} /> Analizando...</>
          : <><Play size={14} /> Analizar {files.length > 1 ? `${files.length} archivos` : 'archivo'}</>
        }
      </button>
    </div>
  )
}

function modeButtonStyle(active) {
  return {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4,
    padding: '12px 14px', borderRadius: 'var(--radius-md)',
    border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border)'}`,
    background: active ? 'var(--accent-dim)' : 'var(--bg-surface)',
    cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-ui)',
    transition: 'all .15s',
  }
}
