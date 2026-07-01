export type WcaExportMetadata = {
  developerUrl?: string | null
  exportDate: string
  exportFormatVersion: string
  exportVersion: string
  readme: string
  sqlFilesizeBytes: number | null
  sqlUrl: string | null
  tsvFilesizeBytes: number
  tsvUrl: string
}

export function exportFormatMajor(version: string): number | null {
  const match = /^v?(\d+)(?:\.|$)/.exec(version)

  if (match?.[1] === undefined) {
    return null
  }

  return Number(match[1])
}
