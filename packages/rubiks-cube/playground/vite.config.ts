import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 550,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/three/examples/jsm/controls/')) {
            return 'three-controls';
          }
          if (id.includes('/node_modules/three/examples/jsm/geometries/')) {
            return 'three-geometries';
          }
          if (id.includes('/node_modules/three/examples/jsm/loaders/')) {
            return 'three-loaders';
          }
          if (id.includes('/node_modules/three/')) {
            return 'three-core';
          }
          if (id.includes('/node_modules/gsap/')) {
            return 'gsap';
          }
          return undefined;
        },
      },
    },
  },
});
