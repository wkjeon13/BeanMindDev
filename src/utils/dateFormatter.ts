import { format, formatDistanceToNow } from 'date-fns';
import { enUS, ko } from 'date-fns/locale';

// 현재 앱 언어 설정 가져오기 (임시 또는 i18next와 혼합 가능)
const getLocale = () => {
    const lang = localStorage.getItem('i18nextLng') || navigator.language;
    return lang.startsWith('ko') ? ko : enUS;
};

/**
 * 백엔드에서 받은 UTC ISO 문자열을 브라우저 로컬 타임 상대 시간으로 변환합니다. (e.g. "3 minutes ago", "방금 전")
 * @param utcIsoString UTC Time String from Backend
 */
export function formatRelativeTime(utcIsoString: string | Date | undefined | null): string {
    if (!utcIsoString) return '';
    try {
        const date = new Date(utcIsoString);
        return formatDistanceToNow(date, { addSuffix: true, locale: getLocale() });
    } catch {
        return '';
    }
}

/**
 * 백엔드에서 받은 UTC ISO 문자열을 브라우저 로컬 절대 시간으로 변환합니다. (e.g. "2024-04-14 17:30")
 * @param utcIsoString UTC Time String from Backend
 * @param formatStr date-fns Format String (default: 'yyyy-MM-dd HH:mm')
 */
export function formatLocalTime(utcIsoString: string | Date | undefined | null, formatStr: string = 'yyyy-MM-dd HH:mm'): string {
    if (!utcIsoString) return '';
    try {
        const date = new Date(utcIsoString);
        // JS Date 객체는 생성되면서 OS 타임존을 기반으로 시간값을 해석하므로, 
        // 포맷팅 파편화 방지를 위해 래핑합니다.
        return format(date, formatStr, { locale: getLocale() });
    } catch {
        return '';
    }
}
