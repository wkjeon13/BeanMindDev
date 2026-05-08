import { API_BASE } from './apiConfig';

export const parseCoverImages = (coverImageUrl: string | null | undefined): string[] => {
    if (!coverImageUrl) return [];
    let urls: string[] = [];
    try {
        if (coverImageUrl.startsWith('[')) {
            const parsed = JSON.parse(coverImageUrl);
            if (Array.isArray(parsed)) urls = parsed;
        }
    } catch (e) {
        // Fallback to single string
    }
    
    if (urls.length === 0) {
        urls = [coverImageUrl];
    }

    return urls.map(url => url.startsWith('/') ? `${API_BASE}${url}` : url);
};
