import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Writable } from 'node:stream'
import { afterEach, describe, expect, it } from 'vitest'
import { getWcaTsvDefinitionByFileName } from '../../../import/wca-tsv-registry.js'
import { copySql, PostgresCopyStagingLoader, WcaTsvCopyTransform } from '../postgres-copy-staging-loader.js'
import type { CopyQueryClient } from '../postgres-copy-staging-loader.js'

let tempDir: string | undefined

afterEach(async () => {
  if (tempDir !== undefined) {
    await rm(tempDir, { force: true, recursive: true })
    tempDir = undefined
  }
})

describe('copySql', () => {
  it('builds COPY SQL from an internal TSV definition', () => {
    const definition = requiredDefinition('WCA_export_Events.tsv')

    expect(copySql(definition)).toBe(
      'copy "wca_staging_events" ("import_run_id", "id", "name", "rank", "format") from stdin with (format text, delimiter E\'\t\', null \'\')',
    )
  })
})

describe('WcaTsvCopyTransform', () => {
  it('prefixes import_run_id and selects staging columns', async () => {
    const definition = requiredDefinition('WCA_export_Events.tsv')
    const transform = new WcaTsvCopyTransform({
      definition,
      importRunId: '11111111-1111-4111-8111-111111111111',
      validateHeaders: {
        execute: () => ({
          headerColumns: ['id', 'name', 'rank', 'format'],
          sourceColumnIndexes: [0, 1, 2, 3],
          stagingColumns: definition.stagingColumns,
        }),
      },
    })

    const output = await collectTransform(transform, 'id\tname\trank\tformat\n333\t3x3x3 Cube\t10\ttime\n')

    expect(output).toBe('11111111-1111-4111-8111-111111111111\t333\t3x3x3 Cube\t10\ttime\n')
    expect(transform.rowCount).toBe(1)
  })
})

describe('PostgresCopyStagingLoader', () => {
  it('deletes previous run rows and streams transformed TSV rows into COPY', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'wca-copy-'))
    const localPath = join(tempDir, 'events.tsv')
    await writeFile(localPath, 'id\tname\trank\tformat\n333\t3x3x3 Cube\t10\ttime\n222\t2x2x2 Cube\t20\ttime\n')
    const writes: string[] = []
    const copyWritable = new Writable({
      write(chunk, _encoding, callback) {
        writes.push(chunk.toString())
        callback()
      },
    })
    const calls: Array<{ params?: unknown[]; query: string | Writable }> = []
    const client: CopyQueryClient = {
      query(query, params) {
        calls.push({ params, query })
        return query instanceof Writable ? query : Promise.resolve({ rows: [] })
      },
    }
    const loader = new PostgresCopyStagingLoader(client, () => copyWritable)

    await expect(loader.loadFile({
      definition: requiredDefinition('WCA_export_Events.tsv'),
      importRunId: '11111111-1111-4111-8111-111111111111',
      localPath,
    })).resolves.toEqual({
      fileName: 'WCA_export_Events.tsv',
      rowCount: 2,
      stagingTable: 'wca_staging_events',
    })

    expect(calls[0]).toMatchObject({
      params: ['11111111-1111-4111-8111-111111111111'],
      query: 'delete from "wca_staging_events" where import_run_id = $1',
    })
    expect(writes.join('')).toBe(
      '11111111-1111-4111-8111-111111111111\t333\t3x3x3 Cube\t10\ttime\n'
      + '11111111-1111-4111-8111-111111111111\t222\t2x2x2 Cube\t20\ttime\n',
    )
  })
})

function requiredDefinition(fileName: string) {
  const definition = getWcaTsvDefinitionByFileName(fileName)

  if (definition === null) {
    throw new Error(`Missing test definition ${fileName}`)
  }

  return definition
}

function collectTransform(transform: WcaTsvCopyTransform, input: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: string[] = []
    transform.on('data', (chunk) => chunks.push(chunk.toString()))
    transform.on('error', reject)
    transform.on('end', () => resolve(chunks.join('')))
    transform.end(input)
  })
}
