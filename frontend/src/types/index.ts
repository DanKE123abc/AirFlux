export type TransferMode = 'p2p' | '1h' | '5h' | '12h' | '24h' | '72h'

export type SendType = 'file' | 'folder' | 'text'

export interface PickupRecord {
  code: string
  mode: string
  peerId: string | null
  note: string | null
  textContent: string | null
  fileName: string | null
  fileSize: number | null
  fileType: string | null
  expiresAt: string
}

export interface TransferFile {
  file: File
  name: string
  size: number
  type: string
  relativePath: string
}

export interface PeerFileInfo {
  fileName: string
  size: number
  type: string
}
