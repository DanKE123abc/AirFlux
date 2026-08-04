export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B'
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const k = 1024
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1)
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + units[i]
}

export function formatSpeed(bytesPerSec: number): string {
  if (!Number.isFinite(bytesPerSec) || bytesPerSec <= 0) return '0 B/s'
  if (bytesPerSec >= 1048576) return `${(bytesPerSec / 1048576).toFixed(1)} MB/s`
  if (bytesPerSec >= 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`
  return `${bytesPerSec.toFixed(0)} B/s`
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
