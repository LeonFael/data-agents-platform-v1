import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import Sidebar from './components/Sidebar'
import AnalystPage from './pages/AnalystPage'
import EngineerPage from './pages/EngineerPage'
import AuthPage from './pages/AuthPage'

function ComingSoon({ name }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: 'var(--text-tertiary)', gap: 12,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22,
      }}>🔧</div>
      <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-secondary)' }}>
        Agente {name} — próximamente
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-tertiary)', maxWidth: 320, textAlign: 'center', lineHeight: 1.6 }}>
        Este agente se activará en la siguiente fase del proyecto.
      </div>
    </div>
  )
}

function AppShell() {
  const { isAuthenticated } = useAuth()
  const [guestMode, setGuestMode] = useState(false)
  const [activeAgent, setActiveAgent] = useState('analyst')
  const [historySummary, setHistorySummary] = useState(null)
  const [analystKey, setAnalystKey] = useState(0)

  if (!isAuthenticated && !guestMode) {
    return <AuthPage onSkip={() => setGuestMode(true)} />
  }

  function handleSelectHistorySummary(summary) {
    setHistorySummary(summary)
    setActiveAgent('analyst')
    setAnalystKey(k => k + 1)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        activeAgent={activeAgent}
        onSelectAgent={setActiveAgent}
        onSelectHistorySummary={handleSelectHistorySummary}
        onRequestLogin={() => setGuestMode(false)}
      />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-base)' }}>
        {activeAgent === 'analyst' && <AnalystPage key={analystKey} initialSummary={historySummary} />}
        {activeAgent === 'engineer' && <EngineerPage />}
        {activeAgent !== 'analyst' && activeAgent !== 'engineer' && <ComingSoon name={activeAgent} />}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
