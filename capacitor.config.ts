import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.beanmind.curator',
  appName: 'Beanmind Curator',
  webDir: 'dist',
  server: {
    // URL was disabled to prevent Android WebView SSL (ERR_CERT_AUTHORITY_INVALID) white screen.
    // url: 'https://192.168.0.29.nip.io:3002',
    cleartext: true,
    androidScheme: 'http',
    allowNavigation: ['192.168.0.*', '10.0.2.2', '*.nip.io']
  },
  android: {
    allowMixedContent: true
  },
  appendUserAgent: " GoogleAuthApp",
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: true,
      style: 'dark',
    },
  }
};

export default config;
