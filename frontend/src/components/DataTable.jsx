import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZE = 10

export default function DataTable({ columnInfo = [], rows = [], headers = [] }) {
  const [page, setPage] = useState(0)
  const totalPages = Math.ceil(rows.length / PAGE_SIZE)
  const slice = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  if (!headers.length) return (
    <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
      Sin datos para mostrar
    </div>
  )

  return (
    <div>
      <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--bg-elevated)' }}>
              {headers.map((h, i) => {
                const col = columnInfo.find(c => c.name === h)
                return (
                  <th key={i} style={{
                    padding: '8px 12px', textAlign: 'left',
                    fontWeight: 500, color: 'var(--text-secondary)',
                    borderBottom: '1px solid var(--border)',
                    whiteSpace: 'nowrap',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {h}
                      {col && (
                        <span className={`badge ${col.is_numeric ? 'badge-teal' : 'badge-violet'}`} style={{ fontSize: 9 }}>
                          {col.is_numeric ? 'num' : 'cat'}
                        </span>
                      )}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {slice.map((row, ri) => (
              <tr
                key={ri}
                style={{ borderBottom: '1px solid var(--border)', transition: 'background .1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {headers.map((h, ci) => {
                  const val = row[h]
                  const col = columnInfo.find(c => c.name === h)
                  const isEmpty = val === null || val === undefined || val === ''
                  return (
                    <td key={ci} style={{
                      padding: '7px 12px',
                      color: isEmpty ? 'var(--text-tertiary)' : 'var(--text-primary)',
                      fontFamily: col?.is_numeric ? 'var(--font-mono)' : 'var(--font-ui)',
                      fontSize: col?.is_numeric ? 11 : 12,
                    }}>
                      {isEmpty ? <span style={{ fontStyle: 'italic' }}>null</span> : String(val)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, rows.length)} de {rows.length.toLocaleString()} filas
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              style={btnStyle(page === 0)}
            >
              <ChevronLeft size={13} />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              style={btnStyle(page === totalPages - 1)}
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function btnStyle(disabled) {
  return {
    width: 28, height: 28, borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--bg-elevated)',
    color: disabled ? 'var(--text-tertiary)' : 'var(--text-primary)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    opacity: disabled ? 0.4 : 1,
  }
}
