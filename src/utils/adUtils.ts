/**
 * Utility functions for rendering advertisements
 */

/**
 * Parses multilingual overlayText (JSON string) and returns the text matching the current language.
 * Falls back to English or general string if not a valid JSON.
 * 
 * @param rawText The raw overlayText from database (could be plain text or JSON string like `{"ko":"...", "en":"..."}`)
 * @param currentLang The current language code (e.g. 'ko', 'en')
 * @returns Localized string
 */
export const getLocalizedAdText = (rawText: any, currentLang: string): string => {
    if (!rawText) return '';
    
    try {
        let parsed: any = rawText;
        if (typeof rawText === 'string') {
            try {
                parsed = JSON.parse(rawText);
                // Handle double-stringified JSON if any
                if (typeof parsed === 'string') {
                    try { parsed = JSON.parse(parsed); } catch (e) {}
                }
            } catch (e) {
                return rawText;
            }
        }
        
        // If it's an object with language keys
        if (typeof parsed === 'object' && parsed !== null) {
            const cleanLang = (currentLang || 'ko').toLowerCase();
            const baseLang = cleanLang.split(/[-_]/)[0];

            // 1. Try exact match (e.g. 'ko-KR' or 'ko')
            if (parsed[cleanLang]) {
                return parsed[cleanLang];
            }
            // 2. Try base language match (e.g. 'ko' from 'ko-KR')
            if (parsed[baseLang]) {
                return parsed[baseLang];
            }
            // 3. Fallback to Korean if available
            if (parsed['ko']) {
                return parsed['ko'];
            }
            // 4. Try English fallback
            if (parsed['en']) {
                return parsed['en'];
            }
            // 5. Just return the first available value
            const firstKey = Object.keys(parsed)[0];
            return firstKey ? parsed[firstKey] : '';
        }
    } catch (e) {
        return typeof rawText === 'string' ? rawText : '';
    }
    
    return typeof rawText === 'string' ? rawText : '';
};
