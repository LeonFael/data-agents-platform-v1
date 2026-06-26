import { useState } from 'react'
import { BarChart2, Wrench, Brain, FileText, ChevronRight, ChevronDown, LogOut, User as UserIcon, LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import HistoryPanel from './HistoryPanel'

const agents = [
  { id: 'analyst',   icon: BarChart2,  label: 'Analista',   sub: 'EDA · Stats · Insights', status: 'active' },
  { id: 'engineer',  icon: Wrench,     label: 'Ingeniero',  sub: 'Pipelines · Limpieza',    status: 'active' },
  { id: 'scientist', icon: Brain,      label: 'Científico', sub: 'ML · Predicciones',        status: 'soon' },
  { id: 'narrator',  icon: FileText,   label: 'Narrador',   sub: 'Reportes · PDF',           status: 'soon' },
]

export default function Sidebar({ activeAgent, onSelectAgent, onSelectHistorySummary, onRequestLogin }) {
  const { isAuthenticated, user, logout } = useAuth()
  const [historyOpen, setHistoryOpen] = useState(true)

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
              v1.1
            </div>
          </div>
        </div>
      </div>

      <nav style={{ padding: '12px 8px' }}>
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

      {isAuthenticated && (
        <div style={{ flex: 1, overflowY: 'auto', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <button
            onClick={() => setHistoryOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, width: '100%',
              padding: '4px 16px 8px', border: 'none', background: 'transparent',
              cursor: 'pointer', fontFamily: 'var(--font-ui)',
            }}
          >
            {historyOpen ? <ChevronDown size={11} color="var(--text-tertiary)" /> : <ChevronRight size={11} color="var(--text-tertiary)" />}
            <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Historial
            </span>
          </button>
          {historyOpen && (
            <HistoryPanel onSelectSummary={onSelectHistorySummary} />
          )}
        </div>
      )}
      {!isAuthenticated && <div style={{ flex: 1 }} />}

      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
        {isAuthenticated ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
              background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 600, color: 'var(--accent)',
            }}>
              {(user?.full_name || user?.email || '?')[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11.5, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.full_name || user?.email}
              </div>
            </div>
            <button
              onClick={logout}
              title="Cerrar sesión"
              style={{
                width: 24, height: 24, borderRadius: 6, border: 'none',
                background: 'transparent', color: 'var(--text-tertiary)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--red)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)' }}
            >
              <LogOut size={13} />
            </button>
          </div>
        ) : (
          <button
            onClick={onRequestLogin}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '7px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-secondary)',
              fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-ui)',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <LogIn size={12} /> Iniciar sesión
          </button>
        )}
      </div>
    </aside>
  )
}
