import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: ['chrome111', 'edge111', 'firefox114', 'safari16.4', 'ios16.4']
  }
});
