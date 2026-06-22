import { useState, useCallback, useEffect } from 'react'
import { ArrowUpFromLine, ArrowDownFromLine } from '../components/Icons'

interface Props {
  onSend: () => void
  onSendWithFiles: (files: File[]) => void
  onSendWithText: (text: string) => void
  onReceive: () => void
}

export default function HomePage({ onSend, onSendWithFiles, onSendWithText, onReceive }: Props) {
  const [dragging, setDragging] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }, [])

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

  const handleFiles = useCallback((fileList: FileList) => {
    const files = Array.from(fileList)
    if (files.length > 0) {
      onSendWithFiles(files)
    }
  }, [onSendWithFiles])

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
        onSendWithFiles(allFiles)
        return
      }
    }

    if (e.dataTransfer.types.includes('text/plain')) {
      const text = e.dataTransfer.getData('text/plain')
      if (text.trim()) {
        onSendWithText(text)
      }
    }
  }, [readEntry, onSendWithFiles, onSendWithText])

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

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      const files: File[] = []
      let text = ''

      for (const item of items) {
        if (item.kind === 'file') {
          const file = item.getAsFile()
          if (file) files.push(file)
        } else if (item.kind === 'string') {
          item.getAsString(s => { text = s })
        }
      }

      if (files.length > 0) {
        onSendWithFiles(files)
      } else if (text.trim()) {
        onSendWithText(text)
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [onSendWithFiles, onSendWithText])

  return (
    <div
      className={`flex flex-col items-center gap-12 w-full max-w-md transition-colors ${dragging ? 'bg-blue-50 rounded-3xl' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Logo */}
      <div className="text-center animate-slide-down">
        <div className="text-6xl mb-4">
          <svg width="64" height="64" viewBox="0 0 100 100" className="mx-auto text-blue-500">
            <polygon points="50,5 95,95 5,95" fill="currentColor" opacity="0.2" />
            <polygon points="50,20 80,85 20,85" fill="currentColor" opacity="0.4" />
            <polygon points="50,40 65,75 35,75" fill="currentColor" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
          AirFlux
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
          极速文件快传
        </p>
      </div>

      <div
        className={`absolute inset-0 flex items-center justify-center bg-blue-500/10 rounded-3xl border-2 border-dashed border-blue-400 z-10 pointer-events-none transition-all duration-300 ${dragging ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
      >
        {dragging && <div className="text-blue-500 text-lg font-semibold animate-pop-in">松开即可发送文件</div>}
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-4 w-full">
        <button
          onClick={onSend}
          className="group relative w-full py-4 px-6 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-2xl text-xl font-semibold transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 active:scale-[0.98] animate-slide-up delay-75"
        >
          <span className="flex items-center justify-center gap-3">
            <ArrowUpFromLine className="w-6 h-6 transition-transform duration-200 group-hover:-translate-y-0.5" />
            发送文件
          </span>
        </button>

        <button
          onClick={onReceive}
          className="group relative w-full py-4 px-6 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-2xl text-xl font-semibold transition-all duration-200 border-2 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md active:scale-[0.98] animate-slide-up delay-150"
        >
          <span className="flex items-center justify-center gap-3">
            <ArrowDownFromLine className="w-6 h-6 transition-transform duration-200 group-hover:translate-y-0.5" />
            接收文件
          </span>
        </button>
      </div>

      <p className="text-xs text-slate-400 text-center -mt-4 animate-slide-up delay-225">
        支持拖拽文件、Ctrl+V 粘贴文件
      </p>
      <p className="text-xs text-slate-400 text-center -mt-4 animate-slide-up delay-300">
        发送、接收文件即代表您同意我们的 隐私政策 和 用户协议
      </p>

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 px-5 py-3 bg-slate-800 text-white text-sm rounded-xl shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  )
}
