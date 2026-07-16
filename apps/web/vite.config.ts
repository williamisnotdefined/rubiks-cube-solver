import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const threeSourceMarker = '/node_modules/three/src/'
const rubiksCubeSourceMarker = '/packages/rubiks-cube/src/'
const i18nLocaleMarker = '/apps/web/src/i18n/locales/'
const wcaDataApiProxyTarget = process.env.WCA_DATA_API_PROXY_TARGET ?? 'https://speedcube.com.br'

const radixChunkPackages: Record<string, string> = {
  '@radix-ui/react-alert-dialog': 'vendor-radix-alert-dialog',
  '@radix-ui/react-checkbox': 'vendor-radix-checkbox',
  '@radix-ui/react-dialog': 'vendor-radix-dialog',
  '@radix-ui/react-popover': 'vendor-radix-popover',
  '@radix-ui/react-select': 'vendor-radix-select',
  '@radix-ui/react-switch': 'vendor-radix-switch',
  '@radix-ui/react-toast': 'vendor-radix-toast',
  '@radix-ui/react-tooltip': 'vendor-radix-tooltip',
}

export default defineConfig({
  plugins: [
    {
      generateBundle: {
        handler(_options, bundle) {
          for (const output of Object.values(bundle)) {
            if (
              output.type !== 'chunk' ||
              (!output.fileName.includes('search-worker-entry-') &&
                !output.fileName.includes('/inside-'))
            ) {
              continue
            }

            const helperImport = output.code.match(
              /import\{a as ([A-Za-z_$][\w$]*)\}from"\.\/vendor-react-router-[^"]+\.js";/,
            )
            if (helperImport === null) {
              continue
            }

            const helperName = helperImport[1]
            const preloadCall = new RegExp(
              `${helperName}\\(\\(\\)=>import\\(([^)]+)\\),__vite__mapDeps\\(\\[[^\\]]*\\]\\)\\)`,
              'g',
            )
            output.code = output.code
              .replace(helperImport[0], '')
              .replace(preloadCall, 'import($1)')
            if (!output.code.includes('__vite__mapDeps(')) {
              output.code = output.code.replace(/const __vite__mapDeps=.*?;\n?/, '')
            }
          }
        },
        order: 'post',
      },
      name: 'cubing-worker-safe-imports',
    },
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api/wca-data/v1': {
        changeOrigin: true,
        target: wcaDataApiProxyTarget,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes(i18nLocaleMarker)) {
            const localeFile = id.slice(id.indexOf(i18nLocaleMarker) + i18nLocaleMarker.length)
            const locale = localeFile.split('.')[0]

            return locale === 'en' || locale === 'pt-BR' ? 'i18n-default-locales' : `i18n-${locale}`
          }

          if (id.includes('/node_modules/three/examples/')) {
            return 'vendor-three-examples'
          }

          if (id.includes(threeSourceMarker)) {
            const sourcePath = id.slice(id.indexOf(threeSourceMarker) + threeSourceMarker.length)
            const [folder] = sourcePath.split('/')

            if (folder === 'lights' || folder === 'loaders' || folder === 'scenes') {
              return `vendor-three-${folder}`
            }

            return 'vendor-three-runtime'
          }

          if (id.includes('/node_modules/three/')) {
            return 'vendor-three'
          }

          if (id.includes('/node_modules/gsap/')) {
            return 'vendor-gsap'
          }

          if (id.includes(rubiksCubeSourceMarker)) {
            const sourcePath = id.slice(
              id.indexOf(rubiksCubeSourceMarker) + rubiksCubeSourceMarker.length,
            )
            const [, puzzle] = sourcePath.match(/^puzzles\/([^/]+)\//) ?? []

            if (sourcePath.startsWith('puzzles/cube/core/')) {
              return 'vendor-rubiks-core'
            }

            if (puzzle !== undefined) {
              return `vendor-rubiks-${puzzle}`
            }

            return 'vendor-rubiks-shared'
          }

          if (
            id.includes('/node_modules/@tanstack/react-query/') ||
            id.includes('/node_modules/@tanstack/query-core/')
          ) {
            return 'vendor-react-query'
          }

          if (
            id.includes('/node_modules/@tanstack/react-table/') ||
            id.includes('/node_modules/@tanstack/table-core/')
          ) {
            return 'vendor-tanstack-table'
          }

          if (
            id.includes('/node_modules/@tanstack/react-virtual/') ||
            id.includes('/node_modules/@tanstack/virtual-core/')
          ) {
            return 'vendor-tanstack-virtual'
          }

          if (id.includes('/node_modules/@radix-ui/')) {
            for (const [packageName, chunkName] of Object.entries(radixChunkPackages)) {
              if (id.includes(`/node_modules/${packageName}/`)) {
                return chunkName
              }
            }

            return 'vendor-radix-core'
          }

          if (
            id.includes('/node_modules/i18next/') ||
            id.includes('/node_modules/react-i18next/')
          ) {
            return 'vendor-i18n'
          }

          if (id.includes('/node_modules/lucide-react/')) {
            return 'vendor-icons'
          }

          if (id.includes('/node_modules/motion/')) {
            return 'vendor-motion'
          }

          if (id.includes('/node_modules/react-router/')) {
            return 'vendor-react-router'
          }

          if (id.includes('/node_modules/zustand/')) {
            return 'vendor-zustand'
          }

          if (
            id.includes('/node_modules/react/') ||
            id.includes('/node_modules/react-dom/') ||
            id.includes('/node_modules/scheduler/')
          ) {
            return 'vendor-react'
          }
        },
      },
    },
  },
  resolve: {
    alias: [
      {
        find: /^three$/,
        replacement: fileURLToPath(new URL('./src/vendor/three.js', import.meta.url)),
      },
      {
        find: /^three\/examples\/jsm\/Addons\.js$/,
        replacement: fileURLToPath(new URL('./src/vendor/three-addons.js', import.meta.url)),
      },
      {
        find: /^@rubiks-cube-solver\/rubiks-cube\/controller$/,
        replacement: fileURLToPath(
          new URL(
            '../../packages/rubiks-cube/src/puzzles/cube/controller/index.ts',
            import.meta.url,
          ),
        ),
      },
      {
        find: /^@rubiks-cube-solver\/rubiks-cube\/core$/,
        replacement: fileURLToPath(
          new URL('../../packages/rubiks-cube/src/puzzles/cube/core/index.ts', import.meta.url),
        ),
      },
      {
        find: /^@rubiks-cube-solver\/rubiks-cube\/player$/,
        replacement: fileURLToPath(
          new URL('../../packages/rubiks-cube/src/puzzles/cube/player/index.ts', import.meta.url),
        ),
      },
      {
        find: /^@rubiks-cube-solver\/rubiks-cube\/state$/,
        replacement: fileURLToPath(
          new URL('../../packages/rubiks-cube/src/puzzles/cube/state/index.ts', import.meta.url),
        ),
      },
      {
        find: /^@rubiks-cube-solver\/rubiks-cube\/three$/,
        replacement: fileURLToPath(
          new URL('../../packages/rubiks-cube/src/puzzles/cube/three/index.ts', import.meta.url),
        ),
      },
      {
        find: /^@rubiks-cube-solver\/rubiks-cube\/view$/,
        replacement: fileURLToPath(
          new URL('../../packages/rubiks-cube/src/puzzles/cube/element/index.ts', import.meta.url),
        ),
      },
      {
        find: /^@rubiks-cube-solver\/rubiks-cube\/puzzles\/megaminx$/,
        replacement: fileURLToPath(
          new URL('../../packages/rubiks-cube/src/puzzles/megaminx/index.ts', import.meta.url),
        ),
      },
      {
        find: /^@rubiks-cube-solver\/rubiks-cube\/puzzles\/pyraminx$/,
        replacement: fileURLToPath(
          new URL('../../packages/rubiks-cube/src/puzzles/pyraminx/index.ts', import.meta.url),
        ),
      },
      {
        find: /^@rubiks-cube-solver\/rubiks-cube\/puzzles\/square1$/,
        replacement: fileURLToPath(
          new URL('../../packages/rubiks-cube/src/puzzles/square1/index.ts', import.meta.url),
        ),
      },
      { find: '@api', replacement: fileURLToPath(new URL('./src/api', import.meta.url)) },
      {
        find: '@components',
        replacement: fileURLToPath(new URL('./src/components', import.meta.url)),
      },
      { find: '@core', replacement: fileURLToPath(new URL('./src/core', import.meta.url)) },
      { find: '@pages', replacement: fileURLToPath(new URL('./src/pages', import.meta.url)) },
      { find: '@src', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
    ],
  },
  test: {
    coverage: {
      exclude: [
        'src/**/*.stories.{ts,tsx}',
        'src/**/__tests__/**',
        'src/**/index.ts',
        'src/**/types.ts',
        'src/**/*.d.ts',
        'src/App/App.tsx',
        'src/main/index.ts',
        'src/main/main.tsx',
        'src/stories/**',
        'src/test/**',
        'src/vendor/**',
      ],
      include: [
        'src/App/**/*.{ts,tsx}',
        'src/api/**/*.{ts,tsx}',
        'src/components/**/*.{ts,tsx}',
        'src/core/**/*.{ts,tsx}',
        'src/i18n/**/*.{ts,tsx}',
        'src/lib/**/*.{ts,tsx}',
        'src/main/{mountApp,ssg}.{ts,tsx}',
        'src/pages/**/*.{ts,tsx}',
        'src/seo/**/*.{ts,tsx}',
      ],
      provider: 'v8',
      thresholds: {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90,
      },
    },
    environment: 'jsdom',
    maxWorkers: 4,
    setupFiles: './src/test/setup',
  },
})
