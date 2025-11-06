import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

type AuthState = {
  token: string | null
  user: { email: string; isAdmin: boolean } | null
  setAuth: (token: string, user: { email: string; isAdmin: boolean }) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'auth-storage', //local storage key
      storage: createJSONStorage(() => localStorage),
    }
  )
)