import { useTranslation } from 'react-i18next'

type SessionSummaryProps = {
  eventLabel: string
  sessionName: string
  solveCount: number
}

export function SessionSummary({ eventLabel, sessionName, solveCount }: SessionSummaryProps) {
  const { t } = useTranslation()

  return (
    <header className="grid gap-2 rounded-xl border bg-card p-4 text-card-foreground shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          {eventLabel}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          {sessionName}
        </h1>
      </div>
      <p className="text-sm text-muted-foreground">
        {t('timer.session.solveCount', { count: solveCount })}
      </p>
    </header>
  )
}
