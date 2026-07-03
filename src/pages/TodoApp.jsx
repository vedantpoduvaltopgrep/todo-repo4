import { useState } from 'react'
import {
  useAuth,
  useUser,
  useQuant0Context,
  SignIn,
  SignUp,
  SignInButton,
  SignUpButton,
  SignOutButton,
} from '@quant0/react'

const ACCOUNT_PORTAL_URL = import.meta.env.VITE_ACCOUNT_PORTAL_URL ?? 'http://localhost:3001'
const DEFAULT_MODE = import.meta.env.VITE_QUANT0_DEFAULT_MODE === 'embedded' ? 'embedded' : 'redirect'
const ACCENT = '#2d5be3' // matches --accent in index.css — themes the embedded widgets to match
const APPEARANCE = { variables: { colorPrimary: ACCENT } }

// ModeToggle switches the landing hero between the two ways @quant0/react
// can drive sign-in: "redirect" (SignInButton/SignUpButton — a full-page
// hop to the hosted login portal) and "embedded" (SignIn/SignUp rendered
// in-page, no navigation at all). Same client_id, same app — just two
// integration styles, switchable live for the demo.
function ModeToggle({ mode, setMode }) {
  return (
    <div className="mode-toggle">
      <button className={mode === 'redirect' ? 'active' : ''} onClick={() => setMode('redirect')}>
        Redirect
      </button>
      <button className={mode === 'embedded' ? 'active' : ''} onClick={() => setMode('embedded')}>
        Embedded
      </button>
    </div>
  )
}

// EmbeddedAuth toggles between <SignIn> and <SignUp> in place — both
// complete without ever navigating away from this page.
function EmbeddedAuth() {
  const [view, setView] = useState('signin')
  return (
    <div style={{ maxWidth: 400, margin: '2rem auto 0' }}>
      {view === 'signin' ? (
        <SignIn appearance={APPEARANCE} onSignUpClick={() => setView('signup')} />
      ) : (
        <SignUp appearance={APPEARANCE} onSignInClick={() => setView('signin')} />
      )}
    </div>
  )
}

function LoadingScreen() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--ink-muted)' }}>
      <div style={{ width: 28, height: 28, border: '2px solid #e0ddd8', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )
}

export default function TodoApp() {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const { user } = useUser()
  const { client } = useQuant0Context()

  const [mode, setMode] = useState(DEFAULT_MODE)
  const [todos, setTodos] = useState(() => JSON.parse(sessionStorage.getItem('todos') || '[]'))
  const [inputVal, setInputVal] = useState('')
  const [tokenOpen, setTokenOpen] = useState(false)
  const [tokenValue, setTokenValue] = useState('')
  const [toast, setToast] = useState({ show: false, msg: '' })

  const showToast = (msg) => {
    setToast({ show: true, msg })
    setTimeout(() => setToast({ show: false, msg: '' }), 3000)
  }

  const name = user?.claims?.name || user?.claims?.email || 'there'
  const initials = String(name).trim().split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)

  // The token isn't read from storage directly — getToken() returns the
  // SDK's current valid access token (silently refreshing first if it's
  // near expiry), fetched on demand only when the reveal panel opens.
  const revealToken = async () => {
    if (!tokenOpen) {
      setTokenValue((await getToken()) || '')
    }
    setTokenOpen((o) => !o)
  }

  const manageAccount = () => {
    void client.openAccountPortal({ accountPortalUrl: ACCOUNT_PORTAL_URL })
  }

  const saveTodos = (updated) => {
    setTodos(updated)
    sessionStorage.setItem('todos', JSON.stringify(updated))
  }
  const addTodo = () => { if (!inputVal.trim()) return; saveTodos([{ id: Date.now(), text: inputVal.trim(), done: false }, ...todos]); setInputVal('') }
  const toggleTodo = (id) => saveTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  const deleteTodo = (id) => saveTodos(todos.filter((t) => t.id !== id))

  const active = todos.filter((t) => !t.done)
  const done = todos.filter((t) => t.done)

  if (!isLoaded) return <LoadingScreen />

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--ink)' }}>

      {/* NAV */}
      <nav style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 2rem', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <span style={{ fontFamily: "'DM Serif Display',serif", fontSize: '1.4rem', letterSpacing: '-0.02em' }}>
          Task<span style={{ color: 'var(--accent)' }}>r</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isSignedIn ? (
            <>
              <div
                onClick={manageAccount}
                title="Manage account"
                style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'var(--accent-light)', borderRadius: 999, padding: '0.3rem 0.9rem 0.3rem 0.4rem', fontSize: '0.8rem', fontWeight: 500, color: 'var(--accent)', cursor: 'pointer' }}
              >
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{initials}</div>
                {name}
              </div>
              <SignOutButton className="btn btn-danger-ghost">Sign out</SignOutButton>
            </>
          ) : (
            <>
              <SignInButton className="btn btn-outline">Sign In</SignInButton>
              <SignUpButton className="btn btn-primary">Sign Up →</SignUpButton>
            </>
          )}
        </div>
      </nav>

      {/* LANDING */}
      {!isSignedIn && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 60px)', padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'var(--accent-light)', color: 'var(--accent)', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.35rem 0.9rem', borderRadius: 999, marginBottom: '1.5rem' }}>
            ● Powered by Quant0 Auth
          </div>
          <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 'clamp(2.4rem,5vw,3.8rem)', lineHeight: 1.1, letterSpacing: '-0.03em', maxWidth: 640, marginBottom: '1.25rem' }}>
            Your tasks, <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>beautifully</em> organised.
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'var(--ink-muted)', maxWidth: 460, lineHeight: 1.65, marginBottom: '2rem' }}>
            A minimal todo app demonstrating @quant0/react — the same client_id,
            in both hosted-redirect and embedded-widget integration modes.
          </p>

          <ModeToggle mode={mode} setMode={setMode} />

          {mode === 'redirect' ? (
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1.75rem' }}>
              <SignUpButton className="btn btn-primary btn-lg">Create account →</SignUpButton>
              <SignInButton className="btn btn-outline btn-lg">Sign in</SignInButton>
            </div>
          ) : (
            <EmbeddedAuth />
          )}

          <div style={{ marginTop: '3.5rem', padding: '1rem 1.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '0.8rem', color: 'var(--ink-muted)', maxWidth: 440, lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--ink)' }}>Demo app</strong> —{' '}
            {mode === 'redirect'
              ? 'Sign In / Sign Up redirects to the Quant0 backend, which forwards to the hosted login portal, then returns here with a session.'
              : 'Sign In / Sign Up happen right here — no redirect, no page navigation, same backend and client_id as redirect mode.'}
          </div>
        </div>
      )}

      {/* AUTHENTICATED */}
      {isSignedIn && (
        <div style={{ maxWidth: 680, margin: '2.5rem auto', padding: '0 1.5rem 4rem' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: '1.9rem', letterSpacing: '-0.02em' }}>My Tasks</h1>
            <p style={{ color: 'var(--ink-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>Welcome back, {name}!</p>
            <div onClick={revealToken} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#eef7f1', border: '1px solid #c3e6d1', color: 'var(--success)', fontSize: '0.75rem', fontWeight: 600, padding: '0.3rem 0.8rem', borderRadius: 999, marginTop: '0.6rem', cursor: 'pointer' }}>
              ✓ Session active — view access token
            </div>
            {tokenOpen && (
              <div style={{ marginTop: '0.75rem', background: '#1a1814', borderRadius: 'var(--radius-sm)', padding: '1rem 1.25rem', fontFamily: 'monospace', fontSize: '0.72rem', color: '#a8e6b8', wordBreak: 'break-all', lineHeight: 1.6 }}>
                {tokenValue}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.5rem' }}>
            <input value={inputVal} onChange={(e) => setInputVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTodo()} placeholder="Add a new task…"
              style={{ flex: 1, padding: '0.7rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontFamily: "'DM Sans',sans-serif", fontSize: '0.9rem', background: 'var(--surface)', color: 'var(--ink)', outline: 'none' }} />
            <button onClick={addTodo} className="btn btn-primary">Add</button>
          </div>

          {active.length > 0 && <>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: '0.6rem' }}>Active</div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {active.map((t) => (
                <li key={t.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: 'var(--shadow)' }}>
                  <button onClick={() => toggleTodo(t.id)} style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--border)', cursor: 'pointer', background: 'transparent', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: '0.9rem' }}>{t.text}</span>
                  <button onClick={() => deleteTodo(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: '1.1rem', padding: '0.2rem' }}>×</button>
                </li>
              ))}
            </ul>
          </>}

          {done.length > 0 && <>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: '0.6rem' }}>Completed</div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {done.map((t) => (
                <li key={t.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: 'var(--shadow)', opacity: 0.55 }}>
                  <button onClick={() => toggleTodo(t.id)} style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--accent)', cursor: 'pointer', background: 'var(--accent)', color: '#fff', fontSize: 10, flexShrink: 0 }}>✓</button>
                  <span style={{ flex: 1, fontSize: '0.9rem', textDecoration: 'line-through', color: 'var(--ink-muted)' }}>{t.text}</span>
                  <button onClick={() => deleteTodo(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: '1.1rem', padding: '0.2rem' }}>×</button>
                </li>
              ))}
            </ul>
          </>}

          {todos.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--ink-faint)', fontSize: '0.9rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.4 }}>✦</div>
              No tasks yet — add one above to get started.
            </div>
          )}
        </div>
      )}

      {/* TOAST */}
      <div style={{ position: 'fixed', bottom: '1.5rem', left: '50%', transform: toast.show ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(4rem)', background: 'var(--ink)', color: '#fff', padding: '0.6rem 1.25rem', borderRadius: 999, fontSize: '0.85rem', fontWeight: 500, opacity: toast.show ? 1 : 0, transition: 'all 0.3s', zIndex: 9999, whiteSpace: 'nowrap', pointerEvents: 'none' }}>
        {toast.msg}
      </div>
    </div>
  )
}
