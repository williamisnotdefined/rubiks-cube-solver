import { useTranslation } from 'react-i18next'
import { ChapterBar } from '@components/layout/ChapterBar'
import { PageHeader } from '@components/layout/PageHeader'
import { PageDescription } from '@components/layout/PageDescription'
import { PageScaffold } from '@components/layout/PageScaffold'
import { PageTitle } from '@components/layout/PageTitle'
import { youtubeChannels } from './channels'
import { ChannelGrid } from './components/ChannelGrid'

export function YouTubeChannelsPage() {
  const { t } = useTranslation()

  return (
    <PageScaffold contentClassName='max-w-7xl gap-6' smoothScroll>
      <PageHeader>
        <ChapterBar />
        <PageTitle>{t('channels.title')}</PageTitle>
        <PageDescription>
          {t('channels.description', { count: youtubeChannels.length })}
        </PageDescription>
      </PageHeader>
      <ChannelGrid channels={youtubeChannels} />
    </PageScaffold>
  )
}
