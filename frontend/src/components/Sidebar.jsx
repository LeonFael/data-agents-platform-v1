import { BarChart2, Wrench, Brain, FileText, ChevronRight } from 'lucide-react'

const agents = [
  { id: 'analyst',   icon: BarChart2,  label: 'Analista',   sub: 'EDA · Stats · Insights', status: 'active' },
  { id: 'engineer',  icon: Wrench,     label: 'Ingeniero',  sub: 'Pipelines · Limpieza',    status: 'soon' },
  { id: 'scientist', icon: Brain,      label: 'Científico', sub: 'ML · Predicciones',        status: 'soon' },
  { id: 'narrator',  icon: FileText,   label: 'Narrador',   sub: 'Reportes · PDF',           status: 'soon' },
]

export default function Sidebar({ activeAgent, onSelectAgent }) {
  return (
    <aside style={{
      width: 'var(--sidebar-w)',
      minHeight: '100vh',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'var(--accent-dim)',
            border: '1px solid var(--accent-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BarChart2 size={14} color="var(--accent)" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              DataAgents
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
              v1.0
            </div>
          </div>
        </div>
      </div>

      {/* Agentes */}
      <nav style={{ padding: '12px 8px', flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.06em', padding: '0 8px 8px' }}>
          Agentes
        </div>
        {agents.map(agent => {
          const Icon = agent.icon
          const isActive = activeAgent === agent.id
          const isDisabled = agent.status === 'soon'
          return (
            <button
              key={agent.id}
              onClick={() => !isDisabled && onSelectAgent(agent.id)}
              disabled={isDisabled}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: isActive ? 'var(--accent-dim)' : 'transparent',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.45 : 1,
                marginBottom: 2,
                transition: 'background .15s',
                textAlign: 'left',
              }}
              onMouseEnter={e => { if (!isDisabled && !isActive) e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{
                width: 30, height: 30, borderRadius: 7,
                background: isActive ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                border: `1px solid ${isActive ? 'var(--accent-border)' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon size={13} color={isActive ? 'var(--accent)' : 'var(--text-secondary)'} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}>
                  {agent.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {agent.sub}
                </div>
              </div>
              {agent.status === 'active' && isActive && (
                <ChevronRight size={12} color="var(--accent)" />
              )}
              {agent.status === 'soon' && (
                <span className="badge badge-gray" style={{ fontSize: 9 }}>pronto</span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
          Plataforma multiagente
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>
          Python · FastAPI · Claude
        </div>
      </div>
    </aside>
  )
}
