import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  main: {
    build: {
      lib: {
        entry: path.resolve(__dirname, 'electron/main.ts'),
        fileName: () => 'main.js',
      },
      outDir: 'dist-electron',
      emptyOutDir: false,
      rollupOptions: {
        external: ['better-sqlite3', 'serialport'],
      },
    },
  },
  preload: {
    build: {
      lib: {
        entry: path.resolve(__dirname, 'electron/preload.ts'),
        fileName: () => 'preload.js',
      },
      outDir: 'dist-electron',
      emptyOutDir: false,
    },
  },
  renderer: {
    root: '.',
    base: './',
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      assetsDir: 'assets',
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, 'index.html'),
        },
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
