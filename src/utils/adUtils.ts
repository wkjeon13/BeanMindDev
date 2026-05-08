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
export const getLocalizedAdText = (rawText: string | null | undefined, currentLang: string): string => {
    if (!rawText) return '';
    
    try {
        // Try to parse it as JSON
        const parsed = JSON.parse(rawText);
        
        // If it's an object with language keys
        if (typeof parsed === 'object' && parsed !== null) {
            // 1. Try exact language match
            if (parsed[currentLang]) {
                return parsed[currentLang];
            }
            // 2. Try English fallback
            if (parsed['en']) {
                return parsed['en'];
            }
            // 3. Just return the first available value
            const firstKey = Object.keys(parsed)[0];
            return firstKey ? parsed[firstKey] : '';
        }
    } catch (e) {
        // If it's not valid JSON, it means it's a legacy plain string.
        // Return it as is.
        return rawText;
    }
    
    return rawText;
};
