import { useTranslation } from 'react-i18next'

type SessionSummaryProps = {
  eventLabel: string
  sessionName: string
  solveCount: number
}

export function SessionSummary({ eventLabel, sessionName, solveCount }: SessionSummaryProps) {
  const { t } = useTranslation()

  return (
    <header className="grid gap-2 border border-[#2b2b2b] bg-[#101010] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#a8a8a8]">
          {eventLabel}
        </p>
        <h1 className="text-2xl font-black uppercase tracking-[0.12em] text-[#f7f7f7]">
          {sessionName}
        </h1>
      </div>
      <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-[#a8a8a8]">
        {t('timer.session.solveCount', { count: solveCount })}
      </p>
    </header>
  )
}
