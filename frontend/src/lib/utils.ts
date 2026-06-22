export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + units[i]
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN')
}

export function getExpiryLabel(mode: string): string {
  switch (mode) {
    case 'p2p': return '面对面快传'
    case 'text': return '纯文本'
    case '1h': return '1小时'
    case '5h': return '5小时'
    case '12h': return '12小时'
    case '24h': return '24小时'
    case '72h': return '72小时'
    default: return mode
  }
}
