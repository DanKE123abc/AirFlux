import MarkdownPreview from './MarkdownPreview'

export default function FullscreenMarkdown({
  content,
  onClose,
}: {
  content: string
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white animate-overlay-in">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0 animate-slide-down">
        <h3 className="text-lg font-semibold text-slate-800">笔记内容</h3>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          <MarkdownPreview content={content} />
        </div>
      </div>
    </div>
  )
}