import { Bookmark } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBookmarks, useAddBookmark, useRemoveBookmark } from '@/hooks/useBookmarks'
import { Button } from '@/components/ui/button'

interface BookmarkButtonProps {
  url: string
  title: string
  icon?: string
  className?: string
}

export default function BookmarkButton({ url, title, icon, className }: BookmarkButtonProps) {
  const { data: bookmarks } = useBookmarks()
  const addBookmark = useAddBookmark()
  const removeBookmark = useRemoveBookmark()

  const existing = bookmarks?.find((b) => b.url === url)
  const isBookmarked = !!existing

  function handleClick() {
    if (isBookmarked && existing) {
      removeBookmark.mutate(existing.id)
    } else {
      addBookmark.mutate({ url, title, icon })
    }
  }

  const isPending = addBookmark.isPending || removeBookmark.isPending

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={isPending}
      aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark this page'}
      className={cn('gap-1.5', className)}
    >
      <Bookmark
        className={cn(
          'h-4 w-4 transition-colors',
          isBookmarked ? 'fill-amber-400 text-amber-400' : 'text-slate-400',
        )}
      />
      <span className="hidden sm:inline text-xs text-slate-500">
        {isBookmarked ? 'Saved' : 'Save'}
      </span>
    </Button>
  )
}
