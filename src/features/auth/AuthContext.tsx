import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/api/auth.api'
import { setUnauthorizedHandler } from '@/api/client'
import type { LoginRequest, UserDto } from '@/types/api'

interface AuthState {
  user: UserDto | null
  loading: boolean
  isStaff: boolean
  isAdmin: boolean
  isCustomer: boolean
  login: (body: LoginRequest) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  homePath: string
}

const AuthContext = createContext<AuthState | null>(null)

function rolesOf(user: UserDto | null) {
  return user?.roles ?? []
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const refresh = useCallback(async () => {
    try {
      const me = await authApi.me()
      setUser(me)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null)
      navigate('/login', { replace: true })
    })
  }, [navigate])

  const login = useCallback(async (body: LoginRequest) => {
    const me = await authApi.login(body)
    setUser(me)
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      setUser(null)
      navigate('/login', { replace: true })
    }
  }, [navigate])

  const value = useMemo<AuthState>(() => {
    const roles = rolesOf(user)
    const isStaff = roles.includes('Admin') || roles.includes('Manager')
    const isAdmin = roles.includes('Admin')
    const isCustomer = roles.includes('Customer')
    return {
      user,
      loading,
      isStaff,
      isAdmin,
      isCustomer,
      login,
      logout,
      refresh,
      homePath: isStaff ? '/' : isCustomer ? '/app' : '/login',
    }
  }, [user, loading, login, logout, refresh])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}
