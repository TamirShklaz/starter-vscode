import path from 'node:path'
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
  // Replace import.meta usage which doesn't work in VS Code webviews
  define: {
    'import.meta.env': JSON.stringify({}),
    'import.meta.hot': 'undefined',
  },
  build: {
    // Output to parent dist folder for extension to access
    outDir: '../dist/webview',
    emptyOutDir: true,
    // Use IIFE format instead of ES modules for VS Code webview compatibility
    rollupOptions: {
      output: {
        format: 'iife',
        // Consistent filenames for easier loading in extension
        entryFileNames: 'assets/index.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
        // Inline dynamic imports since IIFE doesn't support code splitting
        inlineDynamicImports: true,
      },
    },
  },
})
