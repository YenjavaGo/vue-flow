import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/vue-flow/',
  build: {
    outDir: 'docs',
    assetsDir: 'assets',
    sourcemap: true
  },
  plugins: [vue()],
  server: {
    port: 3000
  }
}) 