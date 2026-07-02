import { useTranslation } from 'react-i18next'
import { PageHeader } from '@components/layout/PageHeader'
import { PageScaffold } from '@components/layout/PageScaffold'
import { PageTitle } from '@components/layout/PageTitle'
import { youtubeChannels } from './channels'
import { ChannelGrid } from './components/ChannelGrid'

export function YouTubeChannelsPage() {
  const { t } = useTranslation()

  return (
    <PageScaffold contentClassName="max-w-7xl gap-5">
      <PageHeader>
        <PageTitle>
          {t('channels.title')}
        </PageTitle>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          {t('channels.description', { count: youtubeChannels.length })}
        </p>
      </PageHeader>
      <ChannelGrid channels={youtubeChannels} />
    </PageScaffold>
  )
}
