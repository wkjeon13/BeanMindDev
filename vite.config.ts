import fs from 'fs';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  
  const keyPath = 'C:/nginx-1.26.3/certs/www.beanmindcurator.com-key.pem';
  const certPath = 'C:/nginx-1.26.3/certs/www.beanmindcurator.com-chain.pem';
  const hasRealCert = fs.existsSync(keyPath) && fs.existsSync(certPath);

  const plugins = [
    react(), 
    tailwindcss(), 
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
  ];

  if (!hasRealCert) {
    plugins.push(basicSsl());
  }

  return {
    plugins,
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
      https: hasRealCert ? {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      } : undefined,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: {
        ignored: ['**/public/uploads/**', '**/data/**', '**/systemSettings.json', '**/logs/**']
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
