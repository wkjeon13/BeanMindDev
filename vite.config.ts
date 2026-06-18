import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      basicSsl(),
      {
        name: 'configure-server',
        configureServer(server) {
          if (server.httpServer) {
            const http = server.httpServer as any;
            http.setTimeout(600000); // 10 minutes
            http.keepAliveTimeout = 600000;
            http.headersTimeout = 601000;
            if ('requestTimeout' in http) {
              http.requestTimeout = 600000;
            }
          }
        }
      }
    ],
    optimizeDeps: {
      include: [
        '@capacitor/geolocation',
        '@react-google-maps/api',
        '@react-oauth/google',
        'lucide-react',
        'react',
        'react-dom',
        'react-router-dom',
        'i18next',
        'react-i18next'
      ]
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: {
        ignored: ['**/public/uploads/**', '**/data/**', '**/systemSettings.json', '**/logs/**']
      },
      host: true,
      allowedHosts: ['dev.beanmindcurator.com', 'localhost'],
      proxy: {
        '/api/users/me/badge': {
          target: 'http://127.0.0.1:4001',
          changeOrigin: true,
          secure: false,
          timeout: 600000,
          proxyTimeout: 600000
        },
        '/api/users/bookmarks': {
          target: 'http://127.0.0.1:4001',
          changeOrigin: true,
          secure: false,
          timeout: 600000,
          proxyTimeout: 600000
        },
        '/api/users/prescriptions': {
          target: 'http://127.0.0.1:4001',
          changeOrigin: true,
          secure: false,
          timeout: 600000,
          proxyTimeout: 600000
        },
        '/api/users/checkins': {
          target: 'http://127.0.0.1:4001',
          changeOrigin: true,
          secure: false,
          timeout: 600000,
          proxyTimeout: 600000
        },
        '/api/users/collections': {
          target: 'http://127.0.0.1:4001',
          changeOrigin: true,
          secure: false,
          timeout: 600000,
          proxyTimeout: 600000
        },
        '/api/stamps': {
          target: 'http://127.0.0.1:4001',
          changeOrigin: true,
          secure: false,
          timeout: 600000,
          proxyTimeout: 600000
        },
        '^/api/users/[^/]+/follow-status': {
          target: 'http://127.0.0.1:4001',
          changeOrigin: true,
          secure: false,
          timeout: 600000,
          proxyTimeout: 600000
        },
        '^/api/shops/[^/]+/follow-status': {
          target: 'http://127.0.0.1:4001',
          changeOrigin: true,
          secure: false,
          timeout: 600000,
          proxyTimeout: 600000
        },
        '/api': {
          target: 'http://127.0.0.1:4000',
          changeOrigin: true,
          secure: false,
          timeout: 600000,
          proxyTimeout: 600000
        },
        '/uploads': {
          target: 'http://127.0.0.1:4000',
          changeOrigin: true,
          secure: false,
          timeout: 600000,
          proxyTimeout: 600000
        }
      }
    },
  };
});
