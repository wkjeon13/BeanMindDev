import i18n from '../i18n';

const isNative = typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor.isNativePlatform();

let apiBase = import.meta.env.VITE_API_BASE_URL || '';

if (!isNative) {
    apiBase = ''; // Force relative paths on Web to completely avoid CORS/SSL mismatch across different IPs
} else if (isNative) {
    // Prevent SSL errors in Capacitor WebView by routing directly to the Node.js backend over HTTP.
    // This bypasses the Vite dev server proxy (which uses a self-signed basicSsl cert).
    const platform = (window as any).Capacitor.getPlatform();
    
    // Default to the host PC's local IP where the Express backend (port 3001) is running.
    // If the emulator cannot reach 192.168.x.x, 10.0.2.2 can be used instead.
    let targetIp = '192.168.0.29'; 
    
    apiBase = `http://${targetIp}:3001`; 
}
export const API_BASE = apiBase;

/**
 * Standardized API Error Handler
 * Parses JSON response to find `errorCode` and maps to i18n translation.
 * Throws an Error with the localized string to be used by UI components.
 */
export const handleApiError = async (response: Response) => {
    let errorData;
    try {
        errorData = await response.json();
    } catch (e) {
        throw new Error(i18n.t('api_error.ERR_INTERNAL_SERVER_ERROR'));
    }

    if (errorData.errorCode) {
        throw new Error(i18n.t(`api_error.${errorData.errorCode}`));
    }
    
    // Fallback for legacy hardcoded string errors during migration
    if (errorData.error) {
        throw new Error(errorData.error);
    }

    throw new Error(i18n.t('api_error.ERR_INTERNAL_SERVER_ERROR'));
};

export const getDeviceCountryCode = () => {
    // 1. App language takes priority (User's explicit choice)
    try {
        const appLang = localStorage.getItem('i18nextLng') || '';
        if (appLang.toLowerCase().startsWith('en')) return 'US';
        if (appLang.toLowerCase().startsWith('ko')) return 'KR';
        if (appLang.toLowerCase().startsWith('ja')) return 'JP';
        if (appLang.toLowerCase().startsWith('zh')) return 'CN';
    } catch(e) {}

    // 2. Device timezone as fallback
    try { const tz = Intl.DateTimeFormat().resolvedOptions().timeZone; if (tz === 'Asia/Seoul') return 'KR'; if (tz.startsWith('America/')) return 'US'; if (tz === 'Asia/Tokyo') return 'JP'; if (tz === 'Asia/Shanghai') return 'CN'; } catch(e) {} 
    
    // 3. Browser language as final fallback
    const lang = navigator.language || 'ko';
    if (lang.toLowerCase().startsWith('ko')) return 'KR';
    if (lang.toLowerCase().startsWith('en')) return 'US';
    if (lang.toLowerCase().startsWith('ja')) return 'JP';
    if (lang.toLowerCase().startsWith('zh')) return 'CN';
    return 'GLOBAL';
};
