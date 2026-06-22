import { useState, useRef, useCallback, useEffect } from 'react'
import Vditor from 'vditor'
import 'vditor/dist/index.css'
import QRCode from 'qrcode'
import {
  ArrowLeft, FileIcon, FolderIcon, NoteIcon, ClockIcon,
  WifiIcon, CopyIcon, CheckIcon, LoaderIcon,
} from '../components/Icons'
import WebRTCProvider, { useWebRTCPeer } from '../components/WebRTCProvider'
import { useSenderChannel } from '../hooks/useSenderChannel'
import { useSenderConnections, SenderConnection } from '../hooks/useSenderConnections'
import { createPickupCode, uploadFileForPickup, savePickupFiles } from '../lib/api'
import { TransferMode } from '../types'

function ShareLinkSection({ code }: { code: string }) {
  const [copiedLink, setCopiedLink] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const link = `${window.location.origin}/?code=${code}`

  const handleCopyLink = () => {
    navigator.clipboard.writeText(link)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ url: link })
    } else {
      handleCopyLink()
    }
  }

  useEffect(() => {
    if (showQR && !qrDataUrl) {
      QRCode.toDataURL(link, { width: 200, margin: 2 }).then(setQrDataUrl)
    }
  }, [showQR, link, qrDataUrl])

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
        <span className="text-xs text-slate-500 truncate flex-1 select-all">{link}</span>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleCopyLink}
            className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors text-slate-500 hover:text-blue-500"
            title="复制链接"
          >
            {copiedLink ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4" />}
          </button>
          <button
            onClick={handleShare}
            className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors text-slate-500 hover:text-blue-500"
            title="分享链接"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </button>
          <button
            onClick={() => setShowQR(!showQR)}
            className={`p-1.5 rounded-lg transition-colors ${showQR ? 'bg-blue-100 text-blue-500' : 'hover:bg-slate-200 text-slate-500 hover:text-blue-500'}`}
            title="显示二维码"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </button>
        </div>
      </div>
      {showQR && qrDataUrl && (
        <div className="flex justify-center animate-pop-in">
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <img src={qrDataUrl} alt="QR Code" className="w-40 h-40" />
          </div>
        </div>
      )}
    </div>
  )
}

function TextShareView({
  textContent,
  note,
  mode,
  onBack,
}: {
  textContent: string
  note: string
  mode: TransferMode
  onBack: () => void
}) {
  const [code, setCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (code) return
    createPickupCode({
      mode,
      textContent,
      note: note || undefined,
    }).then(res => {
      setCode(res.code)
    }).catch(err => {
      setError(err.message)
    })
  }, [code, textContent, note, mode])

  const handleCopy = useCallback(() => {
    if (code) {
      navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [code])

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-md">
      {error && (
        <div className="w-full p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
      )}

      {!code && !error && (
        <div className="flex flex-col items-center gap-4 py-12">
          <LoaderIcon className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-slate-500">正在生成取件码...</p>
        </div>
      )}

      {code && (
        <>
          <div className="text-center animate-pop-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <CheckIcon className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">笔记已保存</h2>
            <p className="text-slate-500 mt-1">分享取件码给对方，{mode === '1h' ? '1小时' : mode === '5h' ? '5小时' : mode === '12h' ? '12小时' : mode === '24h' ? '24小时' : '72小时'}后自动失效</p>
          </div>

          <div className="w-full text-center animate-slide-up delay-75">
            <div
              onClick={handleCopy}
              className="inline-flex items-center gap-3 px-8 py-4 bg-white rounded-2xl border-2 border-dashed border-blue-400 cursor-pointer hover:bg-blue-50 transition-all duration-200 group active:scale-[0.98]"
            >
              <span className="text-5xl font-mono font-bold tracking-[0.2em] text-blue-600 select-all">{code}</span>
              {copied ? (
                <CheckIcon className="w-6 h-6 text-green-500 shrink-0" />
              ) : (
                <CopyIcon className="w-6 h-6 text-slate-400 group-hover:text-blue-500 shrink-0" />
              )}
            </div>
            <p className="text-xs text-slate-400 mt-2">点击复制取件码</p>
          </div>

          <div className="animate-slide-up delay-150"><ShareLinkSection code={code} /></div>

          <div className="w-full p-4 bg-white rounded-xl border border-slate-200 animate-slide-up delay-225">
            <div className="flex items-center gap-3">
              <NoteIcon className="w-5 h-5 text-slate-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-slate-400 mb-1">笔记内容</div>
                <div className="text-sm text-slate-700 whitespace-pre-wrap break-all max-h-40 overflow-y-auto">{textContent}</div>
              </div>
            </div>
          </div>

          {note && (
            <div className="text-sm text-slate-500">备注：{note}</div>
          )}
        </>
      )}

      <button onClick={onBack} className="text-slate-400 hover:text-slate-600 text-sm transition-colors">返回首页</button>
    </div>
  )
}

function NoteEditorOverlay({ value, onChange, onClose }: { value: string; onChange: (v: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const vditorRef = useRef<Vditor | null>(null)

  useEffect(() => {
    if (vditorRef.current || !ref.current) return
    vditorRef.current = new Vditor(ref.current, {
      mode: 'wysiwyg',
      value,
      placeholder: '请输入要分享的 Markdown 内容...',
      height: '100%',
      lang: 'zh_CN',
      toolbar: [
        'emoji', 'headings', 'bold', 'italic', 'strike', '|',
        'list', 'ordered-list', 'check', '|',
        'quote', 'line', 'code', 'inline-code', '|',
        'link', 'table', '|',
        'fullscreen', '|',
        'undo', 'redo',
      ],
      toolbarConfig: { pin: true },
      cache: { enable: false },
      input: (v: string) => onChange(v),
    })
    return () => {
      vditorRef.current?.destroy()
      vditorRef.current = null
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white animate-overlay-in">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0 animate-slide-down">
        <h3 className="text-lg font-semibold text-slate-800">编辑笔记</h3>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <div ref={ref} className="h-full" />
      </div>
    </div>
  )
}

function TextP2PView({
  textContent,
  note,
  onBack,
}: {
  textContent: string
  note: string
  onBack: () => void
}) {
  const [peerId, setPeerId] = useState<string | null>(null)
  const [code, setCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const peerReady = useCallback((id: string) => {
    setPeerId(id)
  }, [])

  if (!peerId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <WebRTCProvider onPeerId={peerReady}>
          <LoaderIcon className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-slate-500">正在建立 P2P 连接...</p>
        </WebRTCProvider>
      </div>
    )
  }

  return (
    <WebRTCProvider onPeerId={peerReady}>
      <TextP2PInner
        peerId={peerId}
        textContent={textContent}
        note={note}
        onBack={onBack}
        code={code}
        setCode={setCode}
        copied={copied}
        setCopied={setCopied}
      />
    </WebRTCProvider>
  )
}

function TextP2PInner({
  peerId,
  textContent,
  note,
  onBack,
  code,
  setCode,
  copied,
  setCopied,
}: {
  peerId: string
  textContent: string
  note: string
  onBack: () => void
  code: string | null
  setCode: (c: string) => void
  copied: boolean
  setCopied: (c: boolean) => void
}) {
  const { peer } = useWebRTCPeer()
  const connections = useSenderConnections(peer, [], textContent)

  const channel = useSenderChannel(peerId, 'p2p', {
    note: note || undefined,
    textContent,
  })

  useEffect(() => {
    if (!code && !channel.isLoading && !channel.error && !channel.pickupCode) {
      channel.createChannel()
    }
  }, [code, channel])

  useEffect(() => {
    if (channel.pickupCode && !code) {
      setCode(channel.pickupCode)
    }
  }, [channel.pickupCode, code, setCode])

  const handleCopy = useCallback(() => {
    if (code) {
      navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [code, setCopied])

  const activeConn = connections.find(
    (c: SenderConnection) => c.status === 'ready' || c.status === 'done',
  )

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-md">
      {channel.error && (
        <div className="w-full p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {channel.error}
        </div>
      )}

      {channel.isLoading && (
        <div className="flex flex-col items-center gap-4 py-12">
          <LoaderIcon className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-slate-500">正在生成取件码...</p>
        </div>
      )}

      {code && (
        <>
          <div className="text-center animate-pop-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <CheckIcon className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">取件码已生成</h2>
            <p className="text-slate-500 mt-1">分享取件码给对方，关闭页面即失效</p>
          </div>

          <div className="w-full text-center animate-slide-up delay-75">
            <div
              onClick={handleCopy}
              className="inline-flex items-center gap-3 px-8 py-4 bg-white rounded-2xl border-2 border-dashed border-blue-400 cursor-pointer hover:bg-blue-50 transition-all duration-200 group active:scale-[0.98]"
            >
              <span className="text-5xl font-mono font-bold tracking-[0.2em] text-blue-600 select-all">
                {code}
              </span>
              {copied ? (
                <CheckIcon className="w-6 h-6 text-green-500 shrink-0" />
              ) : (
                <CopyIcon className="w-6 h-6 text-slate-400 group-hover:text-blue-500 shrink-0" />
              )}
            </div>
            <p className="text-xs text-slate-400 mt-2">点击复制取件码</p>
          </div>

          <div className="animate-slide-up delay-150"><ShareLinkSection code={code} /></div>

          <div className="w-full p-4 rounded-xl bg-white border border-slate-200 animate-slide-up delay-225">
            <div className="flex items-center gap-3">
              <NoteIcon className="w-5 h-5 text-slate-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-slate-400 mb-1">笔记内容</div>
                <div className="text-sm text-slate-700 whitespace-pre-wrap break-all max-h-40 overflow-y-auto">{textContent}</div>
              </div>
            </div>
          </div>

          <div className="w-full p-4 rounded-xl bg-white border border-slate-200 animate-slide-up delay-300">
            <div className="flex items-center gap-3">
              <WifiIcon className={`w-5 h-5 ${connections.length === 0 ? 'text-amber-500 animate-pulse' : 'text-green-500'}`} />
              <div>
                <div className="text-sm font-medium text-slate-800">
                  {connections.length === 0 && '等待对方连接...'}
                  {activeConn?.status === 'ready' && '对方已连接，正在发送笔记...'}
                  {activeConn?.status === 'done' && '笔记已发送！'}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {connections.length > 0
                    ? `${connections.filter((c) => c.status === 'done').length}/${connections.length} 传输完成`
                    : '0 个连接'}
                </div>
              </div>
            </div>
          </div>

          {note && (
            <div className="text-sm text-slate-500">备注：{note}</div>
          )}
        </>
      )}

      <button onClick={onBack} className="text-slate-400 hover:text-slate-600 text-sm transition-colors">
        返回首页
      </button>
    </div>
  )
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec >= 1048576) return `${(bytesPerSec / 1048576).toFixed(1)} MB/s`
  if (bytesPerSec >= 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`
  return `${bytesPerSec.toFixed(0)} B/s`
}

interface Props {
  onBack: () => void
  preloadedFiles?: File[] | null
  preloadedText?: string | null
}

type Step = 'choose-type' | 'choose-files' | 'sharing'

const MODES: { value: TransferMode; label: string }[] = [
  { value: 'p2p', label: '面对面快传' },
  { value: '1h', label: '1小时' },
  { value: '5h', label: '5小时' },
  { value: '12h', label: '12小时' },
  { value: '24h', label: '24小时' },
  { value: '72h', label: '72小时' },
]

const TEXT_MODES: { value: TransferMode; label: string }[] = [
  { value: 'p2p', label: '快传' },
  { value: '1h', label: '1小时' },
  { value: '5h', label: '5小时' },
  { value: '12h', label: '12小时' },
  { value: '24h', label: '24小时' },
  { value: '72h', label: '72小时' },
]

function SharingView({
  files,
  mode,
  note,
  onBack,
}: {
  files: File[]
  mode: TransferMode
  note: string
  onBack: () => void
}) {
  const [peerId, setPeerId] = useState<string | null>(null)
  const [code, setCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // WebRTC peer is ready inside this provider
  const peerReady = useCallback((id: string) => {
    setPeerId(id)
  }, [])

  if (!peerId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <WebRTCProvider onPeerId={peerReady}>
          <LoaderIcon className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-slate-500">正在建立 P2P 连接...</p>
        </WebRTCProvider>
      </div>
    )
  }

  return (
    <WebRTCProvider onPeerId={peerReady}>
      <SharingInner
        peerId={peerId}
        files={files}
        mode={mode}
        note={note}
        onBack={onBack}
        code={code}
        setCode={setCode}
        copied={copied}
        setCopied={setCopied}
      />
    </WebRTCProvider>
  )
}

function SharingInner({
  peerId,
  files,
  mode,
  note,
  onBack,
  code,
  setCode,
  copied,
  setCopied,
}: {
  peerId: string
  files: File[]
  mode: TransferMode
  note: string
  onBack: () => void
  code: string | null
  setCode: (c: string) => void
  copied: boolean
  setCopied: (c: boolean) => void
}) {
  const { peer } = useWebRTCPeer()
  const connections = useSenderConnections(peer, files)

  const totalSize = files.reduce((s, f) => s + f.size, 0)
  const channel = useSenderChannel(peerId, mode, {
    note: note || undefined,
    fileName: files.length === 1 ? files[0].name : `${files.length} files`,
    fileSize: totalSize,
  })

  // Create pickup code when component mounts
  useEffect(() => {
    if (!code && !channel.isLoading && !channel.error && !channel.pickupCode) {
      channel.createChannel()
    }
  }, [code, channel])

  // Set code when we get it back
  useEffect(() => {
    if (channel.pickupCode && !code) {
      setCode(channel.pickupCode)
    }
  }, [channel.pickupCode, code, setCode])

  const handleCopy = useCallback(() => {
    if (code) {
      navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [code, setCopied])

  const activeConn = connections.find(
    (c: SenderConnection) => c.status === 'uploading' || c.status === 'ready',
  )

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-md">
      {channel.error && (
        <div className="w-full p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {channel.error}
        </div>
      )}

      {channel.isLoading && (
        <div className="flex flex-col items-center gap-4 py-12">
          <LoaderIcon className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-slate-500">正在生成取件码...</p>
        </div>
      )}

      {code && (
        <>
          <div className="text-center animate-pop-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <CheckIcon className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">取件码已生成</h2>
            <p className="text-slate-500 mt-1">
              {mode === 'p2p'
                ? '分享取件码给对方，关闭页面即失效'
                : '分享取件码给对方'}
            </p>
          </div>

          {/* Pickup Code */}
          <div className="w-full text-center animate-slide-up delay-75">
            <div
              onClick={handleCopy}
              className="inline-flex items-center gap-3 px-8 py-4 bg-white rounded-2xl border-2 border-dashed border-blue-400 cursor-pointer hover:bg-blue-50 transition-all duration-200 group active:scale-[0.98]"
            >
              <span className="text-5xl font-mono font-bold tracking-[0.2em] text-blue-600 select-all">
                {code}
              </span>
              {copied ? (
                <CheckIcon className="w-6 h-6 text-green-500 shrink-0" />
              ) : (
                <CopyIcon className="w-6 h-6 text-slate-400 group-hover:text-blue-500 shrink-0" />
              )}
            </div>
            <p className="text-xs text-slate-400 mt-2">点击复制取件码</p>
          </div>

          <div className="animate-slide-up delay-150"><ShareLinkSection code={code} /></div>

          {/* File info */}
          <div className="w-full space-y-2 animate-slide-up delay-225">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 transition-all duration-200 hover:shadow-sm">
                <FileIcon className="w-5 h-5 text-slate-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-800 truncate">{f.name}</div>
                  <div className="text-xs text-slate-400">
                    {(f.size / 1024 / 1024).toFixed(1)} MB
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* P2P Status */}
          {mode === 'p2p' && (
            <div className="w-full p-4 rounded-xl bg-white border border-slate-200 animate-slide-up delay-300">
              <div className="flex items-center gap-3">
                <WifiIcon className={`w-5 h-5 ${connections.length === 0 ? 'text-amber-500 animate-pulse' : 'text-green-500'}`} />
                <div>
                  <div className="text-sm font-medium text-slate-800">
                    {connections.length === 0 && '等待对方连接...'}
                    {activeConn?.status === 'ready' && '对方已连接，准备传输'}
                    {activeConn?.status === 'uploading' && `正在传输: ${activeConn.currentFile}`}
                    {connections.some((c) => c.status === 'done') && '传输完成！'}
                  </div>
                  {activeConn?.status === 'uploading' && (
                    <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${(activeConn.progress * 100).toFixed(0)}%` }}
                      />
                    </div>
                  )}
                  <div className="text-xs text-slate-400 mt-1">
                    {connections.length > 0
                      ? `${connections.filter((c) => c.status === 'done').length}/${connections.length} 传输完成`
                      : '0 个连接'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {note && (
            <div className="text-sm text-slate-500">备注：{note}</div>
          )}
        </>
      )}

      <button onClick={onBack} className="text-slate-400 hover:text-slate-600 text-sm transition-colors">
        返回首页
      </button>
    </div>
  )
}

function TimedShareView({
  files,
  mode,
  note,
  onBack,
}: {
  files: File[]
  mode: TransferMode
  note: string
  onBack: () => void
}) {
  const [code, setCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [speed, setSpeed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [uploaded, setUploaded] = useState(false)

  useEffect(() => {
    if (code || uploading) return

    const doUpload = async () => {
      setUploading(true)
      try {
        const totalSize = files.reduce((s, f) => s + f.size, 0)
        const res = await createPickupCode({
          mode,
          note: note || undefined,
          fileName: files.length === 1 ? files[0].name : `${files.length} files`,
          fileSize: totalSize,
          fileType: files[0]?.type,
        })
        setCode(res.code)

        const uploadedFiles: { name: string; storageName: string; size: number; type: string }[] = []
        for (let i = 0; i < files.length; i++) {
          const result = await uploadFileForPickup(res.code, files[i], (pct, spd) => {
            setProgress(((i + pct) / files.length) * 100)
            setSpeed(spd)
          })
          uploadedFiles.push({
            name: result.fileName,
            storageName: result.fileName,
            size: files[i].size,
            type: files[i].type,
          })
        }
        await savePickupFiles(res.code, uploadedFiles)
        setProgress(100)
        setUploaded(true)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setUploading(false)
      }
    }

    doUpload()
  }, [code, uploading, files, mode, note])

  const handleCopy = useCallback(() => {
    if (code) {
      navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [code])

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-md">
      {error && (
        <div className="w-full p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </div>
      )}

      {uploading && (
        <div className="flex flex-col items-center gap-4 py-12">
          <LoaderIcon className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-slate-500">正在上传文件...</p>
          <div className="w-full">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>{progress.toFixed(0)}%</span>
              <span>{speed > 0 ? formatSpeed(speed) : ''}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${progress.toFixed(0)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {code && uploaded && (
        <>
          <div className="text-center animate-pop-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <CheckIcon className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">文件已上传</h2>
            <p className="text-slate-500 mt-1">
              分享取件码给对方，{mode}后自动失效
            </p>
          </div>

          <div className="w-full text-center animate-slide-up delay-75">
            <div
              onClick={handleCopy}
              className="inline-flex items-center gap-3 px-8 py-4 bg-white rounded-2xl border-2 border-dashed border-blue-400 cursor-pointer hover:bg-blue-50 transition-all duration-200 group active:scale-[0.98]"
            >
              <span className="text-5xl font-mono font-bold tracking-[0.2em] text-blue-600 select-all">
                {code}
              </span>
              {copied ? (
                <CheckIcon className="w-6 h-6 text-green-500 shrink-0" />
              ) : (
                <CopyIcon className="w-6 h-6 text-slate-400 group-hover:text-blue-500 shrink-0" />
              )}
            </div>
            <p className="text-xs text-slate-400 mt-2">点击复制取件码</p>
          </div>

          <div className="animate-slide-up delay-150"><ShareLinkSection code={code} /></div>

          <div className="w-full space-y-2 animate-slide-up delay-225">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 transition-all duration-200 hover:shadow-sm">
                <FileIcon className="w-5 h-5 text-slate-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-800 truncate">{f.name}</div>
                  <div className="text-xs text-slate-400">
                    {(f.size / 1024 / 1024).toFixed(1)} MB
                  </div>
                </div>
              </div>
            ))}
          </div>

          {note && (
            <div className="text-sm text-slate-500">备注：{note}</div>
          )}
        </>
      )}

      <button onClick={onBack} className="text-slate-400 hover:text-slate-600 text-sm transition-colors">
        返回首页
      </button>
    </div>
  )
}

export default function SendView({ onBack, preloadedFiles, preloadedText }: Props) {
  const [step, setStep] = useState<Step>(
    preloadedFiles ? 'choose-files' : preloadedText ? 'choose-files' : 'choose-type'
  )
  const [sendType, setSendType] = useState<'file' | 'text' | undefined>(
    preloadedFiles ? 'file' : preloadedText ? 'text' : undefined
  )
  const [mode, setMode] = useState<TransferMode>('p2p')
  const [files, setFiles] = useState<File[]>(preloadedFiles || [])
  const [note, setNote] = useState('')
  const [textContent, setTextContent] = useState(preloadedText || '')
  const [showEditor, setShowEditor] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const readEntry = useCallback((entry: FileSystemEntry): Promise<File[]> => {
    if (entry.isFile) {
      return new Promise((resolve) => {
        (entry as FileSystemFileEntry).file((file) => resolve([file]))
      })
    }
    if (entry.isDirectory) {
      const dirReader = (entry as FileSystemDirectoryEntry).createReader()
      return new Promise((resolve) => {
        const allFiles: File[] = []
        const readBatch = () => {
          dirReader.readEntries(async (entries) => {
            if (entries.length === 0) {
              resolve(allFiles)
            } else {
              for (const e of entries) {
                const files = await readEntry(e)
                allFiles.push(...files)
              }
              readBatch()
            }
          })
        }
        readBatch()
      })
    }
    return Promise.resolve([])
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setFiles(prev => [...prev, ...newFiles])
      if (step === 'choose-type') setStep('choose-files')
    }
    e.target.value = ''
  }, [step])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)

    const items = e.dataTransfer.items
    if (items && items.length > 0) {
      const allFiles: File[] = []
      const entries: FileSystemEntry[] = []

      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry?.()
        if (entry) entries.push(entry)
      }

      if (entries.length > 0) {
        for (const entry of entries) {
          const files = await readEntry(entry)
          allFiles.push(...files)
        }
      }

      if (allFiles.length === 0) {
        const fileList = e.dataTransfer.files
        for (let i = 0; i < fileList.length; i++) {
          allFiles.push(fileList[i])
        }
      }

      if (allFiles.length > 0) {
        setFiles(prev => [...prev, ...allFiles])
        setSendType('file')
        if (step === 'choose-type') setStep('choose-files')
      }
    }
  }, [step, readEntry])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
  }, [])

  const handleStartSend = useCallback(() => {
    if (sendType === 'text') {
      if (!textContent.trim()) {
        setError('请输入要发送的文本内容')
        return
      }
      // Text mode doesn't need P2P, go straight to "sharing" (stored in DB)
      setStep('sharing')
      return
    }

    if (files.length === 0) {
      setError('请选择要发送的文件')
      return
    }

    if (mode !== 'p2p') {
      // Timed mode - placeholder
      setStep('sharing')
      return
    }

    // P2P mode - move to sharing step which initializes PeerJS
    setStep('sharing')
  }, [sendType, textContent, files.length, mode])

  if (step === 'choose-type') {
    return (
      <div className="flex flex-col items-center gap-8 w-full max-w-md">
        <button onClick={onBack} className="self-start text-slate-500 hover:text-slate-700 transition-colors animate-slide-right">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold text-slate-800 animate-slide-down">选择发送内容</h2>
        <div className="flex flex-col gap-4 w-full">
          <button
            onClick={() => { setSendType('file'); fileInputRef.current?.click() }}
            className="flex items-center gap-4 p-5 bg-white rounded-2xl border-2 border-slate-200 hover:border-blue-400 transition-all shadow-sm hover:shadow-md active:scale-[0.98] animate-slide-up delay-75"
          >
            <div className="p-3 bg-blue-50 rounded-xl transition-transform duration-200 group-hover:scale-110"><FileIcon className="w-7 h-7 text-blue-500" /></div>
            <div className="text-left">
              <div className="text-lg font-semibold text-slate-800">发送文件</div>
              <div className="text-sm text-slate-500">选择单个文件分享</div>
            </div>
          </button>
          <button
            onClick={() => { setSendType('file'); folderInputRef.current?.click() }}
            className="flex items-center gap-4 p-5 bg-white rounded-2xl border-2 border-slate-200 hover:border-blue-400 transition-all shadow-sm hover:shadow-md active:scale-[0.98] animate-slide-up delay-150"
          >
            <div className="p-3 bg-amber-50 rounded-xl"><FolderIcon className="w-7 h-7 text-amber-500" /></div>
            <div className="text-left">
              <div className="text-lg font-semibold text-slate-800">发送文件夹</div>
              <div className="text-sm text-slate-500">选择整个文件夹分享</div>
            </div>
          </button>
          <button
            onClick={() => { setSendType('text'); setStep('choose-files') }}
            className="flex items-center gap-4 p-5 bg-white rounded-2xl border-2 border-slate-200 hover:border-blue-400 transition-all shadow-sm hover:shadow-md active:scale-[0.98] animate-slide-up delay-225"
          >
            <div className="p-3 bg-green-50 rounded-xl"><NoteIcon className="w-7 h-7 text-green-500" /></div>
            <div className="text-left">
              <div className="text-lg font-semibold text-slate-800">发送笔记</div>
              <div className="text-sm text-slate-500">编辑 Markdown 笔记分享</div>
            </div>
          </button>
        </div>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
        <input ref={folderInputRef} type="file" className="hidden" {...({ webkitdirectory: '' } as React.InputHTMLAttributes<HTMLInputElement>)} onChange={handleFileChange} />
      </div>
    )
  }

  if (step === 'choose-files') {
    return (
      <div
        className={`flex flex-col items-center gap-6 w-full max-w-md relative transition-colors duration-300 ${dragging ? 'bg-blue-50 rounded-3xl p-6' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className={`absolute inset-0 flex items-center justify-center bg-blue-500/10 rounded-3xl border-2 border-dashed border-blue-400 z-10 pointer-events-none transition-all duration-300 ${dragging ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          {dragging && <div className="text-blue-500 font-semibold animate-pop-in">松开即可添加文件</div>}
        </div>
        <button onClick={() => setStep('choose-type')} className="self-start text-slate-500 hover:text-slate-700 transition-colors animate-slide-right">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold text-slate-800 animate-slide-down">
          {sendType === 'text' ? '编辑笔记' : '确认文件'}
        </h2>

        {sendType === 'text' ? (
          <div className="w-full animate-slide-up delay-75">
            <button
              onClick={() => setShowEditor(true)}
              className="w-full p-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 bg-white text-left transition-all duration-200 group active:scale-[0.98]"
            >
              {textContent ? (
                <div className="text-sm text-slate-700 line-clamp-3 whitespace-pre-wrap">{textContent}</div>
              ) : (
                <div className="text-slate-400 text-sm">点击编辑 Markdown 笔记...</div>
              )}
            </button>
            {textContent && (
              <div className="mt-2 text-xs text-slate-400 text-right">{textContent.length} 字</div>
            )}
          </div>
        ) : (
          <div className="w-full space-y-2 animate-slide-up delay-150">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 transition-all duration-200 hover:shadow-sm">
                <FileIcon className="w-5 h-5 text-slate-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-800 truncate">{f.name}</div>
                  <div className="text-xs text-slate-400">{(f.size / 1024 / 1024).toFixed(1)} MB</div>
                </div>
                <button
                  onClick={() => {
                    if (files.length <= 1) {
                      setToast('至少保留一个文件')
                      setTimeout(() => setToast(null), 2000)
                      return
                    }
                    setFiles(files.filter((_, idx) => idx !== i))
                  }}
                  className="text-slate-400 hover:text-red-500 transition-colors shrink-0 p-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 rounded-xl border-2 border-dashed border-slate-300 text-sm text-slate-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
            >
              + 添加更多文件
            </button>
            <div className="text-xs text-slate-400 text-center">{files.length} 个文件</div>
          </div>
        )}

        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="添加备注（可选）"
          className="w-full p-3 rounded-xl border-2 border-slate-200 bg-white focus:border-blue-400 focus:outline-none transition-all duration-200 animate-slide-up delay-225"
        />

        {sendType !== 'text' && (
          <div className="w-full animate-slide-up delay-300">
            <div className="flex items-center gap-2 mb-3 text-sm font-medium text-slate-600">
              <ClockIcon className="w-4 h-4" />
              有效期
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMode(m.value)}
                  className={`py-2 px-3 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.95] ${
                    mode === m.value
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300'
                  }`}
                >
                  {m.value === 'p2p' ? (
                    <span className="flex items-center justify-center gap-1">
                      <WifiIcon className="w-3.5 h-3.5" />
                      快传
                    </span>
                  ) : m.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {sendType === 'text' && (
          <div className="w-full animate-slide-up delay-300">
            <div className="flex items-center gap-2 mb-3 text-sm font-medium text-slate-600">
              <ClockIcon className="w-4 h-4" />
              有效期
            </div>
            <div className="grid grid-cols-3 gap-2">
              {TEXT_MODES.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMode(m.value)}
                  className={`py-2 px-3 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.95] ${
                    mode === m.value
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300'
                  }`}
                >
                  {m.value === 'p2p' ? (
                    <span className="flex items-center justify-center gap-1">
                      <WifiIcon className="w-3.5 h-3.5" />
                      快传
                    </span>
                  ) : m.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="w-full p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
        )}

        <button
          onClick={handleStartSend}
          className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl text-lg font-semibold transition-all duration-200 shadow-lg shadow-blue-500/25 active:scale-[0.98] animate-slide-up delay-375"
        >
          生成取件码
        </button>

        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
        <input ref={folderInputRef} type="file" className="hidden" {...({ webkitdirectory: '' } as React.InputHTMLAttributes<HTMLInputElement>)} onChange={handleFileChange} />

        {toast && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 px-5 py-3 bg-slate-800 text-white text-sm rounded-xl shadow-lg z-50 animate-fade-in">
            {toast}
          </div>
        )}

        {showEditor && (
          <NoteEditorOverlay value={textContent} onChange={setTextContent} onClose={() => setShowEditor(false)} />
        )}
      </div>
    )
  }

  // Sharing step
  if (sendType === 'text') {
    if (mode === 'p2p') {
      return <TextP2PView textContent={textContent} note={note} onBack={onBack} />
    }
    return <TextShareView textContent={textContent} note={note} mode={mode} onBack={onBack} />
  }

  if (mode !== 'p2p') {
    return <TimedShareView files={files} mode={mode} note={note} onBack={onBack} />
  }

  return <SharingView files={files} mode={mode} note={note} onBack={onBack} />
}
