// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'
import { registerSW } from 'virtual:pwa-register'

// Register PWA service worker
registerSW({ immediate: true })

// Handle chunk/module loading errors (e.g. after a redeployment when older hashes are requested by a cached index.html)
const handleReloadOnError = (msg) => {
  const key = 'chunk-load-error-reload'
  const lastReload = sessionStorage.getItem(key)
  const now = Date.now()
  // Only reload if we haven't reloaded in the last 10 seconds to prevent infinite reload loops
  if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
    sessionStorage.setItem(key, now.toString())
    console.warn(`Reloading page due to: ${msg}`)
    window.location.reload()
  } else {
    console.error(`Dynamic import error reload loop prevented for: ${msg}`)
  }
}

window.addEventListener('vite:preloadError', () => {
  handleReloadOnError('vite:preloadError')
})

window.addEventListener('error', (event) => {
  const errorMsg = event.message || ''
  if (errorMsg.includes('Failed to fetch dynamically imported module')) {
    handleReloadOnError('window.error: Failed to fetch dynamic module')
  }
}, true)

window.addEventListener('unhandledrejection', (event) => {
  const errorMsg = (event.reason && event.reason.message) || ''
  if (errorMsg.includes('Failed to fetch dynamically imported module')) {
    handleReloadOnError('unhandledrejection: Failed to fetch dynamic module')
  }
})

// Menonaktifkan console.log dan kawan-kawan di mode production
if (import.meta.env.PROD) {
  console.log = () => {}
  console.info = () => {}
  console.debug = () => {}
  // (Opsional) Biarkan console.error dan console.warn tetap menyala untuk tracking error kritis
  // console.warn = () => {} 
  // console.error = () => {}
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)