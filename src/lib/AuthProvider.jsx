import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react'
import quant0 from './quant0Client'

const AuthContext = createContext(null)

// AuthProvider republishes quant0Client's local token state via context,
// kept in sync with useSyncExternalStore so useAuth()/useUser() re-render
// together on any sign-in/sign-out.
export function AuthProvider({ children }) {
  const isSignedIn = useSyncExternalStore(quant0.subscribe, quant0.isAuthenticated)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  const user = isSignedIn ? quant0.getUser() : null

  return (
    <AuthContext.Provider value={{ isLoaded, isSignedIn, user }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>')
  return { isLoaded: ctx.isLoaded, isSignedIn: ctx.isSignedIn, getToken: quant0.getToken }
}

export function useUser() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useUser must be used within an <AuthProvider>')
  return { user: ctx.user }
}
