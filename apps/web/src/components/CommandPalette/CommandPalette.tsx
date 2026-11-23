import * as Dialog from '@radix-ui/react-dialog'
import { Command } from 'cmdk'
import { ArrowUpRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router'
import {
  chapterFromNavPath,
  chapterAccents,
} from '@core/navigation/chapters'
import { localeFromPathname, localizedPath } from '@src/seo/routes'
import { cn } from '@src/lib/utils'

type CommandEntry = {
  label: string
  path: string
}

const commandEntries: CommandEntry[] = [
  { label: 'landing.home', path: '/' },
  { label: 'navigation.solve', path: '/solve' },
  { label: 'navigation.timer', path: '/timer' },
  { label: 'navigation.algorithms', path: '/algorithms' },
  { label: 'navigation.notations', path: '/notations/3x3' },
  { label: 'navigation.worldRecords', path: '/records/world' },
  { label: 'navigation.channels', path: '/channels' },
  { label: 'navigation.sites', path: '/sites' },
  { label: 'navigation.stores', path: '/stores' },
]

export function CommandPalette() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const locale = localeFromPathname(location.pathname)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }

    const handleOpenEvent = () => setOpen(true)

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('speedcube:command-palette', handleOpenEvent)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('speedcube:command-palette', handleOpenEvent)
    }
  }, [])

  function jump(path: string) {
    setOpen(false)
    navigate(localizedPath(path, locale))
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className='fixed inset-0 z-[190] bg-foreground/50' />
        <Dialog.Content className='fixed left-1/2 top-[10vh] z-[200] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 border-2 border-foreground bg-background text-foreground shadow-[8px_8px_0_var(--foreground)]'>
          <Dialog.Title className='sr-only'>{t('navigation.command')}</Dialog.Title>
          <Dialog.Description className='sr-only'>
            {t('navigation.commandPlaceholder')}
          </Dialog.Description>
          <Command loop>
            <Command.Input
              autoFocus
              className='h-14 w-full border-b-2 border-foreground bg-background px-4 font-mono text-sm uppercase tracking-widest outline-none placeholder:text-muted-foreground'
              placeholder={t('navigation.commandPlaceholder')}
            />
            <Command.List className='max-h-[55vh] overflow-y-auto p-2'>
              <Command.Empty className='px-3 py-8 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground'>
                {t('navigation.commandEmpty')}
              </Command.Empty>
              <Command.Group
                className='[&_[cmdk-group-heading]]:label-mono [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:opacity-50'
                heading={t('navigation.commandRoutes')}
              >
                {commandEntries.map((entry) => {
                  const chapter = chapterFromNavPath(entry.path)
                  const accent = chapterAccents[chapter.accent]

                  return (
                    <Command.Item
                      className='flex cursor-pointer items-center gap-3 border-2 border-transparent px-3 py-2.5 text-sm outline-none data-[selected=true]:border-foreground data-[selected=true]:bg-foreground data-[selected=true]:text-background'
                      key={entry.path}
                      value={`${t(entry.label)} ${chapter.code}`}
                      onSelect={() => jump(entry.path)}
                    >
                      <span
                        className={cn(
                          'label-mono flex size-7 shrink-0 items-center justify-center text-[0.6rem]',
                          accent.bg,
                          accent.text,
                        )}
                      >
                        {chapter.number}
                      </span>
                      <span className='flex-1 font-medium'>{t(entry.label)}</span>
                      <span className='label-mono opacity-50'>{chapter.code}</span>
                      <ArrowUpRight aria-hidden='true' className='size-4 opacity-50' />
                    </Command.Item>
                  )
                })}
              </Command.Group>
            </Command.List>
            <div className='flex items-center justify-between border-t-2 border-foreground px-4 py-2'>
              <span className='label-mono text-[0.55rem] opacity-50'>Speedcube / Optimistic Solve</span>
              <span className='label-mono border border-foreground px-1.5 py-0.5 text-[0.55rem]'>
                ESC
              </span>
            </div>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
