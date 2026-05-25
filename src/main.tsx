import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';
import './i18n';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your-default-client-id';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Suspense fallback={<div className="h-[100dvh] w-full bg-black flex items-center justify-center text-espresso-400 font-mono text-xs">Loading Beanmind...</div>}>
        <App />
      </Suspense>
    </GoogleOAuthProvider>
  </StrictMode>,
);
