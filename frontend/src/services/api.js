import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: `${BASE}/api/v1`,
  timeout: 60000,
})

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
