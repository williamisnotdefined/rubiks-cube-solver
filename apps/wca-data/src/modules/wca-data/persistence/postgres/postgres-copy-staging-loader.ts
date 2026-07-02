import { createReadStream } from 'node:fs'
import { Transform, Writable, type TransformCallback } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { from as copyFrom } from 'pg-copy-streams'
import type { WcaStagingFileLoadResult, WcaStagingLoader } from '../../application/import/load-wca-staging.service.js'
import { createValidateWcaTsvHeadersService, type ValidatedWcaTsvHeaders } from '../../application/import/validate-wca-tsv-headers.service.js'
import type { WcaTsvFileDefinition } from '../../application/import/wca-tsv-registry.js'

export type CopyQueryClient = {
  query: (query: string | Writable, params?: unknown[]) => unknown
}

export type CopyQueryPool = {
  connect: () => Promise<CopyQueryClient & { release: () => void }>
}

type CopyFromFactory = (sql: string) => Writable

export class PostgresCopyStagingLoader implements WcaStagingLoader {
  private readonly validateHeaders = createValidateWcaTsvHeadersService()

  constructor(
    private readonly client: CopyQueryClient,
    private readonly copyFromFactory: CopyFromFactory = copyFrom,
  ) {}

  async loadFile(input: {
    definition: WcaTsvFileDefinition
    importRunId: string
    localPath: string
  }): Promise<WcaStagingFileLoadResult> {
    await this.client.query(`delete from ${pgIdentifier(input.definition.stagingTable)} where import_run_id = $1`, [input.importRunId])

    const copyStream = this.copyFromFactory(copySql(input.definition))
    const queryResult = this.client.query(copyStream)
    const writable = queryResult instanceof Writable ? queryResult : copyStream
    const transform = new WcaTsvCopyTransform({
      definition: input.definition,
      importRunId: input.importRunId,
      validateHeaders: this.validateHeaders,
    })

    await pipeline(createReadStream(input.localPath), transform, writable)

    return {
      fileName: input.definition.fileName,
      rowCount: transform.rowCount,
      stagingTable: input.definition.stagingTable,
    }
  }
}

export class PostgresPoolCopyStagingLoader implements WcaStagingLoader {
  constructor(private readonly pool: CopyQueryPool) {}

  async loadFile(input: {
    definition: WcaTsvFileDefinition
    importRunId: string
    localPath: string
  }): Promise<WcaStagingFileLoadResult> {
    const client = await this.pool.connect()

    try {
      return await new PostgresCopyStagingLoader(client).loadFile(input)
    } finally {
      client.release()
    }
  }
}

export function copySql(definition: WcaTsvFileDefinition): string {
  const columns = ['import_run_id', ...definition.stagingColumns].map(pgIdentifier).join(', ')

  return `copy ${pgIdentifier(definition.stagingTable)} (${columns}) from stdin with (format text, delimiter E'\t', null '')`
}

function pgIdentifier(identifier: string): string {
  if (!/^[a-z_][a-z0-9_]*$/.test(identifier)) {
    throw new Error(`Invalid PostgreSQL identifier: ${identifier}`)
  }

  return `"${identifier}"`
}

type WcaTsvCopyTransformDeps = {
  definition: WcaTsvFileDefinition
  importRunId: string
  validateHeaders: ReturnType<typeof createValidateWcaTsvHeadersService>
}

export class WcaTsvCopyTransform extends Transform {
  rowCount = 0
  private buffer = ''
  private validatedHeaders: ValidatedWcaTsvHeaders | null = null

  constructor(private readonly deps: WcaTsvCopyTransformDeps) {
    super()
  }

  _transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback): void {
    try {
      this.buffer += chunk.toString('utf8')
      this.flushCompleteLines()
      callback()
    } catch (error) {
      callback(error instanceof Error ? error : new Error(String(error)))
    }
  }

  _flush(callback: TransformCallback): void {
    try {
      if (this.buffer.length > 0) {
        this.processLine(this.buffer)
        this.buffer = ''
      }

      if (this.validatedHeaders === null) {
        throw new Error(`${this.deps.definition.fileName} does not contain a TSV header`)
      }

      callback()
    } catch (error) {
      callback(error instanceof Error ? error : new Error(String(error)))
    }
  }

  private flushCompleteLines(): void {
    let newlineIndex = this.buffer.indexOf('\n')

    while (newlineIndex !== -1) {
      const line = this.buffer.slice(0, newlineIndex)
      this.buffer = this.buffer.slice(newlineIndex + 1)
      this.processLine(line)
      newlineIndex = this.buffer.indexOf('\n')
    }
  }

  private processLine(rawLine: string): void {
    const line = rawLine.replace(/\r$/, '')

    if (this.validatedHeaders === null) {
      this.validatedHeaders = this.deps.validateHeaders.execute({
        definition: this.deps.definition,
        headerLine: line,
      })
      return
    }

    if (line.length === 0) {
      return
    }

    const fields = line.split('\t')
    const selectedFields = this.validatedHeaders.sourceColumnIndexes.map((index) => index === null ? '' : fields[index] ?? '')
    this.push(`${[this.deps.importRunId, ...selectedFields].join('\t')}\n`)
    this.rowCount += 1
  }
}
