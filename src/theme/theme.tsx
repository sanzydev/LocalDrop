import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ColorScheme = 'ocean' | 'violet' | 'emerald' | 'amber' | 'rose' | 'midnight';

interface ThemeContextType {
  theme: ThemeMode;
  effectiveTheme: 'light' | 'dark';
  colorScheme: ColorScheme;
  setTheme: (theme: ThemeMode) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('localdrop_theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
    return 'system';
  });

  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(() => {
    const saved = localStorage.getItem('localdrop_color_scheme');
    if (saved === 'ocean' || saved === 'violet' || saved === 'emerald' || saved === 'amber' || saved === 'rose' || saved === 'midnight') {
      return saved as ColorScheme;
    }
    return 'ocean';
  });

  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const computeEffectiveTheme = (mode: ThemeMode): 'light' | 'dark' => {
      if (mode === 'system') {
        return mediaQuery.matches ? 'dark' : 'light';
      }
      return mode;
    };

    const currentEffective = computeEffectiveTheme(theme);
    setEffectiveTheme(currentEffective);
    document.documentElement.setAttribute('data-theme', currentEffective);
    document.documentElement.setAttribute('data-color-scheme', colorScheme);

    const handleChange = () => {
      if (theme === 'system') {
        const nextEffective = mediaQuery.matches ? 'dark' : 'light';
        setEffectiveTheme(nextEffective);
        document.documentElement.setAttribute('data-theme', nextEffective);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, colorScheme]);

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    localStorage.setItem('localdrop_theme', mode);
  };

  const setColorScheme = (scheme: ColorScheme) => {
    setColorSchemeState(scheme);
    localStorage.setItem('localdrop_color_scheme', scheme);
    document.documentElement.setAttribute('data-color-scheme', scheme);
  };

  const toggleTheme = () => {
    const next = effectiveTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, colorScheme, setTheme, setColorScheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
