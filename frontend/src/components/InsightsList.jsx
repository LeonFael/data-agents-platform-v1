import { AlertTriangle, Info, CheckCircle, Zap } from 'lucide-react'

const TYPE_CONFIG = {
  warning: { icon: AlertTriangle, color: 'var(--amber)',  bg: 'rgba(245,158,11,.08)',  border: 'rgba(245,158,11,.2)' },
  info:    { icon: Info,          color: 'var(--violet)', bg: 'var(--violet-dim)',      border: 'rgba(124,106,247,.2)' },
  success: { icon: CheckCircle,   color: 'var(--green)',  bg: 'rgba(34,197,94,.08)',   border: 'rgba(34,197,94,.2)' },
  error:   { icon: Zap,           color: 'var(--red)',    bg: 'rgba(239,68,68,.08)',   border: 'rgba(239,68,68,.2)' },
}

export default function InsightsList({ insights = [] }) {
  if (!insights.length) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {insights.map((ins, i) => {
        const cfg = TYPE_CONFIG[ins.type] || TYPE_CONFIG.info
        const Icon = cfg.icon
        return (
          <div
            key={i}
            className="fade-up"
            style={{
              display: 'flex', gap: 12, alignItems: 'flex-start',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: cfg.bg,
              border: `1px solid ${cfg.border}`,
              animationDelay: `${i * 50}ms`,
            }}
          >
            <Icon size={14} color={cfg.color} style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: cfg.color, marginBottom: 2 }}>
                {ins.title}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {ins.detail}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
