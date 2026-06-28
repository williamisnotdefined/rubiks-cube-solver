import { useEffect } from 'react'
import { create } from 'zustand'

export type ThemePreference = 'dark' | 'light' | 'system'

export const themeStorageKey = 'rubiks-cube-solver-theme'

type ThemeState = {
  setThemePreference: (theme: ThemePreference) => void
  theme: ThemePreference
}

export const useThemeStore = create<ThemeState>((set) => ({
  setThemePreference: (theme) => {
    applyThemePreference(theme)
    set({ theme })
  },
  theme: storedThemePreference(),
}))

export function useThemePreferenceSync() {
  const theme = useThemeStore((state) => state.theme)

  useEffect(() => {
    applyThemePreference(theme)
  }, [theme])
}

export function storedThemePreference(): ThemePreference {
  if (typeof window === 'undefined') {
    return 'system'
  }

  const storedTheme = window.localStorage.getItem(themeStorageKey)
  return storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'system'
}

export function applyThemePreference(theme: ThemePreference) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return
  }

  if (theme === 'system') {
    window.localStorage.removeItem(themeStorageKey)
    delete document.documentElement.dataset.theme
    return
  }

  window.localStorage.setItem(themeStorageKey, theme)
  document.documentElement.dataset.theme = theme
}
