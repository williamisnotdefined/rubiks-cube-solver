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
      className='group overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm outline-none transition-all hover:bg-accent hover:text-accent-foreground hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50'
      href={channel.url}
      rel='noreferrer'
      target='_blank'
    >
      <div className='relative aspect-video overflow-hidden border-b bg-muted'>
        <div
          className='absolute inset-0 grid place-items-center px-4 text-center text-lg font-semibold text-muted-foreground'
          aria-hidden='true'
        >
          {channel.name}
        </div>
        {channel.logoPath !== undefined ? (
          <img
            alt={t('channels.bannerAlt', { channel: channel.name })}
            className='relative h-full w-full object-contain transition-transform duration-200 group-hover:scale-[1.02]'
            height='720'
            loading='lazy'
            src={channel.logoPath}
            width='1280'
            onError={handleBannerError}
          />
        ) : channel.bannerUrl !== undefined ? (
          <img
            alt={t('channels.bannerAlt', { channel: channel.name })}
            className='relative h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]'
            height='720'
            loading='lazy'
            sizes='(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'
            src={bannerUrlAtWidth(channel.bannerUrl, 960)}
            srcSet={`${bannerUrlAtWidth(channel.bannerUrl, 480)} 480w, ${bannerUrlAtWidth(channel.bannerUrl, 960)} 960w, ${bannerUrlAtWidth(channel.bannerUrl, 1280)} 1280w`}
            width='1280'
            onError={handleBannerError}
          />
        ) : null}
      </div>
      <div className='grid gap-1 p-4'>
        <h2 className='text-base font-semibold'>{channel.name}</h2>
        <p className='text-sm text-muted-foreground group-hover:text-accent-foreground'>
          {t('channels.openInYouTube')}
        </p>
      </div>
    </a>
  )
}

function handleBannerError(event: SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.hidden = true
}

function bannerUrlAtWidth(url: string, width: number): string {
  return url.replace(/=w\d+-/, `=w${width}-`)
}
