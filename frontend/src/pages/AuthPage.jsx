import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { BarChart2, Mail, Lock, User, AlertCircle, Loader2 } from 'lucide-react'

export default function AuthPage({ onSkip }) {
  const { login, register, loading } = useAuth()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (mode === 'register' && password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    const result = mode === 'login'
      ? await login(email.trim(), password)
      : await register(email.trim(), password, fullName.trim())

    if (!result.success) setError(result.error)
  }

  function toggleMode() {
    setMode(m => (m === 'login' ? 'register' : 'login'))
    setError(null)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <BarChart2 size={22} color="var(--accent)" />
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>DataAgents</div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
            Plataforma multiagente · Python · FastAPI · Claude
          </div>
        </div>

        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '28px 24px',
        }}>
          <h1 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            {mode === 'login' ? 'Inicia sesión' : 'Crea tu cuenta'}
          </h1>
          <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 22 }}>
            {mode === 'login'
              ? 'Accede para ver tu historial de análisis.'
              : 'Guarda tu historial y accede desde cualquier dispositivo.'}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'register' && (
              <Field icon={User} type="text" placeholder="Nombre completo (opcional)"
                value={fullName} onChange={setFullName} />
            )}

            <Field icon={Mail} type="email" placeholder="Correo electrónico" required
              value={email} onChange={setEmail} />

            <Field icon={Lock} type="password" placeholder="Contraseña" required
              value={password} onChange={setPassword}
              hint={mode === 'register' ? 'Mínimo 8 caracteres' : null} />

            {error && (
              <div style={{
                display: 'flex', gap: 7, alignItems: 'flex-start',
                padding: '9px 12px', borderRadius: 8,
                background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)',
                color: 'var(--red)', fontSize: 12.5,
              }}>
                <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 4, padding: '10px',
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
                ? <Loader2 size={14} style={{ animation: 'spin .8s linear infinite' }} />
                : (mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta')
              }
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 18, fontSize: 12.5, color: 'var(--text-tertiary)' }}>
            {mode === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
            <button
              onClick={toggleMode}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12.5, fontFamily: 'var(--font-ui)', padding: 0 }}
            >
              {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <button
            onClick={onSkip}
            style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', textDecoration: 'underline', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-ui)' }}
          >
            Continuar sin cuenta
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ icon: Icon, hint, value, onChange, ...props }) {
  return (
    <div>
      <div style={{ position: 'relative' }}>
        <Icon size={14} color="var(--text-tertiary)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
        <input
          {...props}
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            width: '100%', padding: '9px 12px 9px 34px',
            borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--bg-elevated)', color: 'var(--text-primary)',
            fontSize: 13, fontFamily: 'var(--font-ui)', outline: 'none',
            transition: 'border-color .15s',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
      </div>
      {hint && <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)', marginTop: 4, marginLeft: 2 }}>{hint}</div>}
    </div>
  )
}
