import { useState, useEffect, useRef } from 'react'
import Peer, { DataConnection } from 'peerjs'
import { decodeMessage, Message, MessageType } from './messages'

export const MAX_CHUNK_SIZE = 256 * 1024 // 256 KB

export function isFinalChunk(offset: number, fileSize: number): boolean {
  return offset + MAX_CHUNK_SIZE >= fileSize
}

export interface SenderConnection {
  peerId: string
  status: 'pending' | 'ready' | 'uploading' | 'done' | 'closed'
  progress: number
  currentFile: string | null
}

export function useSenderConnections(
  peer: Peer,
  files: File[],
  textContent?: string,
): SenderConnection[] {
  const [connections, setConnections] = useState<SenderConnection[]>([])
  const filesRef = useRef(files)
  filesRef.current = files
  const textContentRef = useRef(textContent)
  textContentRef.current = textContent

  useEffect(() => {
    const cleanupHandlers: Array<() => void> = []

    const addConn = (peerId: string) => {
      setConnections((prev) => [
        ...prev,
        { peerId, status: 'pending', progress: 0, currentFile: null },
      ])
    }

    const updateConn = (peerId: string, fn: (c: SenderConnection) => SenderConnection) => {
      setConnections((prev) =>
        prev.map((c) => (c.peerId === peerId ? fn(c) : c)),
      )
    }

    const listener = (conn: DataConnection) => {
      const peerId = conn.peer
      addConn(peerId)

      let sendChunkTimeout: ReturnType<typeof setTimeout> | null = null

      const onData = (data: unknown) => {
        try {
          const message = decodeMessage(data)

          switch (message.type) {
            case MessageType.RequestInfo: {
              updateConn(peerId, (c) => ({ ...c, status: 'ready' }))

              if (textContentRef.current) {
                conn.send({
                  type: MessageType.Note,
                  content: textContentRef.current,
                } satisfies Message)
              } else {
                conn.send({
                  type: MessageType.Info,
                  files: filesRef.current.map((f) => ({
                    fileName: f.name,
                    size: f.size,
                    type: f.type,
                  })),
                } satisfies Message)
              }
              break
            }

            case MessageType.Start: {
              const fileName = message.fileName
              let offset = message.offset
              const allFiles = filesRef.current
              const file = allFiles.find((f) => f.name === fileName)
              if (!file) {
                conn.send({
                  type: MessageType.Error,
                  error: 'File not found: ' + fileName,
                } satisfies Message)
                return
              }

              const sendNextChunk = () => {
                sendChunkTimeout = setTimeout(() => {
                  const end = Math.min(file.size, offset + MAX_CHUNK_SIZE)
                  const final = isFinalChunk(offset, file.size)

                  conn.send({
                    type: MessageType.Chunk,
                    fileName,
                    offset,
                    bytes: file.slice(offset, end),
                    final,
                  })

                  const progress = offset / file.size
                  updateConn(peerId, (c) => ({
                    ...c,
                    status: 'uploading',
                    currentFile: fileName,
                    progress: final ? 1 : progress,
                  }))

                  offset = end

                  if (!final) {
                    sendNextChunk()
                  }
                }, 0)
              }

              sendNextChunk()
              break
            }

            case MessageType.ChunkAck: {
              updateConn(peerId, (c) => ({
                ...c,
                progress: Math.min(c.progress + 0.02, 0.98),
              }))
              break
            }

            case MessageType.Done: {
              updateConn(peerId, (c) => ({ ...c, status: 'done', progress: 1 }))
              conn.close()
              break
            }
          }
        } catch (err) {
          console.error('[SenderConnections] error:', err)
        }
      }

      const onClose = () => {
        if (sendChunkTimeout) clearTimeout(sendChunkTimeout)
        updateConn(peerId, (c) => ({
          ...c,
          status: c.status === 'done' ? 'done' : 'closed',
        }))
      }

      conn.on('data', onData)
      conn.on('close', onClose)

      cleanupHandlers.push(() => {
        conn.off('data', onData)
        conn.off('close', onClose)
        conn.close()
      })
    }

    peer.on('connection', listener)

    return () => {
      peer.off('connection', listener)
      cleanupHandlers.forEach((fn) => fn())
    }
  }, [peer])

  return connections
}
