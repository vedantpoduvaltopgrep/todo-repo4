import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Quant0Provider } from '@quant0/react'
import TodoApp from './pages/TodoApp'
import Callback from './pages/Callback'
import './index.css'

const DOMAIN = import.meta.env.VITE_QUANT0_DOMAIN ?? 'http://localhost:8082'
const CLIENT_ID = import.meta.env.VITE_QUANT0_CLIENT_ID ?? ''

if (!CLIENT_ID) {
  document.getElementById('root').innerHTML =
    '<div style="max-width:480px;margin:10vh auto;text-align:center;font-family:sans-serif">' +
    '<h1>Tasker</h1>' +
    '<p>Set <code>VITE_QUANT0_CLIENT_ID</code> in <code>.env</code> (copy <code>.env.example</code>), ' +
    'then restart <code>npm run dev</code>.</p></div>'
} else {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <Quant0Provider domain={DOMAIN} clientId={CLIENT_ID}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<TodoApp />} />
          <Route path="/callback" element={<Callback />} />
        </Routes>
      </BrowserRouter>
    </Quant0Provider>,
  )
}
