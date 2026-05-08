import React, { useEffect, useRef, useState } from 'react';
import { API_BASE } from '../utils/apiConfig';
import { useTranslation } from 'react-i18next';
import { getLocalizedAdText } from '../utils/adUtils';

export type AdType = 'IMAGE' | 'VIDEO' | 'HTML' | 'TEXT_LINK';
export type AdSize = 'SMALL' | 'MEDIUM' | 'LARGE' | 'FULL';

export interface AdCampaign {
    id: string;
    title: string;
    type: AdType;
    size: AdSize;
    content: string;
    linkUrl?: string | null;
    targetCountry: string;
    placement: string;
    overlayText?: string | null;
    overlayFontSize?: number | null;
    overlayColor?: string | null;
    overlayPosition?: string | null;
}

interface NativeAdBannerProps {
    ad: AdCampaign;
}

export default function NativeAdBanner({ ad }: NativeAdBannerProps) {
    const { i18n } = useTranslation();
    const containerRef = useRef<HTMLDivElement>(null);
    const [hasTrackedImpression, setHasTrackedImpression] = useState(false);

    // Track Impression when ad comes into view
    useEffect(() => {
        if (!containerRef.current || hasTrackedImpression) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setHasTrackedImpression(true);
                fetch(`${API_BASE}/api/ads/track`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` },
                    body: JSON.stringify({ creativeId: ad.id, actionType: 'IMPRESSION' })
                }).catch(() => {});
                observer.disconnect();
            }
        }, { threshold: 0.5 }); // Track when 50% of the ad is visible

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [ad.id, hasTrackedImpression]);

    const handleAdClick = () => {
        fetch(`${API_BASE}/api/ads/track`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` },
            body: JSON.stringify({ creativeId: ad.id, actionType: 'CLICK' })
        }).catch(() => {});
        if (ad.linkUrl) {
            window.open(ad.linkUrl, '_blank', 'noopener,noreferrer');
        }
    };

    const getOverlayPositionClass = (pos?: string | null) => {
        switch (pos) {
            case 'TOP_LEFT': return 'items-start justify-start text-left';
            case 'TOP_CENTER': return 'items-start justify-center text-center';
            case 'TOP_RIGHT': return 'items-start justify-end text-right';
            case 'CENTER_LEFT': return 'items-center justify-start text-left';
            case 'CENTER': return 'items-center justify-center text-center';
            case 'CENTER_RIGHT': return 'items-center justify-end text-right';
            case 'BOTTOM_LEFT': return 'items-end justify-start text-left';
            case 'BOTTOM_CENTER': return 'items-end justify-center text-center';
            case 'BOTTOM_RIGHT': return 'items-end justify-end text-right';
            default: return 'items-end justify-start text-left';
        }
    };

    const getResponsiveFontSize = (baseSize: number, size: AdSize) => {
        switch (size) {
            case 'SMALL': return baseSize * 0.5;
            case 'MEDIUM': return baseSize * 0.7;
            case 'LARGE': return baseSize * 0.85;
            case 'FULL':
            default: return baseSize;
        }
    };

    // Height classes based on AdSize
    const sizeClasses = {
        'SMALL': 'h-24',
        'MEDIUM': 'h-64',
        'LARGE': 'h-96',
        'FULL': 'aspect-[3/4] sm:aspect-video h-auto'
    };

    if (ad.type === 'TEXT_LINK') {
        return (
            <button 
                onClick={handleAdClick}
                className="relative inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/10 hover:from-amber-500/30 hover:to-orange-500/20 border border-amber-500/30 hover:border-amber-500/50 rounded-full font-bold text-amber-500 text-[10px] tracking-wide uppercase transition-all shadow-[0_2px_10px_rgba(245,158,11,0.15)] active:scale-95"
            >
                <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                {ad.content}
            </button>
        );
    }

    const containerStyle = `relative w-full rounded-2xl overflow-hidden shadow-sm bg-espresso-900 border border-espresso-700 cursor-pointer ${sizeClasses[ad.size] || 'h-64'}`;

    // Simplify URL formatting: just convert relative to absolute API_BASE URLs
    // similar to MediaRenderer.tsx
    const getSafeUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('/') && !url.startsWith('//')) {
            return `${API_BASE}${url}`;
        }
        return url;
    };
    
    const safeContentUrl = getSafeUrl(ad.content);

    // Parse replacing any literal HTTP dev-urls inside HTML content
    const processHtmlUrls = (rawHtml: string) => {
        if (!rawHtml) return '';
        const urlRegex = /(https?:\/\/[a-zA-Z0-9.-]+(:\d+)?(\/[^\s'"{})]*)*)/g;
        return rawHtml.replace(urlRegex, (urlMatch) => {
            return getSafeUrl(urlMatch);
        });
    };

    const safeHtmlContent = ad.type === 'HTML' ? processHtmlUrls(ad.content) : '';

    return (
        <div ref={containerRef} className={containerStyle} onClick={handleAdClick}>
            {/* Sponsored Badge */}
            <div className="absolute top-2 right-2 z-10 px-2.5 py-1 bg-espresso-950/40 backdrop-blur-md border border-white/20 rounded-full text-[10px] text-espresso-50/90 font-bold tracking-wider pointer-events-none">
                Sponsored
            </div>

            {/* Content Rendering */}
            <div className="w-full h-full">
                {ad.type === 'IMAGE' && (
                    <div className="relative w-full h-full">
                        <img 
                            src={safeContentUrl} 
                            alt="Advertisement" 
                            className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                        />
                        {ad.overlayText && (
                            <div className={`absolute inset-0 p-5 flex ${getOverlayPositionClass(ad.overlayPosition)} pointer-events-none`}>
                                <div 
                                    className="font-bold tracking-tight leading-snug whitespace-pre-wrap drop-shadow-md"
                                    style={{
                                        fontSize: `${getResponsiveFontSize(ad.overlayFontSize && !isNaN(Number(ad.overlayFontSize)) ? Number(ad.overlayFontSize) : 20, ad.size)}px`,
                                        color: ad.overlayColor || '#FFFFFF'
                                    }}
                                >
                                    {getLocalizedAdText(ad.overlayText, i18n.language)}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {ad.type === 'VIDEO' && (
                    <video 
                        src={safeContentUrl} 
                        autoPlay 
                        muted 
                        loop 
                        playsInline
                        className="w-full h-full object-cover pointer-events-none"
                    />
                )}

                {ad.type === 'HTML' && (
                    <iframe
                        srcDoc={safeHtmlContent}
                        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
                        className="w-full h-full border-0 overflow-hidden"
                        scrolling="no"
                        title="Ad Content"
                    />
                )}
            </div>
        </div>
    );
}
