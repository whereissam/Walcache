import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface UIState {
  // Global UI State
  currentCID: string
  sidebarOpen: boolean

  // Global loading and error states
  globalLoading: boolean
  globalError: string | null

  // Actions
  setCurrentCID: (cid: string) => void
  setSidebarOpen: (open: boolean) => void
  setGlobalLoading: (loading: boolean) => void
  setGlobalError: (error: string | null) => void

  // Toast notifications
  notifications: Array<{
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    message?: string
    timestamp: number
  }>
  addNotification: (notification: {
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    message?: string
  }) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
}

export const useUIStore = create<UIState>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentCID: '',
      sidebarOpen: false,
      globalLoading: false,
      globalError: null,
      notifications: [],

      // Actions
      setCurrentCID: (cid) => set({ currentCID: cid }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setGlobalLoading: (loading) => set({ globalLoading: loading }),
      setGlobalError: (error) => set({ globalError: error }),

      // Notification actions
      addNotification: (notification) => {
        const id = Math.random().toString(36).substr(2, 9)
        const newNotification = {
          ...notification,
          id,
          timestamp: Date.now(),
        }

        set((state) => ({
          notifications: [...state.notifications, newNotification],
        }))

        // Auto-remove after 5 seconds
        setTimeout(() => {
          get().removeNotification(id)
        }, 5000)
      },

      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      clearNotifications: () => set({ notifications: [] }),
    }),
    {
      name: 'ui-store',
    },
  ),
)
