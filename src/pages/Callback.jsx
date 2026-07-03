import { useNavigate } from 'react-router-dom'
import { AuthenticateWithRedirectCallback } from '@quant0/react'

// The redirect_uri landing page — completes the code exchange (PKCE
// verifier + state check, both handled internally) and hands control back.
// Used only by the hosted-redirect flow; the embedded widgets never
// navigate here at all.
export default function Callback() {
  const navigate = useNavigate()

  return (
    <>
      <AuthenticateWithRedirectCallback
        onComplete={() => navigate('/', { replace: true })}
        onError={(err) => {
          console.error('sign-in failed', err)
          alert(err?.message || 'Sign-in failed')
          navigate('/', { replace: true })
        }}
      />
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
