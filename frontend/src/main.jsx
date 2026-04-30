// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'

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