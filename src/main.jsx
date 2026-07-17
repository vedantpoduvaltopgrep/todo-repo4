import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './lib/AuthProvider'
import quant0 from './lib/quant0Client'
import TodoApp from './pages/TodoApp'
import Callback from './pages/Callback'
import './index.css'

if (!quant0.configured) {
  document.getElementById('root').innerHTML =
    '<div style="max-width:480px;margin:10vh auto;text-align:center;font-family:sans-serif">' +
    '<h1>Tasker</h1>' +
    '<p>Set <code>VITE_QUANT0_CLIENT_ID</code> in <code>.env</code> (copy <code>.env.example</code>), ' +
    'then restart <code>npm run dev</code>.</p></div>'
} else {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<TodoApp />} />
          <Route path="/callback" element={<Callback />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>,
  )
}
