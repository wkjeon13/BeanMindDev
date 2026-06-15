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
    port: 4003,
    strictPort: true,
    host: '0.0.0.0',
    fs: {
      allow: ['..']
    },
    watch: {
      ignored: ['**/data/**', '**/systemSettings.json', '**/logs/**']
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      }
    }
  }
})
