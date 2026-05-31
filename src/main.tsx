import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ThemeProvider } from '@/hooks/useTheme';
import { applyThemeMode, getStoredTheme } from '@/lib/themeMode';

// Apply the stored theme before first paint to avoid a flash of the wrong palette.
applyThemeMode(getStoredTheme());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
