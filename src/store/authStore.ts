import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export interface User {
  id: string
  email: string
  username: string
  subscriptionTier: 'free' | 'starter' | 'professional' | 'enterprise'
  subscriptionStatus: 'active' | 'cancelled' | 'expired'
  subscriptionExpires?: string
  createdAt: string
  lastLogin?: string
}

export interface ApiToken {
  id: string
  name: string
  token: string
  permissions: string[]
  limits: {
    requestsPerMinute: number
    requestsPerDay: number
    requestsPerMonth: number
    bandwidthPerMonth: number
  }
  usage: {
    totalRequests: number
    monthlyRequests: number
    dailyRequests: number
    totalBandwidth: number
    monthlyBandwidth: number
    dailyBandwidth: number
  }
  isActive: boolean
  createdAt: string
  expiresAt?: string
}

export interface SubscriptionPlan {
  tier: string
  name: string
  price: number
  features: string[]
  limits: {
    requestsPerMinute: number
    requestsPerDay: number
    requestsPerMonth: number
    bandwidthPerMonth: number
  }
}

interface AuthState {
  // Auth state
  user: User | null
  token: string | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null

  // User data
  tokens: ApiToken[]
  subscriptionPlans: SubscriptionPlan[]
  dashboard: {
    totalUsage: {
      totalRequests: number
      monthlyRequests: number
      dailyRequests: number
      totalBandwidth: number
      monthlyBandwidth: number
      dailyBandwidth: number
    }
    activeTokens: number
    currentPlan?: SubscriptionPlan
  } | null

  // Auth actions
  login: (email: string, password: string) => Promise<void>
  register: (userData: {
    email: string
    username: string
    password: string
    subscriptionTier?: string
  }) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>

  // User management actions
  updateProfile: (data: Partial<User>) => Promise<void>
  updateSubscription: (tier: string) => Promise<void>

  // Token management actions
  createToken: (tokenData: {
    name: string
    permissions: string[]
    expiresAt?: string
    description?: string
  }) => Promise<ApiToken>
  loadTokens: () => Promise<void>
  revokeToken: (tokenId: string) => Promise<void>
  getTokenUsage: (tokenId: string) => Promise<any>

  // Dashboard actions
  loadDashboard: () => Promise<void>
  loadSubscriptionPlans: () => Promise<void>

  // Utility actions
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void
}

const API_BASE_URL = 'http://localhost:4500'

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null,
        tokens: [],
        subscriptionPlans: [],
        dashboard: null,

        // Auth actions
        login: async (email: string, password: string) => {
          set({ loading: true, error: null })

          try {
            const response = await fetch(`${API_BASE_URL}/users/login`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ email, password }),
            })

            if (!response.ok) {
              const errorData = await response.json()
              throw new Error(errorData.message || 'Login failed')
            }

            const data = await response.json()

            if (data.success && data.user) {
              set({
                user: data.user,
                token: data.user.token || data.token,
                isAuthenticated: true,
                loading: false,
                error: null,
              })
            } else {
              throw new Error('Invalid response from server')
            }
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Login failed',
              loading: false,
              isAuthenticated: false,
              user: null,
              token: null,
            })
            throw error
          }
        },

        register: async (userData) => {
          set({ loading: true, error: null })

          try {
            const response = await fetch(`${API_BASE_URL}/users/register`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(userData),
            })

            if (!response.ok) {
              const errorData = await response.json()
              throw new Error(errorData.message || 'Registration failed')
            }

            const data = await response.json()

            if (data.success && data.user) {
              set({
                user: data.user,
                token: data.user.token || data.token,
                isAuthenticated: true,
                loading: false,
                error: null,
              })
            } else {
              throw new Error('Invalid response from server')
            }
          } catch (error) {
            set({
              error:
                error instanceof Error ? error.message : 'Registration failed',
              loading: false,
              isAuthenticated: false,
              user: null,
              token: null,
            })
            throw error
          }
        },

        logout: () => {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            tokens: [],
            dashboard: null,
            error: null,
          })
        },

        checkAuth: async () => {
          const { token } = get()
          if (!token) return

          try {
            const response = await fetch(`${API_BASE_URL}/users/profile`, {
              headers: {
                'X-API-Key': token,
              },
            })

            if (!response.ok) {
              throw new Error('Authentication check failed')
            }

            const data = await response.json()

            if (data.success && data.user) {
              set({
                user: data.user,
                isAuthenticated: true,
                error: null,
              })
            } else {
              throw new Error('Invalid user data')
            }
          } catch (error) {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              error:
                error instanceof Error ? error.message : 'Auth check failed',
            })
          }
        },

        // User management actions
        updateProfile: async (data) => {
          const { token } = get()
          if (!token) throw new Error('Not authenticated')

          set({ loading: true, error: null })

          try {
            const response = await fetch(`${API_BASE_URL}/users/profile`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'X-API-Key': token,
              },
              body: JSON.stringify(data),
            })

            if (!response.ok) {
              const errorData = await response.json()
              throw new Error(errorData.message || 'Profile update failed')
            }

            const result = await response.json()

            if (result.success && result.user) {
              set({
                user: result.user,
                loading: false,
                error: null,
              })
            }
          } catch (error) {
            set({
              error:
                error instanceof Error
                  ? error.message
                  : 'Profile update failed',
              loading: false,
            })
            throw error
          }
        },

        updateSubscription: async (tier) => {
          const { token } = get()
          if (!token) throw new Error('Not authenticated')

          set({ loading: true, error: null })

          try {
            const response = await fetch(`${API_BASE_URL}/users/subscription`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'X-API-Key': token,
              },
              body: JSON.stringify({ tier }),
            })

            if (!response.ok) {
              const errorData = await response.json()
              throw new Error(errorData.message || 'Subscription update failed')
            }

            const result = await response.json()

            if (result.success && result.user) {
              set({
                user: { ...get().user!, ...result.user },
                loading: false,
                error: null,
              })
            }
          } catch (error) {
            set({
              error:
                error instanceof Error
                  ? error.message
                  : 'Subscription update failed',
              loading: false,
            })
            throw error
          }
        },

        // Token management actions
        createToken: async (tokenData) => {
          const { token } = get()
          if (!token) throw new Error('Not authenticated')

          set({ loading: true, error: null })

          try {
            const response = await fetch(`${API_BASE_URL}/users/tokens`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-API-Key': token,
              },
              body: JSON.stringify(tokenData),
            })

            if (!response.ok) {
              const errorData = await response.json()
              throw new Error(errorData.message || 'Token creation failed')
            }

            const result = await response.json()

            if (result.success && result.token) {
              // Refresh tokens list
              await get().loadTokens()
              set({ loading: false, error: null })
              return result.token
            } else {
              throw new Error('Invalid response from server')
            }
          } catch (error) {
            set({
              error:
                error instanceof Error
                  ? error.message
                  : 'Token creation failed',
              loading: false,
            })
            throw error
          }
        },

        loadTokens: async () => {
          const { token } = get()
          if (!token) return

          try {
            const response = await fetch(`${API_BASE_URL}/users/tokens`, {
              headers: {
                'X-API-Key': token,
              },
            })

            if (!response.ok) {
              throw new Error('Failed to load tokens')
            }

            const data = await response.json()

            if (data.success && data.tokens) {
              set({ tokens: data.tokens, error: null })
            }
          } catch (error) {
            set({
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to load tokens',
            })
          }
        },

        revokeToken: async (tokenId) => {
          const { token } = get()
          if (!token) throw new Error('Not authenticated')

          set({ loading: true, error: null })

          try {
            const response = await fetch(
              `${API_BASE_URL}/users/tokens/${tokenId}`,
              {
                method: 'DELETE',
                headers: {
                  'X-API-Key': token,
                },
              },
            )

            if (!response.ok) {
              const errorData = await response.json()
              throw new Error(errorData.message || 'Token revocation failed')
            }

            // Refresh tokens list
            await get().loadTokens()
            set({ loading: false, error: null })
          } catch (error) {
            set({
              error:
                error instanceof Error
                  ? error.message
                  : 'Token revocation failed',
              loading: false,
            })
            throw error
          }
        },

        getTokenUsage: async (tokenId) => {
          const { token } = get()
          if (!token) throw new Error('Not authenticated')

          try {
            const response = await fetch(
              `${API_BASE_URL}/users/tokens/${tokenId}/usage`,
              {
                headers: {
                  'X-API-Key': token,
                },
              },
            )

            if (!response.ok) {
              throw new Error('Failed to get token usage')
            }

            const data = await response.json()
            return data.success ? data : null
          } catch (error) {
            throw error
          }
        },

        // Dashboard actions
        loadDashboard: async () => {
          const { token } = get()
          if (!token) return

          try {
            const response = await fetch(`${API_BASE_URL}/users/dashboard`, {
              headers: {
                'X-API-Key': token,
              },
            })

            if (!response.ok) {
              throw new Error('Failed to load dashboard')
            }

            const data = await response.json()

            if (data.success && data.dashboard) {
              set({ dashboard: data.dashboard, error: null })
            }
          } catch (error) {
            set({
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to load dashboard',
            })
          }
        },

        loadSubscriptionPlans: async () => {
          try {
            const response = await fetch(`${API_BASE_URL}/users/plans`)

            if (!response.ok) {
              throw new Error('Failed to load subscription plans')
            }

            const data = await response.json()

            if (data.success && data.plans) {
              set({ subscriptionPlans: data.plans, error: null })
            }
          } catch (error) {
            set({
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to load subscription plans',
            })
          }
        },

        // Utility actions
        setError: (error) => set({ error }),
        setLoading: (loading) => set({ loading }),
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          user: state.user,
          token: state.token,
          isAuthenticated: state.isAuthenticated,
        }),
      },
    ),
    {
      name: 'auth-store',
    },
  ),
)
