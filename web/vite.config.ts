import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const threeSourceMarker = '/node_modules/three/src/'
const rubiksCubeSourceMarker = '/packages/rubiks-cube/src/'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
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
          new URL('../packages/rubiks-cube/src/rubiksCube/index.ts', import.meta.url),
        ),
      },
      {
        find: /^@rubiks-cube-solver\/rubiks-cube\/core$/,
        replacement: fileURLToPath(
          new URL('../packages/rubiks-cube/src/core/index.ts', import.meta.url),
        ),
      },
      {
        find: /^@rubiks-cube-solver\/rubiks-cube\/player$/,
        replacement: fileURLToPath(
          new URL('../packages/rubiks-cube/src/player/index.ts', import.meta.url),
        ),
      },
      {
        find: /^@rubiks-cube-solver\/rubiks-cube\/state$/,
        replacement: fileURLToPath(
          new URL('../packages/rubiks-cube/src/state/index.ts', import.meta.url),
        ),
      },
      {
        find: /^@rubiks-cube-solver\/rubiks-cube\/three$/,
        replacement: fileURLToPath(
          new URL('../packages/rubiks-cube/src/rubiksCube3D/index.ts', import.meta.url),
        ),
      },
      {
        find: /^@rubiks-cube-solver\/rubiks-cube\/view$/,
        replacement: fileURLToPath(
          new URL('../packages/rubiks-cube/src/webComponent/index.ts', import.meta.url),
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
        'src/api/**/index.ts',
        'src/App.tsx',
        'src/custom-elements.d.ts',
        'src/main.tsx',
        'src/pages/**/index.ts',
        'src/stories/**',
        'src/test/**',
        'src/vendor/**',
        'src/vite-env.d.ts',
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
