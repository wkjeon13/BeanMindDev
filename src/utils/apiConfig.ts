import i18n from '../i18n';

const isNative = typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor.isNativePlatform();

let apiBase = import.meta.env.VITE_API_BASE_URL || '';

if (!isNative) {
    apiBase = ''; // Force relative paths on Web to completely avoid CORS/SSL mismatch across different IPs
} else if (isNative) {
    try {
        const cap = (window as any).Capacitor;
        const isAndroid = cap && cap.getPlatform && cap.getPlatform() === 'android';

        if (isAndroid) {
            // User Agent 분석을 통해 에뮬레이터와 실제 핸드폰 스마트폰 기기를 정밀 분별
            const ua = navigator.userAgent.toLowerCase();
            const isEmulator = ua.includes('sdk_gphone') || ua.includes('emulator') || ua.includes('goldfish') || ua.includes('google_sdk') || ua.includes('ranchu');

            if (isEmulator) {
                // 1. 에뮬레이터 환경에서는 PC 로컬 백엔드 서버(10.0.2.2:4000)로 직결
                apiBase = `http://10.0.2.2:4000`;
            } else {
                // 2. 실제 안드로이드 스마트폰 기기에서는 공인 프로덕션 API 서버로 직결
                let rawBase = import.meta.env.VITE_API_BASE_URL || 'http://www.beanmindcurator.com:3001';
                if (!rawBase || rawBase.includes('https://www.beanmindcurator.com')) {
                    rawBase = 'http://www.beanmindcurator.com:3001';
                }
                apiBase = rawBase.replace(/\/$/, '');
            }
        } else {
            // iOS 및 기타 네이티브 환경은 공인 프로덕션 혹은 기존 설정 유지
            let rawBase = apiBase || 'http://www.beanmindcurator.com:3001';
            if (!rawBase || rawBase.includes('https://www.beanmindcurator.com')) {
                rawBase = 'http://www.beanmindcurator.com:3001';
            }
            apiBase = rawBase.replace(/\/$/, '');
        }
    } catch (e) {
        let rawBase = import.meta.env.VITE_API_BASE_URL || 'http://www.beanmindcurator.com:3001';
        if (!rawBase || rawBase.includes('https://www.beanmindcurator.com')) {
            rawBase = 'http://www.beanmindcurator.com:3001';
        }
        apiBase = rawBase.replace(/\/$/, '');
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
