export type FloaterConfig = {
  amplitudeX: number
  amplitudeY: number
  delay: number
  duration: number
  phase: number
  pointerX: -1 | 1
  pointerY: -1 | 1
  reaction: number
  rotation: number
}

const floaterCount = 12

function randomSource(seed: number): () => number {
  let state = seed >>> 0

  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0x1_0000_0000
  }
}

/**
 * Deterministic but organic motion settings for the decorative hero objects.
 * Values stay subtle enough for type to remain readable.
 */
export function createFloaterConfigs(
  count = floaterCount,
  seed = Math.floor(Math.random() * 0xffff_ffff),
): FloaterConfig[] {
  const random = randomSource(seed)

  return Array.from({ length: count }, () => ({
    amplitudeX: (6 + random() * 22) * (random() < 0.5 ? -1 : 1),
    amplitudeY: (8 + random() * 24) * (random() < 0.5 ? -1 : 1),
    delay: random() * 1.2,
    duration: 3.2 + random() * 2.3,
    phase: random() * Math.PI * 2,
    pointerX: random() < 0.5 ? -1 : 1,
    pointerY: random() < 0.5 ? -1 : 1,
    reaction: 0.55 + random() * 0.6,
    rotation: -12 + random() * 24,
  }))
}
