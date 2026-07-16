import type { Decorator, Preview } from '@storybook/react-vite'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from '../src/i18n/i18n'
import '../src/index.css'

const withAppProviders: Decorator = (Story, context) => {
  const locale = String(context.globals.locale ?? 'en')
  const theme = String(context.globals.theme ?? 'light')
  void i18n.changeLanguage(locale)
  document.documentElement.dataset.theme = theme
  document.documentElement.lang = locale
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
    viewport: {
      defaultViewport: 'responsive',
    },
  },
  globalTypes: {
    locale: {
      defaultValue: 'en',
      name: 'Locale',
      toolbar: {
        icon: 'globe',
        items: ['en', 'es', 'pt-BR', 'it', 'de', 'fr', 'ru', 'zh', 'ja'],
      },
    },
    theme: {
      defaultValue: 'light',
      name: 'Theme',
      toolbar: {
        icon: 'paintbrush',
        items: ['light', 'dark'],
      },
    },
  },
}

export default preview
