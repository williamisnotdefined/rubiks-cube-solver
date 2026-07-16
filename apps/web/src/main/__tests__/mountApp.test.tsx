import { createElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const createRoot = vi.fn(() => ({ render: vi.fn() }))
const hydrateRoot = vi.fn()

vi.mock('react-dom/client', () => ({ createRoot, hydrateRoot }))

describe('mountApp', () => {
  beforeEach(() => {
    createRoot.mockClear()
    hydrateRoot.mockClear()
  })

  it('hydrates prerendered markup', async () => {
    const { mountApp } = await import('../mountApp')
    const root = document.createElement('div')
    const app = createElement('main', null, 'Static content')
    root.innerHTML = '<main>Static content</main>'

    mountApp(root, app)

    expect(hydrateRoot).toHaveBeenCalledWith(root, app)
    expect(createRoot).not.toHaveBeenCalled()
  })

  it('creates a client root when no prerendered markup exists', async () => {
    const { mountApp } = await import('../mountApp')
    const root = document.createElement('div')

    mountApp(root, createElement('main'))

    expect(createRoot).toHaveBeenCalledWith(root)
    expect(hydrateRoot).not.toHaveBeenCalled()
  })
})
