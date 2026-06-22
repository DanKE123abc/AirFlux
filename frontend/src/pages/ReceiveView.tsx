import { useState, useCallback, useEffect, useRef } from 'react'
import Vditor from 'vditor'
import 'vditor/dist/index.css'
import { ArrowLeft, ArrowDownFromLine, LoaderIcon, FileIcon, CheckIcon, WifiIcon } from '../components/Icons'
import WebRTCProvider from '../components/WebRTCProvider'
import { useReceiver } from '../hooks/useReceiver'
import { lookupPickupCode, getDownloadUrls } from '../lib/api'
import { getExpiryLabel, formatFileSize } from '../lib/utils'

interface Props { onBack: () => void; initialCode?: string | null }

type Step = 'enter-code' | 'loading' | 'receiving'

function MarkdownPreview({ content }: { content: string }) {
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (previewRef.current && content) {
      Vditor.preview(previewRef.current, content, {
        mode: 'light',
        lang: 'zh_CN',
      })
    }
  }, [content])

  return <div ref={previewRef} className="vditor-reset text-sm" />
}

function TimedDownloadView({
  code,
  note,
  onBack,
}: {
  code: string
  note: string | null
  onBack: () => void
}) {
  const [files, setFiles] = useState<{ name: string; size: number; type: string; downloadUrl: string }[]>([])
  const [loadingFiles, setLoadingFiles] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    getDownloadUrls(code).then(data => {
      setFiles(data.files || [])
    }).catch(err => {
      setError(err.message)
    }).finally(() => {
      setLoadingFiles(false)
    })
  }, [code])

  const handleDownload = useCallback((file: { name: string; downloadUrl: string }, index: number) => {
    setToast('已开始下载，请勿重复点击')
    setTimeout(() => setToast(null), 2000)
    const a = document.createElement('a')
    a.href = file.downloadUrl
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [])

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-md">
      <button onClick={onBack} className="self-start text-slate-500 hover:text-slate-700 transition-colors animate-slide-right">
        <ArrowLeft className="w-6 h-6" />
      </button>

      <div className="w-full text-center animate-slide-down">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">
          {loadingFiles ? '加载中...' : `${files.length} 个文件`}
        </h2>

        <div className="w-full p-4 rounded-xl bg-white border border-slate-200 animate-fade-in-scale delay-75">
          {loadingFiles && (
            <div className="flex items-center justify-center gap-2 text-slate-500 py-4">
              <LoaderIcon className="w-5 h-5 animate-spin" />
              <span className="text-sm">获取文件列表...</span>
            </div>
          )}

          {!loadingFiles && files.length > 0 && (
            <div className="space-y-2">
              {files.map((f, i) => (
                <button
                  key={i}
                  onClick={() => handleDownload(f, i)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-blue-50 transition-all duration-200 cursor-pointer group text-left active:scale-[0.98]"
                >
                  <FileIcon className="w-5 h-5 text-slate-400 group-hover:text-blue-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-800 truncate">{f.name}</div>
                    <div className="text-xs text-slate-400">{formatFileSize(f.size)}</div>
                  </div>
                  <ArrowDownFromLine className="w-4 h-4 text-slate-400 group-hover:text-blue-500 shrink-0" />
                </button>
              ))}
            </div>
          )}

          {error && (
            <div className="text-sm text-red-500 text-center mt-2">{error}</div>
          )}
        </div>
      </div>

      {note && (
        <div className="w-full p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
          备注：{note}
        </div>
      )}

      <button onClick={onBack} className="text-slate-400 hover:text-slate-600 text-sm transition-colors">
        返回首页
      </button>

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 px-5 py-3 bg-slate-800 text-white text-sm rounded-xl shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  )
}

function DownloadView({ peerId, note, onBack }: { peerId: string; note: string | null; onBack: () => void }) {
  const { state } = useReceiver(peerId)
  const [fullscreen, setFullscreen] = useState(false)

  // P2P Note received
  if (state.noteContent) {
    return (
      <div className="flex flex-col items-center gap-8 w-full max-w-md">
        <button onClick={onBack} className="self-start text-slate-500 hover:text-slate-700 transition-colors animate-slide-right">
          <ArrowLeft className="w-6 h-6" />
        </button>

        <div className="text-center animate-pop-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <CheckIcon className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">收到笔记</h2>
        </div>

        <div className="w-full rounded-xl bg-slate-50 border border-slate-200 overflow-hidden animate-slide-up delay-75">
          <div className="flex items-center justify-end px-3 py-1.5 border-b border-slate-200">
            <button
              onClick={() => setFullscreen(true)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              全屏
            </button>
          </div>
          <div className="p-4 max-h-80 overflow-y-auto">
            <MarkdownPreview content={state.noteContent} />
          </div>
        </div>

        {note && (
          <div className="w-full p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
            备注：{note}
          </div>
        )}

        <button onClick={onBack} className="text-slate-400 hover:text-slate-600 text-sm transition-colors">
          返回首页
        </button>

        {fullscreen && (
          <div className="fixed inset-0 z-50 flex flex-col bg-white animate-overlay-in">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0 animate-slide-down">
              <h3 className="text-lg font-semibold text-slate-800">笔记内容</h3>
              <button onClick={() => setFullscreen(false)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-3xl mx-auto">
                <MarkdownPreview content={state.noteContent!} />
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-md">
      <button onClick={onBack} className="self-start text-slate-500 hover:text-slate-700 transition-colors animate-slide-right">
        <ArrowLeft className="w-6 h-6" />
      </button>

      <div className="w-full text-center animate-slide-down">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">
          {state.status === 'connecting' && '正在连接...'}
          {state.status === 'connected' && '准备接收文件'}
          {state.status === 'downloading' && '正在下载...'}
          {state.status === 'done' && '下载完成！'}
          {state.status === 'error' && '连接失败'}
        </h2>

        <div className="w-full p-4 rounded-xl bg-white border border-slate-200 animate-fade-in-scale delay-75">
          {/* File list */}
          {state.files && state.files.length > 0 && (
            <div className="space-y-2 mb-4">
              {state.files.map((f, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50">
                  <FileIcon className="w-5 h-5 text-slate-400 shrink-0" />
                  <div className="min-w-0 flex-1 text-left">
                    <div className="text-sm font-medium text-slate-800 truncate">{f.fileName}</div>
                    <div className="text-xs text-slate-400">{formatFileSize(f.size)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Progress bar */}
          {state.status === 'downloading' && (
            <div className="w-full">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>下载进度</span>
                <span>{formatFileSize(state.downloadedBytes)} / {formatFileSize(state.totalBytes)}</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-200"
                  style={{ width: `${Math.min(100, state.progress * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Connecting spinner */}
          {state.status === 'connecting' && (
            <div className="flex items-center justify-center gap-2 text-slate-500">
              <LoaderIcon className="w-5 h-5 animate-spin" />
              <span className="text-sm">正在建立 P2P 连接...</span>
            </div>
          )}

          {/* Connected - waiting for user action */}
          {state.status === 'connected' && (
            <div className="flex items-center justify-center gap-2 text-slate-500">
              <WifiIcon className="w-5 h-5 text-green-500" />
              <span className="text-sm">已连接到发送方，正在接收文件列表...</span>
            </div>
          )}

          {/* Done */}
          {state.status === 'done' && (
            <div className="flex items-center justify-center gap-2 text-green-600">
              <CheckIcon className="w-5 h-5" />
              <span className="text-sm font-medium">文件已下载到本地</span>
            </div>
          )}

          {/* Error */}
          {state.status === 'error' && (
            <div className="text-sm text-red-500 text-center">{state.error || '连接失败，请检查取件码是否正确'}</div>
          )}
        </div>
      </div>

      {note && (
        <div className="w-full p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
          备注：{note}
        </div>
      )}

      <button onClick={onBack} className="text-slate-400 hover:text-slate-600 text-sm transition-colors">
        返回首页
      </button>
    </div>
  )
}

export default function ReceiveView({ onBack, initialCode }: Props) {
  const [step, setStep] = useState<Step>(initialCode ? 'loading' : 'enter-code')
  const [code, setCode] = useState(initialCode || '')
  const [peerId, setPeerId] = useState<string | null>(null)
  const [p2pNote, setP2pNote] = useState<string | null>(null)
  const [timedMode, setTimedMode] = useState(false)
  const [timedInfo, setTimedInfo] = useState<{ fileName: string | null; fileSize: number | null; fileType: string | null; note: string | null } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (initialCode && initialCode.length === 6) {
      handleLookup()
    }
  }, [])

  const handleLookup = useCallback(async () => {
    const trimmedCode = code.trim()
    if (!trimmedCode || trimmedCode.length !== 6) {
      setError('请输入有效的6位取件码')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await lookupPickupCode(trimmedCode)

      if (data.mode === 'text' || data.textContent) {
        // Text mode: display content directly
        setCode(data.textContent || '')
        setTimedInfo({ fileName: null, fileSize: null, fileType: null, note: data.note || null })
        setStep('loading')
        return
      }

      if (data.mode === 'p2p') {
        if (!data.peerId) {
          setError('发送方尚未就绪，请稍后再试')
          setLoading(false)
          return
        }
        setPeerId(data.peerId)
        setP2pNote(data.note || null)
        setStep('receiving')
      } else {
        setTimedMode(true)
        setTimedInfo({
          fileName: data.fileName,
          fileSize: data.fileSize,
          fileType: data.fileType,
          note: data.note,
        })
        setStep('receiving')
      }
    } catch (err: any) {
      setError(err.message)
      setStep('enter-code')
    } finally {
      setLoading(false)
    }
  }, [code])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && code.length === 6) handleLookup()
    },
    [code.length, handleLookup],
  )

  // Receiving step
  if (step === 'receiving') {
    if (timedMode) {
      return (
        <TimedDownloadView
          code={code}
          note={timedInfo?.note || null}
          onBack={onBack}
        />
      )
    }

    if (peerId) {
      return (
        <WebRTCProvider>
          <DownloadView peerId={peerId} note={p2pNote} onBack={onBack} />
        </WebRTCProvider>
      )
    }
  }

  // Text mode display
  if (step === 'loading') {
    return (
      <div className="flex flex-col items-center gap-8 w-full max-w-md">
        <button onClick={onBack} className="self-start text-slate-500 hover:text-slate-700 transition-colors animate-slide-right">
          <ArrowLeft className="w-6 h-6" />
        </button>

        <div className="text-center animate-pop-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <CheckIcon className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">收到笔记</h2>
        </div>

        <div className="w-full rounded-xl bg-slate-50 border border-slate-200 overflow-hidden animate-slide-up delay-75">
          <div className="flex items-center justify-end px-3 py-1.5 border-b border-slate-200">
            <button
              onClick={() => setFullscreen(true)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              全屏
            </button>
          </div>
          <div className="p-4 max-h-80 overflow-y-auto">
            <MarkdownPreview content={code} />
          </div>
        </div>

        {timedInfo?.note && (
          <div className="w-full p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
            备注：{timedInfo.note}
          </div>
        )}

        <button onClick={onBack} className="text-slate-400 hover:text-slate-600 text-sm transition-colors">
          返回首页
        </button>

        {fullscreen && (
          <div className="fixed inset-0 z-50 flex flex-col bg-white animate-overlay-in">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0 animate-slide-down">
              <h3 className="text-lg font-semibold text-slate-800">笔记内容</h3>
              <button onClick={() => setFullscreen(false)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-3xl mx-auto">
                <MarkdownPreview content={code} />
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Enter code step
  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-md">
      <button onClick={onBack} className="self-start text-slate-500 hover:text-slate-700 transition-colors animate-slide-right">
        <ArrowLeft className="w-6 h-6" />
      </button>

      <div className="text-center animate-slide-down">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-4">
          <ArrowDownFromLine className="w-8 h-8 text-blue-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">输入取件码</h2>
        <p className="text-slate-500 mt-1">输入发送方分享的6位数字取件码</p>
      </div>

      <div className="w-full animate-slide-up delay-75">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={handleKeyDown}
          placeholder="000000"
          className="w-full text-center text-4xl font-mono font-bold tracking-[0.3em] p-4 rounded-2xl border-2 border-slate-200 bg-white text-slate-800 focus:border-blue-400 focus:outline-none transition-all duration-200 placeholder:text-slate-300 focus:shadow-md focus:shadow-blue-500/10"
        />
      </div>

      {error && (
        <div className="w-full p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
      )}

      <button
        onClick={handleLookup}
        disabled={code.length !== 6 || loading}
        className="w-full py-4 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white rounded-2xl text-lg font-semibold transition-all duration-200 shadow-lg shadow-blue-500/25 active:scale-[0.98] flex items-center justify-center gap-2 animate-slide-up delay-150"
      >
        {loading ? (
          <>
            <LoaderIcon className="w-5 h-5 animate-spin" />
            查询中...
          </>
        ) : (
          '获取文件'
        )}
      </button>
    </div>
  )
}
