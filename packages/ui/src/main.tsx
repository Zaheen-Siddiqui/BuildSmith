import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Debug logging and error catching
console.log('[Renderer] Starting React app...')
console.log('[Renderer] document.getElementById("root"):', document.getElementById('root'))

window.addEventListener('error', (event) => {
  console.error('[Renderer] Global error:', event.error)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Renderer] Unhandled rejection:', event.reason)
})

try {
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    throw new Error('Root element not found!')
  }
  
  console.log('[Renderer] Creating React root...')
  ReactDOM.createRoot(rootElement).render(<App />)
  console.log('[Renderer] React app rendered successfully!')
} catch (error) {
  console.error('[Renderer] Failed to render React app:', error)
  document.body.innerHTML = `<div style="color: white; padding: 20px; font-family: monospace;">
    <h1>Renderer Error</h1>
    <pre>${error}</pre>
  </div>`
}
