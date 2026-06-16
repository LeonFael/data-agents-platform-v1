import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User } from 'lucide-react'
import { sendChat } from '../services/api'

const SUGGESTIONS = [
  '¿Cuál es la columna con más nulos?',
  '¿Hay outliers en los datos?',
  'Dame un resumen ejecutivo',
  '¿Qué columna tiene mayor variabilidad?',
  '¿Cuáles son los valores más frecuentes?',
]

export default function ChatPanel({ summary }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Dataset cargado: **${summary.file_name}** — ${summary.rows.toLocaleString()} filas × ${summary.columns} columnas. ¿Qué quieres explorar?` }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(text) {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')
    const history = messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)
    try {
      const { reply } = await sendChat(msg, summary, history)
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error al conectar con el agente. Verifica que el backend esté corriendo.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', minHeight: 400, maxHeight: 600,
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--bg-surface)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Bot size={13} color="var(--accent)" />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Agente Analista</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Pregunta en lenguaje natural</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--accent)' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse-dot 2s ease infinite' }} />
          en línea
        </div>
      </div>

      {/* Mensajes */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
              background: m.role === 'assistant' ? 'var(--accent-dim)' : 'var(--bg-elevated)',
              border: `1px solid ${m.role === 'assistant' ? 'var(--accent-border)' : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {m.role === 'assistant' ? <Bot size={12} color="var(--accent)" /> : <User size={12} color="var(--text-secondary)" />}
            </div>
            <div style={{
              maxWidth: '82%',
              padding: '8px 12px',
              borderRadius: m.role === 'user' ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
              background: m.role === 'user' ? 'var(--accent-dim)' : 'var(--bg-elevated)',
              border: `1px solid ${m.role === 'user' ? 'var(--accent-border)' : 'var(--border)'}`,
              fontSize: 13,
              color: 'var(--text-primary)',
              lineHeight: 1.55,
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bot size={12} color="var(--accent)" />
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[0,1,2].map(j => (
                <div key={j} style={{
                  width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)',
                  animation: `pulse-dot 1.2s ease ${j*0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Sugerencias */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {SUGGESTIONS.slice(0, 3).map((s, i) => (
          <button
            key={i}
            onClick={() => send(s)}
            disabled={loading}
            style={{
              fontSize: 11, padding: '3px 10px',
              borderRadius: 99, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-secondary)',
              cursor: 'pointer', fontFamily: 'var(--font-ui)',
              transition: 'all .15s',
            }}
            onMouseEnter={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.color = 'var(--accent)' }}
            onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-secondary)' }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Pregunta algo sobre los datos..."
          disabled={loading}
          style={{
            flex: 1, padding: '8px 12px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--bg-elevated)',
            color: 'var(--text-primary)', fontSize: 13,
            fontFamily: 'var(--font-ui)', outline: 'none',
            transition: 'border-color .15s',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          style={{
            width: 36, height: 36, borderRadius: 8, border: 'none',
            background: input.trim() ? 'var(--accent)' : 'var(--bg-elevated)',
            cursor: input.trim() ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background .15s', flexShrink: 0,
          }}
        >
          <Send size={14} color={input.trim() ? '#0E1117' : 'var(--text-tertiary)'} />
        </button>
      </div>
    </div>
  )
}
