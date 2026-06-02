export type RandomSource = {
  nextIndex: (upperBound: number) => number
}

export function seededRandom(seed: number): RandomSource {
  let state = seed >>> 0

  return {
    nextIndex(upperBound: number) {
      if (upperBound <= 0) {
        throw new Error('upperBound must be greater than zero')
      }

      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0

      return state % upperBound
    },
  }
}

export function randomSeed(): number {
  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint32Array(1)
    globalThis.crypto.getRandomValues(values)

    return values[0] ?? Date.now()
  }

  return Date.now()
}
