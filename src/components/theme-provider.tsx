import { createContext, useContext, useEffect, useState } from 'react'
import { authClient } from '#/lib/auth-client'

export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'theme'
const DEFAULT_THEME: Theme = 'dark'

/** What the server renders on <html>; the init script corrects it before hydration when a stored preference differs. */
export const defaultThemeClassName =
  (DEFAULT_THEME as Theme) === 'dark' ? 'dark' : undefined

// Runs before hydration so a stored light/system preference doesn't flash dark
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}')||'${DEFAULT_THEME}';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})()`

function applyTheme(theme: Theme) {
  const dark =
    theme === 'dark' ||
    (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

const ThemeContext = createContext<{
  theme: Theme
  setTheme: (theme: Theme) => void
}>({ theme: DEFAULT_THEME, setTheme: () => {} })

const isTheme = (value: unknown): value is Theme =>
  value === 'light' || value === 'dark' || value === 'system'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = authClient.useSession()
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME)
  const profileTheme = session?.user.theme

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    setThemeState(isTheme(stored) ? stored : DEFAULT_THEME)
  }, [])

  useEffect(() => {
    if (!isTheme(profileTheme)) return
    localStorage.setItem(STORAGE_KEY, profileTheme)
    setThemeState(profileTheme)
    applyTheme(profileTheme)
  }, [profileTheme])

  const setTheme = (next: Theme) => {
    localStorage.setItem(STORAGE_KEY, next)
    setThemeState(next)
    applyTheme(next)
    if (session) void authClient.updateUser({ theme: next })
  }

  return <ThemeContext value={{ theme, setTheme }}>{children}</ThemeContext>
}

export const useTheme = () => useContext(ThemeContext)
