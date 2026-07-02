import type { Clock } from './clock.js'

export const systemClock: Clock = {
  now: () => new Date(),
}
