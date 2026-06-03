/**
 * 모바일 및 태블릿 기기 여부를 판별하는 유틸리티 함수입니다.
 * User-Agent, 터치 입력 지원 여부(iPadOS 대응), 그리고 화면 너비(태블릿 이하)를 종합하여 식별합니다.
 */
export const isMobileOrTablet = (): boolean => {
    if (typeof window === 'undefined') return true;

    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';

    // 모바일 및 태블릿 기기를 식별하기 위한 User-Agent 키워드 정규식
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i;

    // iPadOS 13+ 버전에서 사파리가 데스크톱 모드로 요청하여 User-Agent에 'Macintosh'로 나타나는 경우를 대응
    const isIPadOS = !!(
        navigator.maxTouchPoints &&
        navigator.maxTouchPoints > 2 &&
        /Macintosh/.test(userAgent)
    );

    // 개발자 도구의 기기 에뮬레이션 대응 및 기기 감지 예외 방지를 위해 화면 가로폭이 1024px 이하인 경우도 허용
    const isSmallScreen = window.innerWidth <= 1024;

    return mobileRegex.test(userAgent) || isIPadOS || isSmallScreen;
};
