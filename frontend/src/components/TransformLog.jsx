import { Undo2, History } from 'lucide-react'

export default function TransformLog({ log, onUndo, undoing }) {
  if (!log.length) return null

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', padding: '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <History size={13} color="var(--text-tertiary)" />
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
            Transformaciones aplicadas ({log.length})
          </span>
        </div>
        <button
          onClick={onUndo}
          disabled={undoing}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 9px', borderRadius: 6, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text-secondary)',
            fontSize: 11, cursor: undoing ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-ui)',
          }}
          onMouseEnter={e => !undoing && (e.currentTarget.style.borderColor = 'var(--accent)')}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <Undo2 size={11} /> Deshacer último
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {log.map((entry, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--text-secondary)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', flexShrink: 0 }}>{i + 1}.</span>
            <span>{entry.detail.note}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
