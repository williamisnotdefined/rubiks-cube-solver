import { describe, expect, it } from 'vitest'
import { buildJsonLd } from '../jsonLd'
import { getSeoMetadata } from '../../routes'

describe('JSON-LD metadata', () => {
  it('keeps external item-list URLs unchanged', () => {
    const graph = buildJsonLd(getSeoMetadata('/sites'))
    const itemList = graph.find((item) => item['@type'] === 'ItemList')

    expect(itemList).toBeDefined()
    expect(itemList?.itemListElement).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          item: 'https://www.worldcubeassociation.org/',
          name: 'World Cube Association',
        }),
      ]),
    )
  })
})
