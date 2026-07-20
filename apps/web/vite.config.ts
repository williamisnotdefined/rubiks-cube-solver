import { fileURLToPath } from 'node:url'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { cubingWorkerSafeImports } from './build/cubingWorkerSafeImports'

const wcaDataApiProxyTarget = process.env.WCA_DATA_API_PROXY_TARGET ?? 'https://speedcube.com.br'

export default defineConfig({
  plugins: [
    cubingWorkerSafeImports(),
    react(),
    babel({ presets: [reactCompilerPreset({ panicThreshold: 'none' })] }),
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
    modulePreload: false,
    sourcemap: false,
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
