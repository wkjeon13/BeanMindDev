import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import os from 'os';

function getLocalIpAddress() {
  try {
    const interfaces = os.networkInterfaces();
    let fallbackIp = 'localhost';
    
    // 192.168.x.x 대역을 최우선적으로 탐색 (Wi-Fi 무선랜 환경)
    for (const interfaceName in interfaces) {
      const lowerName = interfaceName.toLowerCase();
      // 가상 머신, 도커, VPN 어댑터 이름 필터링하여 명시적 제외
      if (lowerName.includes('docker') || lowerName.includes('vbox') || lowerName.includes('virtual') || lowerName.includes('vmnet') || lowerName.includes('vpn') || lowerName.includes('wsl')) {
        continue;
      }
      
      const addresses = interfaces[interfaceName];
      if (addresses) {
        for (const address of addresses) {
          if (address.family === 'IPv4' && !address.internal) {
            const ip = address.address;
            if (ip.startsWith('192.168.')) {
              return ip; // 진짜 Wi-Fi 사설 IP 주소 검출 즉시 반환
            }
            if (ip.startsWith('10.') || ip.startsWith('172.')) {
              fallbackIp = ip; // 다른 사설 대역을 fallbackIp에 임시 저장
            }
          }
        }
      }
    }
    return fallbackIp;
  } catch (e) {}
  return 'localhost';
}

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
      'import.meta.env.VITE_DEV_HOST_IP': JSON.stringify(getLocalIpAddress()),
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
        '/api/shops/ai-import': {
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
