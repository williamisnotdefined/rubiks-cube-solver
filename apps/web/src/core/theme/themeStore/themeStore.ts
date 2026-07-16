import { useEffect } from 'react'
import { create } from 'zustand'

export type ThemePreference = 'dark' | 'light' | 'system'
export type ResolvedThemePreference = Exclude<ThemePreference, 'system'>

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

  useEffect(() => {
    if (
      theme !== 'system' ||
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return undefined
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => applyThemePreference('system')

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
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

  const root = document.documentElement

  root.classList.remove('dark', 'light')

  if (theme === 'system') {
    window.localStorage.removeItem(themeStorageKey)
    delete root.dataset.theme
    root.classList.add(systemThemePreference())
    return
  }

  window.localStorage.setItem(themeStorageKey, theme)
  root.dataset.theme = theme
  root.classList.add(theme)
}

function systemThemePreference(): ResolvedThemePreference {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
