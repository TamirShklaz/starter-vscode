// First thing: log that the module started loading
console.log('[Nota] main.tsx module loading...')

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/App'
import '@/index.css'

console.log('[Nota] All imports completed')

// Catch and display any errors during initialization
window.onerror = (message, source, lineno, colno, error) => {
  console.error('Global error:', { message, source, lineno, colno, error })
  const root = document.getElementById('root')
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; color: red; font-family: monospace;">
        <h2>Error loading Nota</h2>
        <pre>${message}\n${source}:${lineno}:${colno}\n${error?.stack ?? ''}</pre>
      </div>
    `
  }
}

try {
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    throw new Error('Root element not found')
  }

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
catch (error) {
  console.error('Failed to mount React app:', error)
  const root = document.getElementById('root')
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; color: red; font-family: monospace;">
        <h2>Failed to mount Nota</h2>
        <pre>${error instanceof Error ? error.stack : String(error)}</pre>
      </div>
    `
  }
}
