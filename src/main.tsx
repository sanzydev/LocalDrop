import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from './theme/theme';
import { App } from './App';
import './theme/tokens.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
