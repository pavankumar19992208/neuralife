export function timeAgo(dateString: string | null | undefined): string {
  if (dateString == null) return 'Never'
  const diff = Date.now() - new Date(dateString).getTime()
  if (diff < 60_000) return 'Just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} minutes ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hours ago`
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} days ago`
  const d = new Date(dateString)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
