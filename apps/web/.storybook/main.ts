import { fileURLToPath } from 'node:url'
import type { StorybookConfig } from '@storybook/react-vite'
import tailwindcss from '@tailwindcss/vite'
import { mergeConfig } from 'vite'

const config: StorybookConfig = {
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  stories: ['../src/**/*.stories.@(ts|tsx|mdx)'],
  typescript: {
    reactDocgen: 'react-docgen-typescript',
  },
  viteFinal: async (viteConfig) =>
    mergeConfig(viteConfig, {
      plugins: [tailwindcss()],
      resolve: {
        alias: [
          {
            find: /^three$/,
            replacement: fileURLToPath(new URL('../src/vendor/three.js', import.meta.url)),
          },
          {
            find: /^three\/examples\/jsm\/Addons\.js$/,
            replacement: fileURLToPath(
              new URL('../src/vendor/three-addons.js', import.meta.url),
            ),
          },
          { find: '@api', replacement: fileURLToPath(new URL('../src/api', import.meta.url)) },
          {
            find: '@components',
            replacement: fileURLToPath(new URL('../src/components', import.meta.url)),
          },
          { find: '@core', replacement: fileURLToPath(new URL('../src/core', import.meta.url)) },
          { find: '@pages', replacement: fileURLToPath(new URL('../src/pages', import.meta.url)) },
          { find: '@src', replacement: fileURLToPath(new URL('../src', import.meta.url)) },
        ],
      },
    }),
}

export default config
