import { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'theme'
const DEFAULT_THEME: Theme = 'dark'

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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME)

  useEffect(() => {
    setThemeState((localStorage.getItem(STORAGE_KEY) as Theme | null) ?? DEFAULT_THEME)
  }, [])

  const setTheme = (next: Theme) => {
    localStorage.setItem(STORAGE_KEY, next)
    setThemeState(next)
    applyTheme(next)
  }

  return <ThemeContext value={{ theme, setTheme }}>{children}</ThemeContext>
}

export const useTheme = () => useContext(ThemeContext)
