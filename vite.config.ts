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
        ignored: ['**/public/uploads/**', '**/data/**', '**/systemSettings.json']
      },
      host: true,
      allowedHosts: true,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3001',
          changeOrigin: true,
          secure: false,
          timeout: 600000,
          proxyTimeout: 600000
        },
        '/uploads': {
          target: 'http://127.0.0.1:3001',
          changeOrigin: true,
          secure: false,
          timeout: 600000,
          proxyTimeout: 600000
        }
      }
    },
  };
});
