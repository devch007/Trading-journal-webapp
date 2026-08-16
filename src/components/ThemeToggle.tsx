import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      if (localStorage.theme === 'dark') return true;
      if (localStorage.theme === 'light') return false;
      return false; // Default to sleek light mode as requested
    }
    return false;
  });

  useEffect(() => {
    const isDarkTheme = localStorage.theme === 'dark';
    setIsDark(isDarkTheme);
    
    if (isDarkTheme) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    const newTheme = nextDark ? 'dark' : 'light';
    localStorage.setItem('theme', newTheme);
    
    if (nextDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-xl border border-gray-200/80 dark:border-neutral-800 bg-white dark:bg-[#16181f] hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300 transition-all shadow-2xs"
      title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-500 hover:rotate-45 transition-transform" />
      ) : (
        <Moon className="w-4 h-4 text-slate-700 dark:text-slate-200 hover:-rotate-12 transition-transform" />
      )}
    </button>
  );
}
