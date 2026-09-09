import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SDK = path.resolve(__dirname, '../soostori-sdk/packages')

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
        external: ['better-sqlite3', 'serialport', 'electron-store'],
      },
    },
    resolve: {
      alias: {
        '@soostori/core': `${SDK}/core/src/index.ts`,
        '@soostori/devices': `${SDK}/devices/src/index.ts`,
        '@soostori/events': `${SDK}/events/src/index.ts`,
        '@soostori/inventory': `${SDK}/inventory/src/index.ts`,
        '@soostori/business': `${SDK}/business/src/index.ts`,
        '@soostori/desktop-adapter': `${SDK}/desktop-adapter/src/index.ts`,
        '@soostori/sales': `${SDK}/business/sales/src/index.ts`,
        '@soostori/updates': `${SDK}/updates/src/index.ts`,
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
