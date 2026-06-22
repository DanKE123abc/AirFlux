'use client'

import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react'
import Peer from 'peerjs'

export type WebRTCPeerValue = {
  peer: Peer
  stop: () => void
}

const WebRTCContext = React.createContext<WebRTCPeerValue | null>(null)

export const useWebRTCPeer = (): WebRTCPeerValue => {
  const value = useContext(WebRTCContext)
  if (value === null) {
    throw new Error('useWebRTC must be used within a WebRTCProvider')
  }
  return value
}

let globalPeer: Peer | null = null

async function getOrCreateGlobalPeer(): Promise<Peer> {
  if (!globalPeer) {
    const response = await fetch('/api/ice')
    const { iceServers } = await response.json()

    globalPeer = new Peer({
      config: { iceServers },
    })
  }

  if (globalPeer.id) {
    return globalPeer
  }

  await new Promise<void>((resolve) => {
    const listener = (id: string) => {
      globalPeer?.off('open', listener)
      resolve()
    }
    globalPeer?.on('open', listener)
  })

  return globalPeer
}

export default function WebRTCProvider({
  children,
  onPeerId,
}: {
  children?: React.ReactNode
  onPeerId?: (id: string) => void
}): React.ReactElement | null {
  const [peerValue, setPeerValue] = useState<Peer | null>(globalPeer)
  const [error, setError] = useState<Error | null>(null)

  const stop = useCallback(() => {
    globalPeer?.destroy()
    globalPeer = null
    setPeerValue(null)
  }, [])

  useEffect(() => {
    getOrCreateGlobalPeer()
      .then((p) => {
        setPeerValue(p)
        onPeerId?.(p.id)
      })
      .catch(setError)
  }, [onPeerId])

  const value = useMemo(() => {
    if (!peerValue) return null
    return { peer: peerValue, stop }
  }, [peerValue, stop])

  if (error) {
    return <div className="text-red-500 text-sm p-4">WebRTC error: {error.message}</div>
  }

  if (!value) {
    return (
      <div className="flex items-center justify-center gap-2 text-slate-500 py-4">
        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <span className="text-sm">Initializing WebRTC peer...</span>
      </div>
    )
  }

  return (
    <WebRTCContext.Provider value={value}>{children}</WebRTCContext.Provider>
  )
}
