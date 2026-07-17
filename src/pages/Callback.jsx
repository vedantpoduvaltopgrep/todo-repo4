import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import quant0 from '../lib/quant0Client'

// The redirect_uri landing page — completes the code exchange (PKCE
// verifier + state check, both handled internally) and hands control back.
export default function Callback() {
  const navigate = useNavigate()
  const handledRef = useRef(false)

  useEffect(() => {
    // Guards against React StrictMode's double-invoked effects trying to
    // consume an already-used authorization code.
    if (handledRef.current) return
    handledRef.current = true
    quant0
      .handleRedirectCallback()
      .then(() => navigate('/', { replace: true }))
      .catch((err) => {
        console.error('sign-in failed', err)
        alert(err?.message || 'Sign-in failed')
        navigate('/', { replace: true })
      })
  }, [navigate])

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: '1rem',
          fontFamily: "'DM Sans',sans-serif",
          color: '#6b6860',
          background: '#f7f5f0',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: '2px solid #e0ddd8',
            borderTopColor: '#2d5be3',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }}
        />
        <span>Completing sign-in…</span>
      </div>
    </>
  )
}
