import { describe, expect, it, vi } from 'vitest'
import { publicWcaDataDocsUrl, redirectToWcaDataDocs } from '../wcaDataDocsRedirect'

describe('WCA Data docs redirect', () => {
  it('redirects directly to the public docs URL', () => {
    const replace = vi.fn()

    redirectToWcaDataDocs({ replace })

    expect(replace).toHaveBeenCalledWith('https://speedcube.com.br/api/wca-data/v1/docs')
    expect(publicWcaDataDocsUrl).toBe('https://speedcube.com.br/api/wca-data/v1/docs')
  })
})
