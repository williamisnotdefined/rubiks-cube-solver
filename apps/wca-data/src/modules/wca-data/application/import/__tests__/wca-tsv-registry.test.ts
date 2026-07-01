import { describe, expect, it } from 'vitest'
import { getWcaTsvDefinitionByFileName, wcaTsvFileDefinitions } from '../wca-tsv-registry.js'

describe('wcaTsvFileDefinitions', () => {
  it('defines unique known WCA TSV files and staging tables', () => {
    expect(wcaTsvFileDefinitions).toHaveLength(13)
    expect(new Set(wcaTsvFileDefinitions.map((definition) => definition.fileName)).size).toBe(wcaTsvFileDefinitions.length)
    expect(new Set(wcaTsvFileDefinitions.flatMap((definition) => definition.fileNameAliases)).size).toBe(wcaTsvFileDefinitions.length)
    expect(new Set(wcaTsvFileDefinitions.map((definition) => definition.stagingTable)).size).toBe(wcaTsvFileDefinitions.length)
  })

  it('looks up definitions by file name', () => {
    expect(getWcaTsvDefinitionByFileName('WCA_export_Events.tsv')).toMatchObject({
      key: 'events',
      stagingTable: 'wca_staging_events',
    })
    expect(getWcaTsvDefinitionByFileName('WCA_export_events.tsv')).toMatchObject({
      key: 'events',
      stagingTable: 'wca_staging_events',
    })
    expect(getWcaTsvDefinitionByFileName('WCA_export_scrambles.tsv')).toMatchObject({
      key: 'scrambles',
      stagingTable: 'wca_staging_scrambles',
    })
    expect(getWcaTsvDefinitionByFileName('unknown.tsv')).toBeNull()
  })
})
