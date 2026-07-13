import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { youtubeChannels } from '../channels'
import { YouTubeChannelsPage } from '../YouTubeChannelsPage'

describe('YouTubeChannelsPage', () => {
  it('renders the curated YouTube channel grid', () => {
    render(<YouTubeChannelsPage />)

    expect(screen.getByRole('heading', { name: 'YT Channels' })).toBeInTheDocument()
    expect(youtubeChannels).toHaveLength(30)
    expect(screen.getAllByRole('link')).toHaveLength(youtubeChannels.length)
    expect(screen.getByText(`A curated grid of ${youtubeChannels.length} YouTube channels for tutorials, speedcubing, reviews, records, and puzzle culture.`)).toBeInTheDocument()
  })

  it('links channel cards to YouTube in a new tab', () => {
    render(<YouTubeChannelsPage />)

    const jPermLink = screen.getByRole('link', { name: 'Open J Perm on YouTube' })

    expect(jPermLink).toHaveAttribute('href', 'https://www.youtube.com/channel/UCqTVfT9JQqhA6_Hi_h_h97Q')
    expect(jPermLink).toHaveAttribute('target', '_blank')
    expect(jPermLink).toHaveAttribute('rel', 'noreferrer')
    expect(screen.getByRole('img', { name: 'J Perm channel banner' })).toHaveAttribute(
      'src',
      youtubeChannels[0]?.bannerUrl,
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
