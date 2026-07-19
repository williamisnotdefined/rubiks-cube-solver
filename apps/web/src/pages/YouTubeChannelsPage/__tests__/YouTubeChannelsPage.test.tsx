import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { youtubeChannels } from '../channels'
import { YouTubeChannelsPage } from '../YouTubeChannelsPage'

describe('YouTubeChannelsPage', () => {
  it('renders the curated YouTube channel grid', () => {
    render(<YouTubeChannelsPage />)

    expect(screen.getByRole('heading', { name: 'YT Channels' })).toBeInTheDocument()
    expect(youtubeChannels).toHaveLength(31)
    expect(screen.getAllByRole('link')).toHaveLength(youtubeChannels.length)
    expect(
      screen.getByText(
        `A curated grid of ${youtubeChannels.length} YouTube channels for tutorials, speedcubing, reviews, records, and puzzle culture.`,
      ),
    ).toBeInTheDocument()
  })

  it('links channel cards to YouTube in a new tab', () => {
    render(<YouTubeChannelsPage />)

    const jPermLink = screen.getByRole('link', { name: 'Open J Perm on YouTube' })

    expect(jPermLink).toHaveAttribute(
      'href',
      'https://www.youtube.com/channel/UCqTVfT9JQqhA6_Hi_h_h97Q',
    )
    expect(jPermLink).toHaveAttribute('target', '_blank')
    expect(jPermLink).toHaveAttribute('rel', 'noreferrer')
    expect(screen.getByRole('img', { name: 'J Perm channel banner' })).toHaveAttribute(
      'src',
      youtubeChannels[0]?.bannerUrl?.replace('=w2560-', '=w960-'),
    )
    expect(screen.getByRole('img', { name: 'J Perm channel banner' })).toHaveAttribute(
      'width',
      '1280',
    )
    expect(screen.getByRole('img', { name: 'J Perm channel banner' })).toHaveAttribute(
      'height',
      '720',
    )
    expect(screen.getByRole('img', { name: 'J Perm channel banner' })).toHaveAttribute(
      'srcset',
      expect.stringContaining('480w'),
    )
    expect(screen.getByRole('img', { name: 'J Perm channel banner' })).toHaveAttribute(
      'sizes',
      '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw',
    )
  })

  it('includes Renan Cerpe in the curated channel directory', () => {
    render(<YouTubeChannelsPage />)

    expect(youtubeChannels[0]?.id).toBe('renan-cerpe')
    expect(screen.getByRole('link', { name: 'Open Renan Cerpe on YouTube' })).toHaveAttribute(
      'href',
      'https://www.youtube.com/channel/UCmpgWhblqM_lZJNRBSeqT7g',
    )
    expect(screen.getByRole('img', { name: 'Renan Cerpe channel banner' })).toHaveAttribute(
      'src',
      '/channels/renan-cerpe.jpeg',
    )
  })

  it('keeps the name fallback for missing and failed channel banners', () => {
    render(<YouTubeChannelsPage />)

    expect(
      screen.queryByRole('img', { name: 'TheSimonShi channel banner' }),
    ).not.toBeInTheDocument()
    expect(screen.getAllByText('TheSimonShi')).toHaveLength(2)

    const jPermBanner = screen.getByRole('img', { name: 'J Perm channel banner' })
    fireEvent.error(jPermBanner)

    expect(jPermBanner).not.toBeVisible()
  })
})
