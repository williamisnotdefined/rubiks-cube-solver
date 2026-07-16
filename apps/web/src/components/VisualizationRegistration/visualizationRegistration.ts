export type VisualizationKind = 'cube' | 'megaminx' | 'pyraminx' | 'square1'
export type VisualizationRegistrationStatus = 'error' | 'idle' | 'loading' | 'ready'

type RegistrationEntry = {
  listeners: Set<() => void>
  promise?: Promise<void>
  status: VisualizationRegistrationStatus
}

const elementNames: Record<VisualizationKind, string> = {
  cube: 'rubiks-cube',
  megaminx: 'megaminx-puzzle',
  pyraminx: 'pyraminx-puzzle',
  square1: 'square1-puzzle',
}

const entries: Record<VisualizationKind, RegistrationEntry> = {
  cube: createEntry(),
  megaminx: createEntry(),
  pyraminx: createEntry(),
  square1: createEntry(),
}

export function getVisualizationRegistrationStatus(
  kind: VisualizationKind,
): VisualizationRegistrationStatus {
  return isVisualizationRegistered(kind) ? 'ready' : entries[kind].status
}

export function subscribeToVisualizationRegistration(
  kind: VisualizationKind,
  listener: () => void,
) {
  entries[kind].listeners.add(listener)
  return () => entries[kind].listeners.delete(listener)
}

export function requestVisualizationRegistration(kind: VisualizationKind): Promise<void> {
  return registerVisualization(kind, false)
}

export function retryVisualizationRegistration(kind: VisualizationKind): Promise<void> {
  return registerVisualization(kind, true)
}

export function isVisualizationRegistered(kind: VisualizationKind): boolean {
  return (
    typeof customElements !== 'undefined' && customElements.get(elementNames[kind]) !== undefined
  )
}

async function registerVisualization(kind: VisualizationKind, retry: boolean): Promise<void> {
  const entry = entries[kind]
  if (isVisualizationRegistered(kind)) {
    updateStatus(kind, 'ready')
    return
  }
  if (entry.promise !== undefined) {
    return entry.promise
  }
  if (entry.status === 'error' && !retry) {
    throw new Error(`Visualization registration failed for ${kind}`)
  }

  updateStatus(kind, 'loading')
  entry.promise = loadAndRegister(kind)
    .then(() => updateStatus(kind, 'ready'))
    .catch((error: unknown) => {
      updateStatus(kind, 'error')
      throw error
    })
    .finally(() => {
      entry.promise = undefined
    })
  return entry.promise
}

async function loadAndRegister(kind: VisualizationKind) {
  if (isVisualizationRegistered(kind)) return

  switch (kind) {
    case 'cube': {
      const { RubiksCubeElement } = await import('@rubiks-cube-solver/rubiks-cube/view')
      if (!isVisualizationRegistered(kind)) RubiksCubeElement.register()
      return
    }
    case 'megaminx': {
      const { MegaminxPuzzleElement } = await import(
        '@rubiks-cube-solver/rubiks-cube/puzzles/megaminx'
      )
      if (!isVisualizationRegistered(kind)) MegaminxPuzzleElement.register()
      return
    }
    case 'pyraminx': {
      const { PyraminxPuzzleElement } = await import(
        '@rubiks-cube-solver/rubiks-cube/puzzles/pyraminx'
      )
      if (!isVisualizationRegistered(kind)) PyraminxPuzzleElement.register()
      return
    }
    case 'square1': {
      const { Square1PuzzleElement } = await import(
        '@rubiks-cube-solver/rubiks-cube/puzzles/square1'
      )
      if (!isVisualizationRegistered(kind)) Square1PuzzleElement.register()
    }
  }
}

function createEntry(): RegistrationEntry {
  return { listeners: new Set(), status: 'idle' }
}

function updateStatus(kind: VisualizationKind, status: VisualizationRegistrationStatus) {
  const entry = entries[kind]
  if (entry.status === status) return

  entry.status = status
  for (const listener of entry.listeners) listener()
}
