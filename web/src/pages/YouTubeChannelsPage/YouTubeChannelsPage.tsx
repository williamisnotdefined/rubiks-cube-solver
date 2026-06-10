import type { SyntheticEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { youtubeChannels } from './channels'

export function YouTubeChannelsPage() {
  const { t } = useTranslation()

  return (
    <main className="h-full min-h-0 overflow-y-auto bg-app-bg px-3 py-4 text-app-text sm:px-5 sm:py-6">
      <section className="mx-auto grid w-full max-w-7xl gap-5">
        <header className="grid gap-3 border border-app-border bg-app-surface p-5">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-app-muted">
            {t('channels.kicker')}
          </p>
          <h1 className="text-3xl font-black uppercase tracking-[-0.04em] text-app-text sm:text-5xl">
            {t('channels.title')}
          </h1>
          <p className="max-w-3xl text-sm font-semibold leading-6 text-app-muted">
            {t('channels.description', { count: youtubeChannels.length })}
          </p>
        </header>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {youtubeChannels.map((channel) => (
            <a
              key={channel.id}
              aria-label={t('channels.openChannel', { channel: channel.name })}
              className="group border border-app-border bg-app-surface text-app-text outline-none transition-colors hover:border-app-text hover:bg-app-surface-raised focus-visible:ring-2 focus-visible:ring-app-focus/50"
              href={channel.url}
              rel="noreferrer"
              target="_blank"
            >
              <div className="relative aspect-video overflow-hidden border-b border-app-border bg-app-control">
                <div className="absolute inset-0 grid place-items-center px-4 text-center text-lg font-black uppercase tracking-[0.12em] text-app-muted" aria-hidden="true">
                  {channel.name}
                </div>
                {channel.bannerUrl !== undefined && (
                  <img
                    alt={t('channels.bannerAlt', { channel: channel.name })}
                    className="relative h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                    loading="lazy"
                    src={channel.bannerUrl}
                    onError={handleBannerError}
                  />
                )}
              </div>
              <div className="grid gap-1 p-3">
                <h2 className="text-base font-black uppercase tracking-[0.08em] text-app-text">
                  {channel.name}
                </h2>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-app-muted group-hover:text-app-text">
                  {t('channels.openInYouTube')}
                </p>
              </div>
            </a>
          ))}
        </div>
      </section>
    </main>
  )
}

function handleBannerError(event: SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.hidden = true
}
