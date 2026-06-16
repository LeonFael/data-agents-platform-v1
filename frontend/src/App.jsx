import { useState } from 'react'
import Sidebar from './components/Sidebar'
import AnalystPage from './pages/AnalystPage'

const PAGES = {
  analyst: AnalystPage,
}

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
        Este agente se activará en la siguiente fase del proyecto. Primero perfeccionamos el Analista.
      </div>
    </div>
  )
}

export default function App() {
  const [activeAgent, setActiveAgent] = useState('analyst')

  const Page = PAGES[activeAgent]

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar activeAgent={activeAgent} onSelectAgent={setActiveAgent} />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-base)' }}>
        {Page
          ? <Page />
          : <ComingSoon name={activeAgent} />
        }
      </main>
    </div>
  )
}
