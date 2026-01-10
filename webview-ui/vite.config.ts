import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // VS Code webviews require relative paths
  base: './',
  build: {
    // Output to parent dist folder for extension to access
    outDir: '../dist/webview',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Consistent filenames for easier loading in extension
        entryFileNames: 'assets/index.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
})
