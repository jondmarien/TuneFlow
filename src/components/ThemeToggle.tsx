"use client";
// ThemeToggle.tsx
import { useEffect, useState } from 'react';

const THEME_KEY = 'tuneflow-theme';

function getSystemTheme() {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Only read from localStorage on the client
    const stored = (typeof window !== 'undefined') ? (localStorage.getItem(THEME_KEY) as 'light' | 'dark' | null) : null;
    setTheme(stored || getSystemTheme());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme, mounted]);

  function toggleTheme() {
    setTheme(t => (t === 'light' ? 'dark' : 'light'));
  }

  // Prevent hydration mismatch: render nothing until mounted
  if (!mounted) return null;

  return (
    <button
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      onClick={toggleTheme}
      className="fixed top-4 right-4 z-50 rounded-full p-2 bg-background border border-border shadow hover:bg-accent transition-colors"
      style={{ lineHeight: 0 }}
    >
      {theme === 'dark' ? (
        // Sun icon
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="5" fill="#FFD600" />
          <g stroke="#FFD600" strokeWidth="2">
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </g>
        </svg>
      ) : (
        // Moon icon
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 12.79A9 9 0 0112.21 3a7 7 0 100 18 9 9 0 008.79-8.21z" fill="#222" stroke="#FFD600" strokeWidth="2" />
        </svg>
      )}
    </button>
  );
}
