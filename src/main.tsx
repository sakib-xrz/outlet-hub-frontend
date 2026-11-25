import '@/styles/globals.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { startAuthSession } from '@/features/auth/services/session';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root is missing from index.html');

void startAuthSession();

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
