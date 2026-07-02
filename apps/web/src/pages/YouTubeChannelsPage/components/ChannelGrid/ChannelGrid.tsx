import type { YouTubeChannel } from '../../channels'
import { ChannelCard } from '../ChannelCard'

type ChannelGridProps = {
  channels: readonly YouTubeChannel[]
}

export function ChannelGrid({ channels }: ChannelGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {channels.map((channel) => (
        <ChannelCard key={channel.id} channel={channel} />
      ))}
    </div>
  )
}
