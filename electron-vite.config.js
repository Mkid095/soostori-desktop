const { defineConfig } = require('electron-vite')
const react = require('@vitejs/plugin-react')
const path = require('path')

module.exports = defineConfig({
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
