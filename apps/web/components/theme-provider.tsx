'use client';

import * as React from 'react';

type Theme = 'dark' | 'light' | 'sepia';

const ThemeContext = React.createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
}>({ theme: 'dark', setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>('dark');

  React.useEffect(() => {
    const stored = (typeof window !== 'undefined' && window.localStorage.getItem('tide.theme')) as
      | Theme
      | null;
    if (stored) {
      setThemeState(stored);
      document.documentElement.setAttribute('data-theme', stored);
    }
  }, []);

  const setTheme = React.useCallback((t: Theme) => {
    setThemeState(t);
    document.documentElement.setAttribute('data-theme', t);
    window.localStorage.setItem('tide.theme', t);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): { theme: Theme; setTheme: (t: Theme) => void } {
  return React.useContext(ThemeContext);
}
