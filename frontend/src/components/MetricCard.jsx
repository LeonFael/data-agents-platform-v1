import { useEffect, useRef, useState } from 'react'

function useCounter(target, duration = 900) {
  const [value, setValue] = useState(0)
  const raf = useRef(null)

  useEffect(() => {
    const num = parseFloat(target)
    if (isNaN(num)) { setValue(target); return }
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(eased * num * 10) / 10)
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])

  return value
}

export default function MetricCard({ label, value, sub, accent = false }) {
  const animated = useCounter(typeof value === 'number' ? value : 0)
  const display = typeof value === 'number' ? animated : value

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: `1px solid ${accent ? 'var(--accent-border)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-md)',
      padding: '14px 16px',
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 26,
        fontWeight: 500,
        color: accent ? 'var(--accent)' : 'var(--text-primary)',
        lineHeight: 1.1,
        marginBottom: 4,
      }}>
        {display}{typeof value === 'number' && value !== Math.round(value) ? '' : ''}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{sub}</div>}
    </div>
  )
}
