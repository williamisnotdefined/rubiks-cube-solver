import type { SyntheticEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { YouTubeChannel } from '../../channels'

type ChannelCardProps = {
  channel: YouTubeChannel
}

export function ChannelCard({ channel }: ChannelCardProps) {
  const { t } = useTranslation()

  return (
    <a
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
  )
}

function handleBannerError(event: SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.hidden = true
}
