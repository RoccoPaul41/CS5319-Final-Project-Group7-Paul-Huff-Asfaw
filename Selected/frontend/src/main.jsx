// ============================================
// PRESENTATION LAYER — App Mount (Client)
// This file boots the React Presentation Layer by
// mounting <App/> into the #root element in index.html.
// ============================================

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Render the app into the DOM.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

