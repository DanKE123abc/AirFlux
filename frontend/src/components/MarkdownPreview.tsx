import { useEffect, useRef } from 'react'
import Vditor from 'vditor'

export default function MarkdownPreview({ content }: { content: string }) {
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