export const solverQueryKeys = {
  all: ['solver'] as const,
  health: () => [...solverQueryKeys.all, 'health'] as const,
  strategies: () => [...solverQueryKeys.all, 'strategies'] as const,
}
