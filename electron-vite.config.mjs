import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SDK = path.resolve(__dirname, '../soostori-sdk/packages')

// Only use local SDK aliases if the SDK source is checked out locally
// (developer environment). In CI, fall back to Verdaccio-installed packages
// in node_modules.
const useLocalSdk = existsSync(SDK)

const sdkAlias = (pkg) => useLocalSdk ? `${SDK}/${pkg}/src/index.ts` : undefined

const mainResolve = {
  alias: {
    '@': path.resolve(__dirname, 'src'),
  },
}

if (useLocalSdk) {
  mainResolve.alias['@soostori/core'] = `${SDK}/core/src/index.ts`
  mainResolve.alias['@soostori/contracts'] = `${SDK}/contracts/src/index.ts`
  mainResolve.alias['@soostori/devices'] = `${SDK}/devices/src/index.ts`
  mainResolve.alias['@soostori/events'] = `${SDK}/events/src/index.ts`
  mainResolve.alias['@soostori/inventory'] = `${SDK}/inventory/src/index.ts`
  mainResolve.alias['@soostori/business'] = `${SDK}/business/src/index.ts`
  mainResolve.alias['@soostori/desktop-adapter'] = `${SDK}/desktop-adapter/src/index.ts`
  mainResolve.alias['@soostori/sales'] = `${SDK}/business/sales/src/index.ts`
  mainResolve.alias['@soostori/updates'] = `${SDK}/updates/src/index.ts`
}

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
    resolve: mainResolve,
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
      ...(useLocalSdk ? {} : {}),
    },
  },
})
