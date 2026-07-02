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
    allowedHosts: ['dev.beanmindcurator.com', 'www.beanmindcurator.com', 'localhost'],
    host: '0.0.0.0',
    fs: {
      allow: ['..']
    },
    watch: {
      ignored: ['**/data/**', '**/systemSettings.json', '**/logs/**']
    },
    proxy: {
      '/api/admin/bgm': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/api/admin/taste-tests': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/api/admin/ad-inquiries': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/api/admin/advertisers': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/api/admin/hosts': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/api/admin': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/api/shops/ai-import': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/api/users': {
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
