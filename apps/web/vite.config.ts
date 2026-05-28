import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const threeSourceMarker = '/node_modules/three/src/'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 550,
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

          if (id.includes('/node_modules/@houstonp/rubiks-cube/')) {
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
      { find: '@api', replacement: fileURLToPath(new URL('./src/api', import.meta.url)) },
      {
        find: '@components',
        replacement: fileURLToPath(new URL('./src/components', import.meta.url)),
      },
      { find: '@pages', replacement: fileURLToPath(new URL('./src/pages', import.meta.url)) },
      { find: '@src', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
    ],
  },
})
