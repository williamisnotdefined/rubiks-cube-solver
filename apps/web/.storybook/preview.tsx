import type { Decorator, Preview } from '@storybook/react-vite'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '../src/index.css'

const withAppProviders: Decorator = (Story) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
      queries: {
        retry: false,
        staleTime: Number.POSITIVE_INFINITY,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <Story />
    </QueryClientProvider>
  )
}

const preview: Preview = {
  decorators: [withAppProviders],
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      expanded: true,
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'centered',
  },
}

export default preview
