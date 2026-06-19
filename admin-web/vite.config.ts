import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
      '@admin': path.resolve(__dirname, './src')
    },
    dedupe: ['react', 'react-dom', 'react-router-dom', 'react-i18next', 'i18next']
  },
  server: {
    port: 3003,
    strictPort: true,
    allowedHosts: ['dev.beanmindcurator.com', 'localhost'],
    host: '0.0.0.0',
    fs: {
      allow: ['..']
    },
    watch: {
      ignored: ['**/data/**', '**/systemSettings.json', '**/logs/**']
    },
    proxy: {
      '/api/admin/metrics': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/api/admin/content-metrics': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      }
    }
  }
})
