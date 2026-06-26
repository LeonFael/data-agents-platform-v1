import { AlertTriangle, AlertCircle, Info, Check, Loader2 } from 'lucide-react'

const SEVERITY_CONFIG = {
  high:   { icon: AlertTriangle, color: 'var(--red)',   bg: 'rgba(239,68,68,.08)',  border: 'rgba(239,68,68,.2)' },
  medium: { icon: AlertCircle,   color: 'var(--amber)', bg: 'rgba(245,158,11,.08)', border: 'rgba(245,158,11,.2)' },
  low:    { icon: Info,          color: 'var(--violet)', bg: 'var(--violet-dim)',   border: 'rgba(124,106,247,.2)' },
}

const ACTION_LABELS = {
  drop_rows: 'Eliminar filas',
  drop_column: 'Eliminar columna',
  impute_mean: 'Imputar con media',
  impute_median: 'Imputar con mediana',
  impute_mode: 'Imputar con moda',
  drop_duplicates: 'Eliminar duplicados',
  cap_outliers: 'Acotar (winsorizing)',
  keep: 'Mantener igual',
}

export default function SuggestionCard({ suggestion, onApply, applying }) {
  const cfg = SEVERITY_CONFIG[suggestion.severity] || SEVERITY_CONFIG.low
  const Icon = cfg.icon
  const isApplyingThis = applying === suggestion.id

  return (
    <div style={{
      border: `1px solid ${cfg.border}`, borderRadius: 'var(--radius-md)',
      background: cfg.bg, padding: '14px 16px',
      opacity: applying && !isApplyingThis ? 0.5 : 1,
      transition: 'opacity .2s',
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
        <Icon size={15} color={cfg.color} style={{ marginTop: 1, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: cfg.color, marginBottom: 3 }}>
            {suggestion.title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {suggestion.description}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {suggestion.available_actions.map(action => {
          const isRecommended = action === suggestion.recommended_action
          return (
            <button
              key={action}
              onClick={() => onApply(suggestion.id, action)}
              disabled={!!applying}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 11px', borderRadius: 7,
                border: `1px solid ${isRecommended ? 'var(--accent-border)' : 'var(--border)'}`,
                background: isRecommended ? 'var(--accent-dim)' : 'var(--bg-surface)',
                color: isRecommended ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: 12, fontWeight: isRecommended ? 500 : 400,
                cursor: applying ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-ui)',
              }}
            >
              {isApplyingThis
                ? <Loader2 size={11} style={{ animation: 'spin .8s linear infinite' }} />
                : isRecommended && <Check size={11} />
              }
              {ACTION_LABELS[action] || action}
            </button>
          )
        })}
      </div>
    </div>
  )
}
