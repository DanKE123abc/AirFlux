// In dev, Vite proxies /api to localhost:8787
// In production, worker serves both API and static assets on same domain
const API_BASE = '/api'

export async function createPickupCode(params: {
  mode: string
  peerId?: string
  note?: string
  textContent?: string
  fileName?: string
  fileSize?: number
  fileType?: string
}) {
  const res = await fetch(`${API_BASE}/pickup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to create pickup code')
  }
  return res.json()
}

export async function lookupPickupCode(code: string) {
  const res = await fetch(`${API_BASE}/pickup/${code}`)
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Code not found or expired')
  }
  return res.json()
}

export async function updatePeerId(code: string, peerId: string) {
  const res = await fetch(`${API_BASE}/pickup/${code}/peer`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ peerId }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to update peer')
  }
  return res.json()
}

export async function deletePickupCode(code: string) {
  await fetch(`${API_BASE}/pickup/${code}`, { method: 'DELETE' })
}

export async function uploadFileForPickup(
  code: string,
  file: File,
  onProgress?: (pct: number, speed: number) => void,
) {
  const sessionRes = await fetch(`${API_BASE}/pickup/${code}/upload-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: file.name, size: file.size }),
  })
  if (!sessionRes.ok) {
    const err = await sessionRes.json()
    throw new Error(err.error || 'Failed to get upload session')
  }
  const { uploadUrl, fileName } = await sessionRes.json()

  return new Promise<{ success: boolean; fileName: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Range', `bytes 0-${file.size - 1}/${file.size}`)
    xhr.setRequestHeader('Content-Length', String(file.size))
    let lastLoaded = 0
    let lastTime = Date.now()
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const now = Date.now()
        const dt = (now - lastTime) / 1000
        const speed = dt > 0 ? (e.loaded - lastLoaded) / dt : 0
        lastLoaded = e.loaded
        lastTime = now
        onProgress(e.loaded / e.total, speed)
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ success: true, fileName })
      } else {
        reject(new Error(`Upload failed: ${xhr.responseText.slice(0, 200)}`))
      }
    }
    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.send(file)
  })
}

export async function savePickupFiles(code: string, files: { name: string; storageName: string; size: number; type: string }[]) {
  const res = await fetch(`${API_BASE}/pickup/${code}/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to save files')
  }
  return res.json()
}

export async function getDownloadUrls(code: string) {
  const res = await fetch(`${API_BASE}/pickup/${code}/download`)
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to get download URL')
  }
  return res.json()
}

export async function getICEConfig() {
  const res = await fetch(`${API_BASE}/ice`)
  return res.json()
}
