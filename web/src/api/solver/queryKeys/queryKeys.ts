export const solverQueryKeys = {
  all: ['solver'] as const,
  health: () => [...solverQueryKeys.all, 'health'] as const,
  puzzleStrategies: (puzzleSlug: string) =>
    [...solverQueryKeys.all, 'puzzles', puzzleSlug, 'strategies'] as const,
  puzzles: () => [...solverQueryKeys.all, 'puzzles'] as const,
  strategies: () => [...solverQueryKeys.all, 'strategies'] as const,
}
