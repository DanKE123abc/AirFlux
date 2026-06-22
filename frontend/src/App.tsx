import { useState, useCallback, useEffect } from 'react'
import HomePage from './pages/HomePage'
import SendView from './pages/SendView'
import ReceiveView from './pages/ReceiveView'

type Page = 'home' | 'send' | 'receive'

function getValidCode(): string | null {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  if (code && /^\d{6}$/.test(code)) return code
  if (code) window.history.replaceState({}, '', window.location.pathname)
  return null
}

export default function App() {
  const [page, setPage] = useState<Page>(() => getValidCode() ? 'receive' : 'home')
  const [preloadedFiles, setPreloadedFiles] = useState<File[] | null>(null)
  const [preloadedText, setPreloadedText] = useState<string | null>(null)
  const [urlCode, setUrlCode] = useState<string | null>(getValidCode)

  const handleSendWithFiles = useCallback((files: File[]) => {
    setPreloadedFiles(files)
    setPreloadedText(null)
    setPage('send')
  }, [])

  const handleSendWithText = useCallback((text: string) => {
    setPreloadedText(text)
    setPreloadedFiles(null)
    setPage('send')
  }, [])

  const handleBack = useCallback(() => {
    setPreloadedFiles(null)
    setPreloadedText(null)
    setUrlCode(null)
    window.history.replaceState({}, '', window.location.pathname)
    setPage('home')
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {page === 'home' && (
        <div key="home" className="animate-fade-in-scale w-full max-w-md">
          <HomePage
            onSend={() => { setPreloadedFiles(null); setPreloadedText(null); setPage('send') }}
            onSendWithFiles={handleSendWithFiles}
            onSendWithText={handleSendWithText}
            onReceive={() => setPage('receive')}
          />
        </div>
      )}
      {page === 'send' && (
        <div key="send" className="animate-slide-left w-full max-w-md">
          <SendView
            onBack={handleBack}
            preloadedFiles={preloadedFiles}
            preloadedText={preloadedText}
          />
        </div>
      )}
      {page === 'receive' && (
        <div key="receive" className="animate-slide-left w-full max-w-md">
          <ReceiveView onBack={handleBack} initialCode={urlCode} />
        </div>
      )}
    </div>
  )
}
