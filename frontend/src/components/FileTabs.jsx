import { FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react'

export default function FileTabs({ files, activeIndex, onSelect }) {
  if (files.length <= 1) return null

  return (
    <div style={{
      display: 'flex', gap: 6, padding: '10px 24px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-surface)',
      overflowX: 'auto',
    }}>
      {files.map((f, i) => {
        const active = i === activeIndex
        const failed = f.status === 'failed'
        return (
          <button
            key={i}
            onClick={() => !failed && onSelect(i)}
            disabled={failed}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 8,
              border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border)'}`,
              background: active ? 'var(--accent-dim)' : 'transparent',
              color: failed ? 'var(--text-tertiary)' : active ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: 12, cursor: failed ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap',
              opacity: failed ? 0.5 : 1, flexShrink: 0,
            }}
          >
            {failed
              ? <AlertTriangle size={12} color="var(--red)" />
              : <FileSpreadsheet size={12} />
            }
            {f.file_name}
            {!failed && f.summary && (
              <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                {f.summary.rows.toLocaleString()}f
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
