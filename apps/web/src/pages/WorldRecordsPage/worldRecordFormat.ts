import type { WcaEvent, WcaWorldRecord, WcaWorldRecordType } from '@api/wcaData'

export function formatRecordValue(
  record: Pick<WcaWorldRecord, 'event' | 'type' | 'value'>,
  formatMoves = (count: number) => `${count} moves`,
): string {
  const raw = record.value.raw

  if (raw === -1) {
    return 'DNF'
  }

  if (raw === -2) {
    return 'DNS'
  }

  if (record.event.format === 'time') {
    return formatCentiseconds(raw)
  }

  if (record.event.format === 'number' && record.type === 'average') {
    return formatMoves(Number((raw / 100).toFixed(2)))
  }

  if (record.event.format === 'number') {
    return formatMoves(raw)
  }

  return String(raw)
}

export function formatSolveValue(
  raw: number,
  event: WcaEvent,
  type: WcaWorldRecordType,
  formatMoves?: (count: number) => string,
): string {
  return formatRecordValue({ event, type, value: { raw } }, formatMoves)
}

export function formatRecordType(type: WcaWorldRecordType): string {
  return type === 'single' ? 'Single' : 'Average'
}

export function formatCentiseconds(raw: number): string {
  const centiseconds = Math.abs(raw)
  const minutes = Math.floor(centiseconds / 6000)
  const seconds = Math.floor((centiseconds % 6000) / 100)
  const hundredths = centiseconds % 100

  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${hundredths.toString().padStart(2, '0')}`
  }

  return `${seconds}.${hundredths.toString().padStart(2, '0')}`
}
