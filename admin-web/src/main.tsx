import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google';
import 'leaflet/dist/leaflet.css';
import './index.css'
import App from './App.tsx'
import '@/i18n';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your-default-client-id';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Suspense fallback={<div>Loading Admin...</div>}>
        <App />
      </Suspense>
    </GoogleOAuthProvider>
  </StrictMode>,
)
