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
      <Suspense fallback={<div className="min-h-screen bg-espresso-950 flex items-center justify-center text-espresso-300">Loading Host B2B Portal...</div>}>
        <App />
      </Suspense>
    </GoogleOAuthProvider>
  </StrictMode>,
)
