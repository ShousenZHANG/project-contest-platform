import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import './index.css';
import { MotionConfig } from 'framer-motion';
import App from './App';
import { QueryProvider } from './providers/QueryProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import { Toaster } from './components/ui/sonner';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <QueryProvider>
        {/* framer-motion animates inline styles from JS, so the
            prefers-reduced-motion block in index.css cannot reach it. This makes
            every motion component honour the OS setting instead. */}
        <MotionConfig reducedMotion="user">
          <App />
        </MotionConfig>
        <Toaster />
      </QueryProvider>
    </ThemeProvider>
  </React.StrictMode>
);
