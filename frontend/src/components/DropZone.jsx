import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react'

const ACCEPTED = {
  'text/csv': ['.csv'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/json': ['.json'],
}

export default function DropZone({ onFile, loading }) {
  const [error, setError] = useState(null)

  const onDrop = useCallback(accepted => {
    setError(null)
    if (accepted.length) onFile(accepted[0])
  }, [onFile])

  const onDropRejected = useCallback(rejected => {
    const reason = rejected[0]?.errors[0]?.code
    if (reason === 'file-too-large') setError('El archivo supera 50 MB.')
    else setError('Formato no soportado. Usa CSV, Excel o JSON.')
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, onDropRejected,
    accept: ACCEPTED,
    maxSize: 50 * 1024 * 1024,
    multiple: false,
    disabled: loading,
  })

  return (
    <div style={{ width: '100%', maxWidth: 520 }}>
      <div
        {...getRootProps()}
        style={{
          border: `1.5px dashed ${isDragActive ? 'var(--accent)' : error ? 'var(--red)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: '40px 32px',
          textAlign: 'center',
          cursor: loading ? 'not-allowed' : 'pointer',
          background: isDragActive ? 'var(--accent-dim)' : 'var(--bg-surface)',
          transition: 'all .2s',
          opacity: loading ? 0.6 : 1,
        }}
      >
        <input {...getInputProps()} />

        {/* Ícono */}
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: isDragActive ? 'var(--accent-dim)' : 'var(--bg-elevated)',
          border: `1px solid ${isDragActive ? 'var(--accent-border)' : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          {loading
            ? <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
            : isDragActive
              ? <Upload size={22} color="var(--accent)" />
              : <FileSpreadsheet size={22} color="var(--text-secondary)" />
          }
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Analizando archivo...</p>
        ) : isDragActive ? (
          <p style={{ color: 'var(--accent)', fontSize: 14, fontWeight: 500 }}>Suelta el archivo aquí</p>
        ) : (
          <>
            <p style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
              Arrastra tu archivo o{' '}
              <span style={{ color: 'var(--accent)', textDecoration: 'underline' }}>selecciona desde tu equipo</span>
            </p>
            <p style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>
              CSV · Excel (.xlsx / .xls) · JSON — hasta 50 MB
            </p>
          </>
        )}
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, color: 'var(--red)', fontSize: 12 }}>
          <AlertCircle size={13} />
          {error}
        </div>
      )}
    </div>
  )
}
