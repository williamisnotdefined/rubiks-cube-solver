import { useTranslation } from 'react-i18next'
import { useInRouterContext, useLocation } from 'react-router'
import {
  chapterAccents,
  chapterFromPathname,
  routeChapters,
  type RouteChapter,
} from '@core/navigation/chapters'
import { cn } from '@src/lib/utils'

type ChapterBarProps = {
  className?: string
  label?: string
  showNumber?: boolean
}

export function ChapterBar({ className, label, showNumber = true }: ChapterBarProps) {
  const inRouter = useInRouterContext()

  if (!inRouter) {
    return (
      <ChapterBarView
        chapter={routeChapters.solve}
        className={className}
        label={label}
        showNumber={showNumber}
      />
    )
  }

  return <RoutedChapterBar className={className} label={label} showNumber={showNumber} />
}

function RoutedChapterBar({ className, label, showNumber = true }: ChapterBarProps) {
  const location = useLocation()
  const chapter = chapterFromPathname(location.pathname)

  return (
    <ChapterBarView
      chapter={chapter}
      className={className}
      label={label}
      showNumber={showNumber}
    />
  )
}

function ChapterBarView({
  chapter,
  className,
  label,
  showNumber,
}: ChapterBarProps & { chapter: RouteChapter }) {
  const { t } = useTranslation()
  const accent = chapterAccents[chapter.accent]

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className={cn('label-mono shrink-0 px-2 py-1', accent.bg, accent.text)}>
        {showNumber ? `${chapter.number} / ${chapter.code}` : chapter.code}
      </span>
      <span className='h-0.5 min-w-4 flex-1 bg-foreground' />
      <span className='label-mono hidden shrink-0 opacity-55 sm:block'>
        {label ?? t(chapter.labelKey)}
      </span>
    </div>
  )
}
