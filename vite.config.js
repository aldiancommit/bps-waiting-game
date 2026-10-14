import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: ['chrome100', 'edge100', 'firefox100', 'safari15', 'ios15', 'es2021'],
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/phaser')) {
            return 'phaser';
          }
        }
      }
    }
  }
});
