import { useTranslation } from 'react-i18next'

const publicDocsUrl = 'http://speedcube.com.br/api/wca-data/v1/docs'

export function WcaDataApiPage() {
  const { t } = useTranslation()

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-app-bg text-app-text">
      <section className="mx-auto grid w-full max-w-3xl gap-5 px-4 py-8 sm:px-6 lg:px-8">
        <header className="grid gap-4 border border-app-border bg-app-surface p-5 sm:p-7">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-app-muted">
            {t('wcaDataApi.kicker')}
          </p>
          <h1 className="text-4xl font-black uppercase tracking-[-0.06em] text-app-text sm:text-6xl">
            {t('wcaDataApi.title')}
          </h1>
          <p className="text-base leading-7 text-app-muted sm:text-lg">
            {t('wcaDataApi.subtitle')}
          </p>
          <p className="border border-app-border-strong bg-app-control p-3 text-sm font-semibold leading-6 text-app-text">
            {t('wcaDataApi.disclaimer')}
          </p>
          <a
            className="inline-flex w-fit border border-app-border bg-app-text px-4 py-3 text-xs font-extrabold uppercase tracking-[0.14em] text-app-inverse outline-none focus-visible:ring-2 focus-visible:ring-app-focus/50"
            href={publicDocsUrl}
          >
            {t('wcaDataApi.docsLink')}
          </a>
        </header>
      </section>
    </main>
  )
}
