import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: `${BASE}/api/v1`,
  timeout: 60000,
})

// ── Token dinámico ────────────────────────────────────────────────────────────
let currentToken = null

export function setAuthToken(token) {
  currentToken = token
}

api.interceptors.request.use(config => {
  if (currentToken) {
    config.headers.Authorization = `Bearer ${currentToken}`
  }
  return config
})

// ── Análisis ──────────────────────────────────────────────────────────────────

export async function uploadFile(file, onProgress) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: e => {
      if (onProgress && e.total) onProgress(Math.round(e.loaded / e.total * 100))
    },
  })
  return data
}

export async function uploadBatch(files, mode = 'separate', onProgress) {
  const form = new FormData()
  files.forEach(f => form.append('files', f))
  form.append('mode', mode)
  const { data } = await api.post('/upload-batch', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: e => {
      if (onProgress && e.total) onProgress(Math.round(e.loaded / e.total * 100))
    },
  })
  return data
}

export async function sendChat(message, datasetSummary, history = []) {
  const { data } = await api.post('/chat', {
    message,
    dataset_summary: datasetSummary,
    history,
  })
  return data
}

export async function checkHealth() {
  const { data } = await api.get('/health')
  return data
}

// ── Historial ─────────────────────────────────────────────────────────────────

export async function getHistory() {
  const { data } = await api.get('/history')
  return data
}

export async function getHistoryDetail(historyId) {
  const { data } = await api.get(`/history/${historyId}`)
  return data
}

// ── Agente Ingeniero ───────────────────────────────────────────────────────────

export async function startEngineerSession(file, onProgress) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/engineer/start', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: e => {
      if (onProgress && e.total) onProgress(Math.round(e.loaded / e.total * 100))
    },
  })
  return data
}

export async function applyEngineerAction(sessionId, suggestionId, action) {
  const { data } = await api.post('/engineer/apply', {
    session_id: sessionId,
    suggestion_id: suggestionId,
    action,
  })
  return data
}

export async function undoEngineerAction(sessionId) {
  const { data } = await api.post('/engineer/undo', { session_id: sessionId })
  return data
}

export async function closeEngineerSession(sessionId) {
  const { data } = await api.delete(`/engineer/session/${sessionId}`)
  return data
}

export async function exportEngineerData(sessionId, format = 'csv') {
  const response = await api.post('/engineer/export', { session_id: sessionId, format }, {
    responseType: 'blob',
  })
  return response.data
}

export async function exportEngineerCode(sessionId) {
  const response = await api.get(`/engineer/export/${sessionId}/code`, {
    responseType: 'blob',
  })
  return response.data
}

export default api
