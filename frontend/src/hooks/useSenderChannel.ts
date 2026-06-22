import { useState, useEffect, useRef } from 'react'
import { createPickupCode, deletePickupCode } from '../lib/api'
import { TransferMode } from '../types'

interface SenderChannelState {
  isLoading: boolean
  error: string | null
  pickupCode: string | null
  expiresAt: string | null
}

export function useSenderChannel(
  peerId: string | null,
  mode: TransferMode,
  options?: {
    note?: string
    fileName?: string
    fileSize?: number
    textContent?: string
  },
): SenderChannelState & { createChannel: () => Promise<void> } {
  const [state, setState] = useState<SenderChannelState>({
    isLoading: false,
    error: null,
    pickupCode: null,
    expiresAt: null,
  })
  const createdCode = useRef<string | null>(null)

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (createdCode.current) {
        deletePickupCode(createdCode.current).catch(() => {})
      }
    }
  }, [])

  // Destroy channel on page unload (P2P mode — close page = delete code)
  useEffect(() => {
    if (!createdCode.current) return

    const handleUnload = () => {
      navigator.sendBeacon('/api/pickup/' + createdCode.current + '/expire')
    }

    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [state.pickupCode])

  const createChannel = async () => {
    if (!peerId) {
      setState((s) => ({ ...s, error: 'Peer not ready' }))
      return
    }

    setState((s) => ({ ...s, isLoading: true, error: null }))

    try {
      const result = await createPickupCode({
        mode,
        peerId,
        note: options?.note,
        fileName: options?.fileName,
        fileSize: options?.fileSize,
        textContent: options?.textContent,
      })

      createdCode.current = result.code
      setState({
        isLoading: false,
        error: null,
        pickupCode: result.code,
        expiresAt: result.expiresAt,
      })
    } catch (err: any) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: err.message,
      }))
    }
  }

  return { ...state, createChannel }
}
