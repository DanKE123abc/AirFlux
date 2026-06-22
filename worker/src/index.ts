import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { ScheduledEvent } from '@cloudflare/workers-types'

type Bindings = {
  DB: D1Database
  ONEMANAGER_URL: string
  ONEMANAGER_KEY: string
  ONEMANAGER_DISK: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/*', cors())

// Generate a random 6-digit code
function generatePickupCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function getExpiresAt(mode: string): string {
  const now = new Date()
  switch (mode) {
    case 'p2p': now.setHours(now.getHours() + 1); break
    case 'text': now.setHours(now.getHours() + 1); break
    case '1h': now.setHours(now.getHours() + 1); break
    case '5h': now.setHours(now.getHours() + 5); break
    case '12h': now.setHours(now.getHours() + 12); break
    case '24h': now.setHours(now.getHours() + 24); break
    case '72h': now.setHours(now.getHours() + 72); break
    default: now.setHours(now.getHours() + 1)
  }
  return now.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '')
}

async function onemanagerUpload(env: Bindings, file: File, path: string = '/AirFlux'): Promise<{ id: string; name: string; url: string }> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${env.ONEMANAGER_URL}/upload?path=${encodeURIComponent(path)}&disktag=${env.ONEMANAGER_DISK}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.ONEMANAGER_KEY}` },
    body: formData,
  })
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    const text = await res.text()
    throw new Error(`OneManager returned non-JSON: ${text.slice(0, 200)}`)
  }
  const json: any = await res.json()
  if (json.code !== 201) {
    throw new Error(`OneManager upload failed: ${json.message || json.code}`)
  }
  return { id: json.data.id, name: json.data.name, url: json.data.url }
}

async function onemanagerDelete(env: Bindings, filePath: string): Promise<void> {
  const res = await fetch(`${env.ONEMANAGER_URL}/delete?disktag=${env.ONEMANAGER_DISK}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.ONEMANAGER_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: filePath }),
  })
  const json: any = await res.json()
  if (json.code !== 200) {
    console.log(`[Delete] failed for ${filePath}: ${JSON.stringify(json)}`)
  }
}

async function onemanagerMkdir(env: Bindings, parentPath: string, name: string): Promise<void> {
  const res = await fetch(`${env.ONEMANAGER_URL}/mkdir?disktag=${env.ONEMANAGER_DISK}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.ONEMANAGER_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: parentPath, name }),
  })
  const json: any = await res.json()
  if (json.code !== 201 && json.code !== 200) {
    console.log(`[Mkdir] failed for ${parentPath}/${name}: ${JSON.stringify(json)}`)
  }
}

function getTTLSeconds(mode: string): number {
  switch (mode) {
    case 'p2p': return 3600
    case 'text': return 3600
    case '1h': return 3600
    case '5h': return 18000
    case '12h': return 43200
    case '24h': return 86400
    case '72h': return 259200
    default: return 3600
  }
}

// Create a pickup code
app.post('/api/pickup', async (c) => {
  const { mode, peerId, note, textContent, fileName, fileSize, fileType } = await c.req.json()

  if (!mode) {
    return c.json({ error: 'mode is required' }, 400)
  }

  if (!['p2p', '1h', '5h', '12h', '24h', '72h'].includes(mode)) {
    return c.json({ error: 'invalid mode' }, 400)
  }

  // Generate unique code
  let code = generatePickupCode()
  let attempts = 0
  while (attempts < 10) {
    const existing = await c.env.DB.prepare('SELECT id FROM pickup_codes WHERE code = ?').bind(code).first()
    if (!existing) break
    code = generatePickupCode()
    attempts++
  }

  if (attempts >= 10) {
    return c.json({ error: 'failed to generate unique code' }, 500)
  }

  const expiresAt = getExpiresAt(mode)

  await c.env.DB.prepare(
    `INSERT INTO pickup_codes (code, mode, peer_id, note, text_content, file_name, file_size, file_type, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(code, mode, peerId || null, note || null, textContent || null, fileName || null, fileSize || null, fileType || null, expiresAt).run()

  if (mode !== 'p2p' && !textContent) {
    await onemanagerMkdir(c.env, '/', code)
  }

  return c.json({ code, expiresAt, mode })
})

// Get presigned upload URL for timed mode (large files)
app.post('/api/pickup/:code/upload-session', async (c) => {
  const { code } = c.req.param()

  const record = await c.env.DB.prepare(
    'SELECT * FROM pickup_codes WHERE code = ? AND expires_at > datetime(\'now\')'
  ).bind(code).first()

  if (!record) {
    return c.json({ error: 'code not found or expired' }, 404)
  }

  if (record.mode === 'p2p' || record.mode === 'text') {
    return c.json({ error: 'invalid mode for upload' }, 400)
  }

  const { name, size } = await c.req.json()

  if (!name || !size) {
    return c.json({ error: 'name and size are required' }, 400)
  }

  try {
    const res = await fetch(`${c.env.ONEMANAGER_URL}/upload-session?disktag=${c.env.ONEMANAGER_DISK}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${c.env.ONEMANAGER_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, size, path: `/${code}` }),
    })

    const json: any = await res.json()

    if (!json.uploadUrl) {
      throw new Error(`OneManager upload-session failed: ${JSON.stringify(json).slice(0, 200)}`)
    }

    return c.json({ uploadUrl: json.uploadUrl, fileName: name })
  } catch (err: any) {
    return c.json({ error: err.message || 'upload-session failed' }, 500)
  }
})

// Save file list after all uploads complete
app.post('/api/pickup/:code/files', async (c) => {
  const { code } = c.req.param()

  const record = await c.env.DB.prepare(
    'SELECT * FROM pickup_codes WHERE code = ? AND expires_at > datetime(\'now\')'
  ).bind(code).first()

  if (!record) {
    return c.json({ error: 'code not found or expired' }, 404)
  }

  const { files } = await c.req.json()

  if (!Array.isArray(files) || files.length === 0) {
    return c.json({ error: 'files array is required' }, 400)
  }

  const filesJson = JSON.stringify(files)
  const totalSize = files.reduce((s: number, f: any) => s + (f.size || 0), 0)

  await c.env.DB.prepare(
    'UPDATE pickup_codes SET files = ?, file_name = ?, file_size = ? WHERE code = ?'
  ).bind(filesJson, files.length === 1 ? files[0].name : `${files.length} files`, totalSize, code).run()

  return c.json({ success: true })
})

// Lookup a pickup code (receiver side)
app.get('/api/pickup/:code', async (c) => {
  const { code } = c.req.param()

  const record = await c.env.DB.prepare(
    'SELECT * FROM pickup_codes WHERE code = ? AND expires_at > datetime(\'now\')'
  ).bind(code).first()

  if (!record) {
    return c.json({ error: 'code not found or expired' }, 404)
  }

  return c.json({
    code: record.code,
    mode: record.mode,
    peerId: record.peer_id,
    note: record.note,
    textContent: record.text_content,
    fileName: record.file_name,
    fileSize: record.file_size,
    fileType: record.file_type,
    files: record.files ? JSON.parse(record.files as string) : null,
    expiresAt: record.expires_at,
  })
})

// Update peer_id for P2P channel (called when sender's peer is ready)
app.patch('/api/pickup/:code/peer', async (c) => {
  const { code } = c.req.param()
  const { peerId } = await c.req.json()

  if (!peerId) {
    return c.json({ error: 'peerId is required' }, 400)
  }

  const result = await c.env.DB.prepare(
    'UPDATE pickup_codes SET peer_id = ? WHERE code = ? AND mode = \'p2p\' AND expires_at > datetime(\'now\')'
  ).bind(peerId, code).run()

  if (result.meta.changes === 0) {
    return c.json({ error: 'code not found or expired' }, 404)
  }

  return c.json({ success: true })
})

// Get download URLs for timed mode
app.get('/api/pickup/:code/download', async (c) => {
  const { code } = c.req.param()

  const record = await c.env.DB.prepare(
    'SELECT * FROM pickup_codes WHERE code = ? AND expires_at > datetime(\'now\')'
  ).bind(code).first<{ r2_key: string | null; mode: string; file_name: string | null; file_size: number | null; file_type: string | null; files: string | null }>()

  if (!record) {
    return c.json({ error: 'code not found or expired' }, 404)
  }

  if (record.mode === 'p2p' || record.mode === 'text') {
    return c.json({ error: 'invalid mode for download' }, 400)
  }

  if (record.files) {
    const files: { name: string; storageName: string; size: number; type: string }[] = JSON.parse(record.files)
    const items = files.map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
      downloadUrl: `${c.env.ONEMANAGER_URL}/download?path=${encodeURIComponent(`/${code}/${f.name}`)}&disktag=${c.env.ONEMANAGER_DISK}&api_key=${c.env.ONEMANAGER_KEY}`,
    }))
    return c.json({ files: items })
  }

  if (record.r2_key) {
    const downloadUrl = `${c.env.ONEMANAGER_URL}/download?path=${encodeURIComponent(record.r2_key)}&disktag=${c.env.ONEMANAGER_DISK}&api_key=${c.env.ONEMANAGER_KEY}`
    return c.json({
      files: [{
        name: record.file_name || 'download',
        size: record.file_size || 0,
        type: record.file_type || 'application/octet-stream',
        downloadUrl,
      }],
    })
  }

  return c.json({ error: 'file not uploaded yet' }, 404)
})

// Delete a pickup code (manual cancel)
app.delete('/api/pickup/:code', async (c) => {
  const { code } = c.req.param()

  try { await onemanagerDelete(c.env, `/${code}`) } catch {}

  await c.env.DB.prepare('DELETE FROM pickup_codes WHERE code = ?').bind(code).run()
  return c.json({ success: true })
})

// Expire a pickup code (used by sendBeacon on page unload — only POST)
app.post('/api/pickup/:code/expire', async (c) => {
  const { code } = c.req.param()
  try { await onemanagerDelete(c.env, `/${code}`) } catch {}
  await c.env.DB.prepare('DELETE FROM pickup_codes WHERE code = ?').bind(code).run()
  return c.json({ success: true })
})

// ICE server config for WebRTC
app.get('/api/ice', (c) => {
  return c.json({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  })
})

// Cleanup expired codes
async function cleanupExpired(env: Bindings) {
  const expired = await env.DB.prepare(
    "SELECT code FROM pickup_codes WHERE expires_at <= datetime('now')"
  ).all<{ code: string }>()

  let deletedFolders = 0
  for (const record of expired.results) {
    try {
      await onemanagerDelete(env, `/${record.code}`)
      deletedFolders++
    } catch (e: any) {
      console.log(`[Cleanup] delete error for code=${record.code}: ${e.message}`)
    }
  }

  const result = await env.DB.prepare(
    "DELETE FROM pickup_codes WHERE expires_at <= datetime('now')"
  ).run()
  console.log(`[Cleanup] deleted ${result.meta.changes} codes, ${deletedFolders} folders`)
  return result.meta.changes
}

app.get('/api/cleanup', async (c) => {
  const cleaned = await cleanupExpired(c.env)
  return c.json({ cleaned })
})

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Bindings, _ctx: ExecutionContext) {
    const cleaned = await cleanupExpired(env)
    console.log(`[Cleanup] deleted ${cleaned} expired codes`)
  },
}
