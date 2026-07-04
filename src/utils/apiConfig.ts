import i18n from '../i18n';

const isNative = typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor.isNativePlatform();

let rawEnvUrl = import.meta.env.VITE_API_BASE_URL || '';
console.log(`🔍 [apiConfig] 1. Raw env VITE_API_BASE_URL: "${rawEnvUrl}"`);

let apiBase = rawEnvUrl;

// Node.js 포트(3001, 4001)로 잘못 지정되어 들어온 경우 스프링부트 API 포트(3000, 4000)로 자동 보정
if (apiBase.includes(':3001')) {
    apiBase = apiBase.replace(':3001', ':3000');
    console.log(`🔍 [apiConfig] 2. Port :3001 auto-corrected to :3000 -> "${apiBase}"`);
} else if (apiBase.includes(':4001')) {
    apiBase = apiBase.replace(':4001', ':4000');
    console.log(`🔍 [apiConfig] 2. Port :4001 auto-corrected to :4000 -> "${apiBase}"`);
}

if (!isNative) {
    apiBase = ''; // Force relative paths on Web to completely avoid CORS/SSL mismatch across different IPs
    console.log(`🔍 [apiConfig] 3. Web environment (Relative Path) -> final API_BASE: "${apiBase}"`);
} else if (isNative) {
    apiBase = apiBase.replace(/\/$/, '');
    console.log(`🔍 [apiConfig] 3. Native platform detected -> final API_BASE: "${apiBase}"`);
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

/**
 * Resolves the absolute API URL for both Native (mobile) and Web environments.
 * Routes specific endpoints to the Node.js API (port 4001) and other endpoints to port 4000.
 */
export const getApiUrl = (path: string): string => {
    if (!isNative) {
        return path;
    }

    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    
    // Check if the path should go to the Node.js backend (3001 or 4001)
    const goesToNodeBackend = [
        '/api/users/me/badge',
        '/api/users/bookmarks',
        '/api/users/prescriptions',
        '/api/shops/ai-import',
        '/api/shops/my',
        '/api/users/checkins',
        '/api/users/collections',
        '/api/stamps',
        '/api/users/prescriptions/', // for detail/rating/delete subpaths
        '/api/users/me/activity',
        '/api/community'
    ].some(prefix => {
        if (prefix.endsWith('/')) {
            return normalizedPath.startsWith(prefix);
        }
        return normalizedPath === prefix || normalizedPath.startsWith(prefix + '/');
    }) || (
        (normalizedPath.startsWith('/api/users/') || normalizedPath.startsWith('/api/shops/')) &&
        (normalizedPath.endsWith('/follow') || normalizedPath.endsWith('/follow-status'))
    ) || /^\/api\/shops\/[a-fA-F0-9-]{36}(?:\/.*)?$/.test(normalizedPath);

    let base = apiBase;
    
    // If the base URL is a standard HTTPS domain without custom ports, rely on Nginx 443 proxy routing instead of injecting :3001
    const isStandardHttps = base.startsWith('https://') && !base.includes(':');

    if (goesToNodeBackend) {
        if (base.startsWith('https://')) {
            // HTTPS 환경에서는 커스텀 포트(:3000, :4000 등)를 직접 3001로 치환 시 TLS 에러가 발생하므로,
            // Nginx 443 SSL 표준 포트를 경유할 수 있도록 모든 포트 번호를 제거합니다.
            // 단, 로컬 개발/디버깅용 도메인의 3002 포트(Vite Proxy)는 그대로 유지하여 브라우저 프록시 채널을 태웁니다.
            if (!base.includes(':3002')) {
                base = base.replace(/:[0-9]+/, '');
            }
        } else {
            // HTTP 환경(로컬 개발 등)인 경우에만 3001 포트로 직접 치환합니다.
            if (base.includes(':3000')) {
                base = base.replace(':3000', ':3001');
            } else if (base.includes(':4000')) {
                base = base.replace(':4000', ':4001');
            } else if (!base.includes(':3001') && !base.includes(':4001')) {
                base = base + ':3001';
            }
        }
    }

    const finalUrl = `${base}${normalizedPath}`;
    console.log(`⚡️ [CapacitorHttp API] path: ${path} -> finalUrl: ${finalUrl}`);
    return finalUrl;
};
