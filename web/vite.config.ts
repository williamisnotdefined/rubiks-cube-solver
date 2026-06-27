import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const threeSourceMarker = '/node_modules/three/src/'
const rubiksCubeSourceMarker = '/packages/rubiks-cube/src/'
const i18nLocaleMarker = '/web/src/i18n/locales/'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 800,
    // cubing's scramble worker must not import Vite's document-based preload helper.
    modulePreload: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes(i18nLocaleMarker)) {
            return 'i18n-locales'
          }

          if (id.includes('/node_modules/three/examples/')) {
            return 'vendor-three-examples'
          }

          if (id.includes(threeSourceMarker)) {
            const sourcePath = id.slice(id.indexOf(threeSourceMarker) + threeSourceMarker.length)
            const [folder] = sourcePath.split('/')

            if (
              folder === 'lights' ||
              folder === 'loaders' ||
              folder === 'scenes'
            ) {
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
            return 'vendor-rubiks-cube'
          }

          if (id.includes('/node_modules/@tanstack/')) {
            return 'vendor-react-query'
          }

          if (id.includes('/node_modules/@radix-ui/')) {
            return 'vendor-radix'
          }

          if (id.includes('/node_modules/i18next/') || id.includes('/node_modules/react-i18next/')) {
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
        replacement: fileURLToPath(
          new URL('./src/vendor/three.js', import.meta.url),
        ),
      },
      {
        find: /^three\/examples\/jsm\/Addons\.js$/,
        replacement: fileURLToPath(
          new URL('./src/vendor/three-addons.js', import.meta.url),
        ),
      },
      {
        find: /^@rubiks-cube-solver\/rubiks-cube\/controller$/,
        replacement: fileURLToPath(
          new URL('../packages/rubiks-cube/src/puzzles/cube/controller/index.ts', import.meta.url),
        ),
      },
      {
        find: /^@rubiks-cube-solver\/rubiks-cube\/core$/,
        replacement: fileURLToPath(
          new URL('../packages/rubiks-cube/src/puzzles/cube/core/index.ts', import.meta.url),
        ),
      },
      {
        find: /^@rubiks-cube-solver\/rubiks-cube\/player$/,
        replacement: fileURLToPath(
          new URL('../packages/rubiks-cube/src/puzzles/cube/player/index.ts', import.meta.url),
        ),
      },
      {
        find: /^@rubiks-cube-solver\/rubiks-cube\/state$/,
        replacement: fileURLToPath(
          new URL('../packages/rubiks-cube/src/puzzles/cube/state/index.ts', import.meta.url),
        ),
      },
      {
        find: /^@rubiks-cube-solver\/rubiks-cube\/three$/,
        replacement: fileURLToPath(
          new URL('../packages/rubiks-cube/src/puzzles/cube/three/index.ts', import.meta.url),
        ),
      },
      {
        find: /^@rubiks-cube-solver\/rubiks-cube\/view$/,
        replacement: fileURLToPath(
          new URL('../packages/rubiks-cube/src/puzzles/cube/element/index.ts', import.meta.url),
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
        'src/App.tsx',
        'src/main.tsx',
        'src/stories/**',
        'src/test/**',
        'src/vendor/**',
      ],
      include: [
        'src/api/**/*.{ts,tsx}',
        'src/components/**/*.{ts,tsx}',
        'src/core/**/*.{ts,tsx}',
        'src/pages/**/*.{ts,tsx}',
      ],
      provider: 'v8',
      thresholds: {
        branches: 95,
        functions: 95,
        lines: 95,
        statements: 95,
      },
    },
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
