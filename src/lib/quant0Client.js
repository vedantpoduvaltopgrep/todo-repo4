// quant0Client.js — a minimal hosted-redirect OAuth Authorization Code +
// PKCE client talking directly to the quant0 api-gateway. Replaces
// @quant0/react + @quant0/browser: this app only ever used their
// hosted-redirect surface (SignInButton/SignUpButton/SignOutButton,
// AuthenticateWithRedirectCallback, useAuth/useUser, openAccountPortal), so
// that subset is reimplemented here with plain fetch + Web Crypto, no SDK
// dependency.

const DOMAIN = (import.meta.env.VITE_QUANT0_DOMAIN ?? 'http://localhost:8082').replace(/\/+$/, '')
const API_BASE = `${DOMAIN}/v1`
const CLIENT_ID = import.meta.env.VITE_QUANT0_CLIENT_ID ?? ''
const REDIRECT_URI = `${window.location.origin}/callback`
const SCOPE = 'openid profile email offline_access'

const TOKENS_KEY = `quant0_tokens_${CLIENT_ID}`
const PKCE_KEY = `quant0_pkce_${CLIENT_ID}`
const REFRESH_SKEW_MS = 60_000

// --- PKCE (RFC 7636 S256) ---------------------------------------------------

function base64url(bytes) {
  let str = ''
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function randomVerifier() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return base64url(bytes)
}

async function challengeFromVerifier(verifier) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64url(new Uint8Array(digest))
}

function randomState() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return base64url(bytes)
}

// --- claims decode -----------------------------------------------------------

function decodeJwtClaims(token) {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4)
    const json = atob(padded)
    const bytes = Uint8Array.from(json, (c) => c.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    return null
  }
}

function userFromClaims(claims) {
  return {
    id: claims.sub,
    orgId: claims.org_id,
    permissions: claims.app_permissions ?? [],
    claims,
  }
}

// --- token storage -------------------------------------------------------------

function readTokens() {
  try {
    const raw = localStorage.getItem(TOKENS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeTokens(tokens) {
  localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens))
}

function clearTokens() {
  localStorage.removeItem(TOKENS_KEY)
}

let tokens = readTokens()
const listeners = new Set()

function notify() {
  for (const cb of listeners) cb()
}

function setTokensFromResponse(data) {
  tokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    idToken: data.id_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
  writeTokens(tokens)
  notify()
}

function clearSession() {
  tokens = null
  clearTokens()
  notify()
}

// --- redirect + token exchange ------------------------------------------------

async function redirectToAuthorize(screenHint) {
  const verifier = randomVerifier()
  const state = randomState()
  const challenge = await challengeFromVerifier(verifier)
  localStorage.setItem(PKCE_KEY, JSON.stringify({ verifier, state }))

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    scope: SCOPE,
    state,
    screen_hint: screenHint,
  })
  window.location.assign(`${API_BASE}/oauth/authorize?${params.toString()}`)
}

async function requestToken(body) {
  const res = await fetch(`${API_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) throw new Error(`token request failed (${res.status})`)
  return res.json()
}

async function refresh() {
  if (!tokens?.refreshToken) return null
  try {
    const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: tokens.refreshToken })
    const data = await requestToken(body)
    setTokensFromResponse(data)
    return tokens.accessToken
  } catch {
    clearSession()
    return null
  }
}

let refreshInFlight = null

const quant0 = {
  configured: Boolean(CLIENT_ID),

  signIn() {
    return redirectToAuthorize('sign_in')
  },

  signUp() {
    return redirectToAuthorize('sign_up')
  },

  // handleRedirectCallback completes the flow on the /callback page: reads
  // ?code=&state= from the URL, verifies state against the stashed PKCE
  // transaction, and exchanges the code.
  async handleRedirectCallback() {
    const url = new URL(window.location.href)
    const errorParam = url.searchParams.get('error')
    if (errorParam) {
      throw new Error(url.searchParams.get('error_description') ?? errorParam)
    }
    const code = url.searchParams.get('code')
    if (!code) throw new Error('no authorization code in the callback URL')
    const state = url.searchParams.get('state') ?? ''

    const raw = localStorage.getItem(PKCE_KEY)
    const tx = raw ? JSON.parse(raw) : null
    if (!tx) throw new Error('no PKCE transaction found — the sign-in flow may have expired or started in another tab')
    if (tx.state && state && tx.state !== state) throw new Error('state mismatch')

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      code_verifier: tx.verifier,
    })
    const data = await requestToken(body)
    localStorage.removeItem(PKCE_KEY)
    setTokensFromResponse(data)
  },

  // getToken returns the current access token, silently refreshing it first
  // when it's within REFRESH_SKEW_MS of expiry.
  async getToken() {
    if (!tokens) return null
    const nearExpiry = Date.now() >= tokens.expiresAt - REFRESH_SKEW_MS
    if (!nearExpiry) return tokens.accessToken

    if (!tokens.refreshToken) {
      if (Date.now() >= tokens.expiresAt) {
        clearSession()
        return null
      }
      return tokens.accessToken
    }

    if (!refreshInFlight) {
      refreshInFlight = refresh().finally(() => {
        refreshInFlight = null
      })
    }
    return refreshInFlight
  },

  async signOut(opts = {}) {
    const token = tokens?.accessToken
    clearSession()
    if (token) {
      try {
        await fetch(`${API_BASE}/oauth/logout`, { headers: { Authorization: `Bearer ${token}` } })
      } catch {
        /* best-effort — local session is already cleared */
      }
    }
    window.location.assign(opts.returnTo ?? window.location.origin)
  },

  // openAccountPortal mints a PKCE-bound portal ticket and bounces the
  // browser to the hosted Account Portal, signed in with no second login.
  async openAccountPortal({ accountPortalUrl, redirectAfter } = {}) {
    const token = await quant0.getToken()
    if (!token) throw new Error('openAccountPortal requires an authenticated session')

    const verifier = randomVerifier()
    const state = randomState()
    const challenge = await challengeFromVerifier(verifier)
    const portalBase = accountPortalUrl.replace(/\/+$/, '')

    const res = await fetch(`${API_BASE}/oauth/account-portal-ticket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        code_challenge: challenge,
        code_challenge_method: 'S256',
        redirect_uri: `${portalBase}/callback`,
        scope: SCOPE,
        state,
        ...(redirectAfter ? { redirect_after: redirectAfter } : {}),
      }),
    })
    if (!res.ok) throw new Error(`could not obtain an account-portal ticket (${res.status})`)
    const { portal_ticket: portalTicket } = await res.json()

    const dest = new URL(`${portalBase}/`)
    dest.searchParams.set('client_id', CLIENT_ID)
    dest.searchParams.set('portal_ticket', portalTicket)
    dest.hash = `pkce_verifier=${encodeURIComponent(verifier)}&pkce_state=${encodeURIComponent(state)}`
    window.location.assign(dest.toString())
  },

  getUser() {
    if (!tokens) return null
    const claims = decodeJwtClaims(tokens.idToken ?? tokens.accessToken)
    return claims ? userFromClaims(claims) : null
  },

  isAuthenticated() {
    return tokens !== null && Date.now() < tokens.expiresAt
  },

  subscribe(cb) {
    listeners.add(cb)
    return () => listeners.delete(cb)
  },
}

export default quant0
