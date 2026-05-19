import i18n from '../i18n';

const isNative = typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor.isNativePlatform();

let apiBase = import.meta.env.VITE_API_BASE_URL || '';

if (!isNative) {
    apiBase = ''; // Force relative paths on Web to completely avoid CORS/SSL mismatch across different IPs
} else if (isNative) {
    // Extract the public IP or domain from VITE_API_BASE_URL
    try {
        if (apiBase) {
            const url = new URL(apiBase);
            // If it's a local IP or nip.io domain, force HTTP to avoid SSL errors on mobile
            if (url.hostname.includes('192.168.') || url.hostname.includes('10.0.') || url.hostname.includes('127.0.0.1') || url.hostname.includes('.nip.io')) {
                let cleanHostname = url.hostname.replace('.nip.io', '');
                apiBase = `http://${cleanHostname}:3001`;
            } else {
                // For public domains (e.g. www.BeanMindCurator.com), keep the exact protocol and port from VITE_API_BASE_URL
                // Because iOS ATS blocks HTTP for public domains, and real SSL works fine.
                apiBase = url.toString().replace(/\/$/, ''); // remove trailing slash
            }
        } else {
            apiBase = `http://192.168.0.33:3001`;
        }
    } catch (e) {
        apiBase = `http://192.168.0.33:3001`;
    }
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
    // 0. User DB Region takes absolute highest priority if logged in
    try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            if (user.countryCode && user.countryCode !== 'GLOBAL') {
                return user.countryCode;
            }
        }
    } catch(e) {}

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
