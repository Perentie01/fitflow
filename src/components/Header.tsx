import { useLocalStorage } from '@uidotdev/usehooks';
import { useEffect } from 'react';

export function Header() {
  const [darkMode, setDarkMode] = useLocalStorage<boolean>('darkMode', true);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className="bg-card border-b border-border px-4 py-3">
      <div className="flex items-center justify-between max-w-md mx-auto">
        <h1 className="font-display text-2xl tracking-tight text-foreground">
          Fit<span className="text-primary">Flow</span>
        </h1>
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          style={{ backgroundColor: darkMode ? 'var(--primary)' : 'var(--border)' }}
          aria-label="Toggle dark mode"
        >
          <span
            className={`inline-flex items-center justify-center h-4 w-4 transform rounded-full bg-card transition-transform ${
              darkMode ? 'translate-x-6' : 'translate-x-1'
            }`}
          >
            {darkMode ? (
              <svg className="w-2.5 h-2.5" style={{ color: 'var(--primary)' }} fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            ) : (
              <svg className="w-2.5 h-2.5" style={{ color: 'var(--primary)' }} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            )}
          </span>
        </button>
      </div>
    </div>
  );
}
