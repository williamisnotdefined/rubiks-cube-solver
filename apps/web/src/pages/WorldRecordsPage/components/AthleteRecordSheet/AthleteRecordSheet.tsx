import { useGetWcaPersonProfile, type WcaPersonProfile, type WcaWorldRecord } from '@api/wcaData'
import { Button } from '@components/Button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@components/Sheet'
import { ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatRecordValue, formatSolveValue } from '../../worldRecordFormat'

type AthleteRecordSheetProps = {
  record: WcaWorldRecord | null
  onOpenChange: (open: boolean) => void
}

export function AthleteRecordSheet({ record, onOpenChange }: AthleteRecordSheetProps) {
  const { t } = useTranslation()
  const profileQuery = useGetWcaPersonProfile(record?.athlete.id ?? null)
  const profile = profileQuery.data?.data ?? null

  return (
    <Sheet open={record !== null} onOpenChange={onOpenChange}>
      <SheetContent
        className='w-full overflow-hidden p-0 sm:max-w-xl'
        closeLabel={t('common.close')}
      >
        {record === null ? null : <AthleteRecordContent profile={profile} record={record} />}
      </SheetContent>
    </Sheet>
  )
}

function AthleteRecordContent({
  profile,
  record,
}: {
  profile: WcaPersonProfile | null
  record: WcaWorldRecord
}) {
  const { i18n, t } = useTranslation()
  const athleteName = profile?.name ?? record.athlete.name
  const athleteId = profile?.id ?? record.athlete.id
  const countryName =
    profile?.countryName ??
    record.athlete.countryName ??
    record.athlete.countryIso2 ??
    t('worldRecords.athlete.unknownCountry')
  const wcaUrl = profile?.wcaUrl ?? record.athlete.wcaUrl

  return (
    <>
      <SheetHeader className='border-b px-6 py-6 text-start'>
        <div className='flex items-start gap-5 pe-8'>
          <AthleteAvatar name={athleteName} profile={profile} record={record} />
          <div className='min-w-0 flex-1'>
            <SheetTitle className='text-2xl leading-tight'>{athleteName}</SheetTitle>
            <SheetDescription className='mt-1'>
              {athleteId} · {countryName}
            </SheetDescription>
            <div className='mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm'>
              <ProfileStat
                label={t('worldRecords.athlete.competitions')}
                locale={i18n.resolvedLanguage}
                value={profile?.competitionCount}
              />
              <ProfileStat
                label={t('worldRecords.athlete.solves')}
                locale={i18n.resolvedLanguage}
                value={profile?.totalSolves}
              />
              <ProfileStat
                label={t('worldRecords.athlete.records')}
                locale={i18n.resolvedLanguage}
                value={profile?.records?.total ?? null}
              />
              <ProfileStat
                label={t('worldRecords.athlete.medals')}
                locale={i18n.resolvedLanguage}
                value={profile?.medals?.total ?? null}
              />
            </div>
          </div>
        </div>
      </SheetHeader>

      <div className='min-h-0 flex-1 overflow-y-auto px-6 py-5'>
        <section className='grid gap-7'>
          <div>
            <SectionTitle>{t('worldRecords.athlete.selectedResult')}</SectionTitle>
            <div className='mt-3 flex items-end justify-between gap-4'>
              <div>
                <p className='font-mono text-4xl font-semibold text-primary'>
                  {formatRecordValue(record, (count) => t('worldRecords.moves', { count }))}
                </p>
                <p className='mt-1 text-sm text-muted-foreground'>
                  {t('worldRecords.athlete.worldRank', { rank: record.rank.world })} ·{' '}
                  {t(`worldRecords.types.${record.type}`)} · {record.event.name}
                </p>
              </div>
              <div className='text-end text-sm text-muted-foreground'>
                <p>{t('worldRecords.athlete.continentRank', { rank: record.rank.continent })}</p>
                <p>{t('worldRecords.athlete.countryRank', { rank: record.rank.country })}</p>
              </div>
            </div>
          </div>

          <Divider />

          <div>
            <SectionTitle>{t('worldRecords.table.competition')}</SectionTitle>
            {record.competition === null ? (
              <p className='mt-3 text-sm text-muted-foreground'>
                {t('worldRecords.athlete.competitionUnavailable')}
              </p>
            ) : (
              <div className='mt-3 text-sm'>
                <p className='font-medium'>{record.competition.name}</p>
                <p className='mt-1 text-muted-foreground'>
                  {record.competition.city}
                  {record.competition.countryIso2 === null
                    ? ''
                    : `, ${record.competition.countryIso2}`}{' '}
                  · {record.competition.date.start}
                </p>
                <p className='mt-1 text-muted-foreground'>
                  {record.result?.round ?? t('worldRecords.athlete.unknownRound')} ·{' '}
                  {record.result?.format ?? t('worldRecords.athlete.unknownFormat')}
                </p>
              </div>
            )}
          </div>

          <Divider />

          <div>
            <SectionTitle>{t('worldRecords.athlete.solves')}</SectionTitle>
            {record.result === null ? (
              <p className='mt-3 text-sm text-muted-foreground'>
                {t('worldRecords.athlete.attemptsUnavailable')}
              </p>
            ) : (
              <div className='mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm'>
                {record.result.solves.map((solve, index) => {
                  const isRecordAttempt = record.result?.attemptNumbers.includes(index + 1) ?? false
                  return (
                    <span
                      className={
                        isRecordAttempt ? 'font-semibold text-primary' : 'text-muted-foreground'
                      }
                      key={`${record.result?.id}-${index}`}
                    >
                      {index + 1}:{' '}
                      {formatSolveValue(solve.raw, record.event, record.type, (count) =>
                        t('worldRecords.moves', { count }),
                      )}
                    </span>
                  )
                })}
              </div>
            )}
          </div>

          <Divider />

          <div>
            <SectionTitle>{t('worldRecords.athlete.scrambleEvidence')}</SectionTitle>
            <p className='mt-3 text-sm leading-6 text-muted-foreground'>
              {t(`worldRecords.scramble.${record.scramble.status}Description`)}
            </p>
            {record.scramble.candidates.length > 0 ? (
              <div className='mt-4 grid'>
                {record.scramble.candidates.slice(0, 8).map((candidate) => (
                  <div className='border-t py-3' key={candidate.id}>
                    <p className='text-xs text-muted-foreground'>
                      {t('worldRecords.scramble.candidateLabel', {
                        group: candidate.groupId,
                        number: candidate.scrambleNumber,
                      })}
                    </p>
                    <code className='mt-1 block text-xs leading-5'>{candidate.scramble}</code>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <Button asChild className='w-fit px-0' variant='link'>
            <a href={wcaUrl} rel='noreferrer' target='_blank'>
              {t('worldRecords.athlete.openProfile')}
              <ExternalLink aria-hidden='true' className='size-4' />
            </a>
          </Button>
        </section>
      </div>
    </>
  )
}

function AthleteAvatar({
  name,
  profile,
  record,
}: {
  name: string
  profile: WcaPersonProfile | null
  record: WcaWorldRecord
}) {
  const avatarUrl = profile?.avatarThumbUrl ?? profile?.avatarUrl ?? record.athlete.avatarUrl

  if (avatarUrl !== null) {
    return <img alt='' className='size-24 border object-cover' src={avatarUrl} />
  }

  return (
    <div className='grid size-24 place-items-center border bg-muted text-xl font-semibold text-muted-foreground'>
      {initials(name)}
    </div>
  )
}

function ProfileStat({
  label,
  locale,
  value,
}: {
  label: string
  locale?: string
  value: number | null | undefined
}) {
  return (
    <div>
      <p className='font-medium'>
        {value === null || value === undefined ? '-' : value.toLocaleString(locale)}
      </p>
      <p className='text-xs uppercase tracking-wide text-muted-foreground'>{label}</p>
    </div>
  )
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
      {children}
    </h3>
  )
}

function Divider() {
  return <div className='border-t' />
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase() ?? '')
    .join('')
}
