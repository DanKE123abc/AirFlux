import { useState, useCallback } from 'react'
import { CopyIcon, CheckIcon } from './Icons'

export default function CodeCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  return (
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
  )
}