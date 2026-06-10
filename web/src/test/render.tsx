import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  type RenderHookOptions,
  type RenderOptions,
  render,
  renderHook,
} from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
      queries: {
        retry: false,
      },
    },
  })
}

type ProviderOptions = {
  queryClient?: QueryClient
}

function createWrapper({ queryClient = createTestQueryClient() }: ProviderOptions = {}) {
  return function TestProviders({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

type RenderWithProvidersOptions = RenderOptions & ProviderOptions

export function renderWithProviders(ui: ReactElement, options: RenderWithProvidersOptions = {}) {
  const queryClient = options.queryClient ?? createTestQueryClient()

  return {
    queryClient,
    ...render(ui, {
      ...options,
      wrapper: createWrapper({ queryClient }),
    }),
  }
}

type RenderHookWithProvidersOptions<TProps> = Omit<RenderHookOptions<TProps>, 'wrapper'> &
  ProviderOptions

export function renderHookWithProviders<TResult, TProps>(
  hook: (initialProps: TProps) => TResult,
  options: RenderHookWithProvidersOptions<TProps> = {},
) {
  const queryClient = options.queryClient ?? createTestQueryClient()

  return {
    queryClient,
    ...renderHook(hook, {
      ...options,
      wrapper: createWrapper({ queryClient }),
    }),
  }
}
