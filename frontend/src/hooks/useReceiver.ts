import { useState, useCallback, useRef, useEffect } from 'react'
import { useWebRTCPeer } from '../components/WebRTCProvider'
import { ChunkMessage, decodeMessage, Message, MessageType } from './messages'
import { DataConnection } from 'peerjs'

interface ReceiverState {
  status: 'connecting' | 'connected' | 'downloading' | 'done' | 'error'
  files: Array<{ fileName: string; size: number; type: string }> | null
  noteContent: string | null
  progress: number
  totalBytes: number
  downloadedBytes: number
  error: string | null
}

export function useReceiver(targetPeerId: string | null) {
  const { peer } = useWebRTCPeer()
  const [state, setState] = useState<ReceiverState>({
    status: 'connecting',
    files: null,
    noteContent: null,
    progress: 0,
    totalBytes: 0,
    downloadedBytes: 0,
    error: null,
  })
  const connRef = useRef<DataConnection | null>(null)
  const chunksRef = useRef<Map<string, BlobPart[]>>(new Map())
  const totalBytesRef = useRef(0)
  const downloadedRef = useRef(0)
  const filesRef = useRef<Array<{ fileName: string; size: number; type: string }> | null>(null)
  const nextFileIndexRef = useRef(0)

  const startNextFile = useCallback((conn: DataConnection) => {
    const files = filesRef.current
    if (!files || nextFileIndexRef.current >= files.length) {
      // All files done
      conn.send({ type: MessageType.Done } satisfies Message)
      setState((s) => ({ ...s, status: 'done', progress: 1 }))
      return
    }

    const file = files[nextFileIndexRef.current]
    nextFileIndexRef.current++
    conn.send({
      type: MessageType.Start,
      fileName: file.fileName,
      offset: 0,
    } satisfies Message)
  }, [])

  useEffect(() => {
    if (!targetPeerId || !peer) return

    const conn = peer.connect(targetPeerId, { reliable: true })
    connRef.current = conn
    downloadedRef.current = 0
    nextFileIndexRef.current = 0
    chunksRef.current = new Map()

    const handleOpen = () => {
      conn.send({ type: MessageType.RequestInfo } satisfies Message)
    }

    const handleData = (data: unknown) => {
      try {
        const message = decodeMessage(data)

        switch (message.type) {
          case MessageType.Info: {
            filesRef.current = message.files
            totalBytesRef.current = message.files.reduce((sum, f) => sum + f.size, 0)

            setState((s) => ({
              ...s,
              status: 'connected',
              files: message.files,
              totalBytes: totalBytesRef.current,
            }))

            // Auto-start downloading the first file
            startNextFile(conn)
            break
          }

          case MessageType.Note: {
            setState((s) => ({
              ...s,
              status: 'done',
              noteContent: message.content,
            }))
            conn.send({ type: MessageType.Done } satisfies Message)
            conn.close()
            break
          }

          case MessageType.Chunk: {
            const { fileName, bytes, final } = message
            const chunk = bytes as Blob

            if (!chunksRef.current.has(fileName)) {
              chunksRef.current.set(fileName, [])
            }
            chunksRef.current.get(fileName)!.push(chunk)

            downloadedRef.current += chunk.size

            setState((s) => ({
              ...s,
              status: 'downloading',
              downloadedBytes: downloadedRef.current,
              progress: totalBytesRef.current
                ? downloadedRef.current / totalBytesRef.current
                : 0,
            }))

            // Send ack
            conn.send({
              type: MessageType.ChunkAck,
              fileName,
              offset: message.offset,
              bytesReceived: chunk.size,
            } satisfies Message)

            if (final) {
              // Assemble and download the complete file
              const allChunks = chunksRef.current.get(fileName)!
              const blob = new Blob(allChunks)
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = fileName
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              URL.revokeObjectURL(url)
              chunksRef.current.delete(fileName)

              // Start next file
              startNextFile(conn)
            }
            break
          }

          case MessageType.Done: {
            setState((s) => ({ ...s, status: 'done', progress: 1 }))
            break
          }

          case MessageType.Error: {
            setState((s) => ({ ...s, status: 'error', error: message.error }))
            break
          }
        }
      } catch (err) {
        console.error('[Receiver] error:', err)
      }
    }

    const handleClose = () => {
      setState((s) => {
        if (s.status !== 'done' && s.status !== 'error') {
          return { ...s, status: 'error', error: 'Connection closed' }
        }
        return s
      })
    }

    const handleError = (err: Error) => {
      setState((s) => ({ ...s, status: 'error', error: err.message }))
    }

    conn.on('open', handleOpen)
    conn.on('data', handleData)
    conn.on('close', handleClose)
    conn.on('error', handleError)

    return () => {
      if (conn.open) conn.close()
      conn.off('open', handleOpen)
      conn.off('data', handleData)
      conn.off('close', handleClose)
      conn.off('error', handleError)
    }
  }, [peer, targetPeerId, startNextFile])

  const disconnect = useCallback(() => {
    connRef.current?.close()
    connRef.current = null
  }, [])

  return { state, disconnect }
}
