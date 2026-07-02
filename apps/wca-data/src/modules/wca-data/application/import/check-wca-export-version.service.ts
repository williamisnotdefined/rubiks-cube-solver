import type { WcaExportClient } from '../../../../infra/http/wca-export-client.js'
import type { WcaExportMetadata } from '../../domain/export-metadata.js'

export type CheckWcaExportVersionService = ReturnType<typeof createCheckWcaExportVersionService>

type CheckWcaExportVersionServiceDeps = {
  exportClient: WcaExportClient
}

export function createCheckWcaExportVersionService({ exportClient }: CheckWcaExportVersionServiceDeps) {
  return {
    async execute(): Promise<WcaExportMetadata> {
      return exportClient.getPublicExportMetadata()
    },
  }
}
