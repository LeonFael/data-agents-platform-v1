import { ArrowRight, Check } from 'lucide-react'

function Metric({ label, before, after, suffix = '' }) {
  const changed = before !== after
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 14 }}>
        <span style={{ color: changed ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>{before}{suffix}</span>
        {changed && (
          <>
            <ArrowRight size={11} color="var(--text-tertiary)" />
            <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{after}{suffix}</span>
          </>
        )}
      </div>
    </div>
  )
}

export default function BeforeAfterDiff({ note, summaryBefore, summaryAfter }) {
  return (
    <div className="fade-up" style={{
      border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-md)',
      background: 'var(--accent-dim)', padding: '12px 16px', marginBottom: 12,
    }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12 }}>
        <Check size={14} color="var(--accent)" style={{ marginTop: 1, flexShrink: 0 }} />
        <div style={{ fontSize: 12.5, color: 'var(--text-primary)' }}>{note}</div>
      </div>
      <div style={{ display: 'flex', gap: 8, paddingTop: 10, borderTop: '1px solid var(--accent-border)' }}>
        <Metric label="Filas" before={summaryBefore.rows} after={summaryAfter.rows} />
        <Metric label="Columnas" before={summaryBefore.columns} after={summaryAfter.columns} />
        <Metric label="Completitud" before={summaryBefore.completeness_pct} after={summaryAfter.completeness_pct} suffix="%" />
      </div>
    </div>
  )
}
