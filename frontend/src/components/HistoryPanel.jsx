import { useEffect, useState } from 'react'
import { getHistory, getHistoryDetail } from '../services/api'
import { FileSpreadsheet, Clock, AlertCircle, Loader2, Inbox } from 'lucide-react'

function timeAgo(isoString) {
  const diff = (Date.now() - new Date(isoString).getTime()) / 1000
  if (diff < 60) return 'hace un momento'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  return `hace ${Math.floor(diff / 86400)} d`
}

export default function HistoryPanel({ onSelectSummary }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [loadingId, setLoadingId] = useState(null)

  useEffect(() => {
    let active = true
    getHistory()
      .then(data => { if (active) setItems(data) })
      .catch(() => { if (active) setError('No se pudo cargar el historial.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  async function handleSelect(item) {
    setLoadingId(item.id)
    try {
      const summary = await getHistoryDetail(item.id)
      onSelectSummary(summary)
    } catch {
      setError('No se pudo cargar ese análisis.')
    } finally {
      setLoadingId(null)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, color: 'var(--text-tertiary)' }}>
        <Loader2 size={16} style={{ animation: 'spin .8s linear infinite' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '10px 12px', fontSize: 12, color: 'var(--red)' }}>
        <AlertCircle size={13} /> {error}
      </div>
    )
  }

  if (!items.length) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 12px', color: 'var(--text-tertiary)' }}>
        <Inbox size={20} style={{ marginBottom: 6, opacity: 0.5 }} />
        <div style={{ fontSize: 12 }}>Aún no tienes análisis guardados.</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 8px' }}>
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => handleSelect(item)}
          disabled={loadingId === item.id}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 8px', borderRadius: 7, border: 'none',
            background: 'transparent', cursor: 'pointer', textAlign: 'left',
            fontFamily: 'var(--font-ui)', width: '100%',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {loadingId === item.id
            ? <Loader2 size={12} color="var(--accent)" style={{ animation: 'spin .8s linear infinite', flexShrink: 0 }} />
            : <FileSpreadsheet size={12} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11.5, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.file_name}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 10, color: 'var(--text-tertiary)' }}>
              <Clock size={9} />
              {timeAgo(item.created_at)}
              {item.rows != null && <span>· {item.rows.toLocaleString()}f</span>}
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
