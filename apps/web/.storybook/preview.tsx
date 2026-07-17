import type { Decorator, Preview } from '@storybook/react-vite'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { changeLanguage, type SupportedLanguage } from '../src/i18n/i18n'
import '../src/index.css'

const withAppProviders: Decorator = (Story, context) => {
  const locale = storyLocale(context.globals.locale)
  const theme = String(context.globals.theme ?? 'light')
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
  loaders: [async ({ globals }) => changeLanguage(storyLocale(globals.locale))],
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

function storyLocale(value: unknown): SupportedLanguage {
  const locale = String(value ?? 'en')
  return locale === 'en' ? 'en-US' : (locale as SupportedLanguage)
}
