import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Info } from 'lucide-react';
import { AdMobFallback } from './AdMobFallback';
import { API_BASE } from '../../utils/apiConfig';
import { useTranslation } from 'react-i18next';
import { getLocalizedAdText } from '../../utils/adUtils';
import MediaRenderer from '../community/MediaRenderer';

interface FeedAdCardProps {
    adData?: any; // The matched direct ad from backend
}

const getOverlayPositionClasses = (position: string | null, adSize: string) => {
    const avoidLearnMorePb = adSize === 'SMALL' ? 'pb-8' : 'pb-10'; // Extra padding only for BOTTOM_RIGHT to avoid overlap

    switch (position) {
        case 'TOP_LEFT': return 'items-start justify-start text-left';
        case 'TOP_CENTER': return 'items-start justify-center text-center';
        case 'TOP_RIGHT': return 'items-start justify-end text-right';
        case 'CENTER_LEFT': return 'items-center justify-start text-left';
        case 'CENTER_RIGHT': return 'items-center justify-end text-right';
        case 'CENTER': return 'items-center justify-center text-center';
        case 'BOTTOM_CENTER': return 'items-end justify-center text-center';
        case 'BOTTOM_RIGHT': return `items-end justify-end text-right ${avoidLearnMorePb}`;
        case 'BOTTOM_LEFT':
        default: return 'items-end justify-start text-left'; // Default to match Admin UI
    }
};

const getResponsiveFontSize = (baseSize: number, size: string) => {
    switch (size) {
        case 'SMALL': return baseSize * 0.5;
        case 'MEDIUM': return baseSize * 0.7;
        case 'LARGE': return baseSize * 0.85;
        case 'FULL':
        default: return baseSize;
    }
};

export const FeedAdCard: React.FC<FeedAdCardProps> = ({ adData }) => {
    const { i18n } = useTranslation();
    const containerRef = useRef<HTMLDivElement>(null);
    const [hasTrackedImpression, setHasTrackedImpression] = useState(false);
    
    // Reset tracking if adData changes
    useEffect(() => {
        setHasTrackedImpression(false);
    }, [adData?.id]);

    useEffect(() => {
        if (!containerRef.current || hasTrackedImpression || !adData || adData.fallback === 'ADMOB') return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !hasTrackedImpression) {
                setHasTrackedImpression(true);
                fetch(`${API_BASE}/api/ads/track`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                    },
                    body: JSON.stringify({
                        creativeId: adData.id,
                        actionType: 'IMPRESSION'
                    })
                }).catch(() => {});
            }
        }, { threshold: 0.5 });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [adData?.id, hasTrackedImpression]);
    
    if (!adData || adData.fallback === 'ADMOB') {
        return <AdMobFallback format="rectangle" />;
    }

    const adSize = adData.size || 'SMALL';
    
    // Parse replacing any literal HTTP dev-urls inside HTML content
    const processHtmlUrls = (rawHtml: string) => {
        if (!rawHtml) return '';
        const urlRegex = /(https?:\/\/[a-zA-Z0-9.-]+(:\d+)?(\/[^\s'"{})]*)*)/g;
        return rawHtml.replace(urlRegex, (urlMatch) => {
            if (urlMatch.startsWith('/') && !urlMatch.startsWith('//')) {
                return `${API_BASE}${urlMatch}`;
            }
            return urlMatch;
        });
    };

    const isHtmlAd = adData.type === 'HTML';
    const safeHtmlContent = isHtmlAd ? processHtmlUrls(adData.content) : '';
    const imageUrl = !isHtmlAd ? (adData.content?.startsWith('/') ? `${API_BASE}${adData.content}` : adData.content) : '';

    const handleAdClick = async (e: React.MouseEvent) => {
        if (!adData.linkUrl) return;
        e.preventDefault();
        e.stopPropagation();

        // 1. Asynchronously record ad click
        fetch(`${API_BASE}/api/ads/track`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            },
            body: JSON.stringify({
                creativeId: adData.id,
                actionType: 'CLICK'
            })
        }).catch(err => console.error('Failed to track click', err));

        // 2. Normalize destination URL
        let targetUrl = adData.linkUrl.trim();
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
            targetUrl = `https://${targetUrl}`;
        }

        // 3. Open in external browser for both Native (Capacitor) and Web
        const isNative = typeof (window as any).Capacitor !== 'undefined' && 
                         typeof (window as any).Capacitor.isNativePlatform === 'function' && 
                         (window as any).Capacitor.isNativePlatform();

        if (isNative) {
            try {
                const { Browser } = await import('@capacitor/browser');
                await Browser.open({ url: targetUrl });
            } catch (err) {
                window.open(targetUrl, '_system');
            }
        } else {
            window.open(targetUrl, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <div 
            ref={containerRef} 
            onClick={handleAdClick}
            className="bg-espresso-900 rounded-2xl border border-espresso-800 shadow-sm relative overflow-hidden group cursor-pointer hover:border-amber-500/50 transition-colors p-0 select-none"
        >
            {/* Sponsor Label */}
            <div className="absolute top-0 right-0 bg-espresso-800/80 backdrop-blur text-espresso-400 text-[10px] font-bold px-2 py-1 rounded-bl-lg flex items-center gap-1 z-30 pointer-events-none">
                <Info size={10} /> Sponsored
            </div>

            <div className="flex flex-col gap-0">
                <div 
                    className="w-full overflow-hidden bg-espresso-950 relative"
                    style={{ 
                        aspectRatio: adSize === 'LARGE' ? '1/1' : adSize === 'SMALL' ? '4/1' : '16/9',
                        minHeight: adSize === 'SMALL' ? '80px' : 'auto'
                    }}
                >
                    {isHtmlAd ? (
                        <iframe
                            srcDoc={safeHtmlContent}
                            sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
                            className="w-full h-full border-0 overflow-hidden pointer-events-none"
                            scrolling="no"
                            title="Ad Content"
                        />
                    ) : (
                        <>
                            <MediaRenderer 
                                src={imageUrl || 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80&w=800'} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 relative z-10"
                                autoPlay={true}
                                disablePauseOnClick={true}
                            />
                            {adData.overlayText && (() => {
                                let displayText = getLocalizedAdText(adData.overlayText, i18n.language);
                                if (!displayText && typeof adData.overlayText === 'string') {
                                    try {
                                        const p = JSON.parse(adData.overlayText);
                                        displayText = p.ko || p.en || Object.values(p)[0] as string || '';
                                    } catch (e) {
                                        displayText = adData.overlayText;
                                    }
                                }
                                if (!displayText) return null;

                                const rawSize = Number(adData.overlayFontSize);
                                const baseFontSize = !isNaN(rawSize) && rawSize > 0 ? rawSize : 24;
                                const calculatedFontSize = Math.max(16, getResponsiveFontSize(baseFontSize, adSize));

                                return (
                                    <div 
                                        className={`absolute inset-0 flex pointer-events-none ${adSize === 'SMALL' ? 'p-3' : 'p-5'} bg-black/20 ${getOverlayPositionClasses(adData.overlayPosition, adSize)}`}
                                        style={{ zIndex: 50 }}
                                    >
                                        <span 
                                            className="font-black whitespace-pre-wrap leading-snug"
                                            style={{
                                                fontSize: `${calculatedFontSize}px`,
                                                color: adData.overlayColor || '#FFFFFF',
                                                textShadow: '0 2px 8px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,1)'
                                            }}
                                        >
                                            {displayText}
                                        </span>
                                    </div>
                                );
                            })()}
                        </>
                    )}
                    
                    {/* Learn More Overlay for ALL ads */}
                    {adData.linkUrl && (
                        <div className="absolute bottom-2 right-2 z-30 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full flex items-center gap-1 text-[10px] font-bold text-amber-500 border border-amber-500/20 shadow-md pointer-events-none">
                            <span>Learn More</span>
                            <ExternalLink size={10} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
