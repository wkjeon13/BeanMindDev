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

    return (
        <div ref={containerRef} className="bg-espresso-900 rounded-2xl border border-espresso-800 shadow-sm relative overflow-hidden group cursor-pointer hover:border-amber-500/50 transition-colors p-0">
            {/* Sponsor Label */}
            <div className="absolute top-0 right-0 bg-espresso-800/80 backdrop-blur text-espresso-400 text-[10px] font-bold px-2 py-1 rounded-bl-lg flex items-center gap-1 z-10">
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
                            className="w-full h-full border-0 overflow-hidden"
                            scrolling="no"
                            title="Ad Content"
                        />
                    ) : (
                        <>
                            <MediaRenderer 
                                src={imageUrl || 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80&w=800'} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 relative z-30"
                                autoPlay={true}
                                disablePauseOnClick={true}
                                onClick={() => {
                                    if (adData.linkUrl) {
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
                                        }).catch(e => console.error('Failed to track click', e));
                                        window.open(adData.linkUrl, '_blank', 'noopener,noreferrer');
                                    }
                                }}
                            />
                            {adData.overlayText && (
                                <div className={`absolute inset-0 flex ${adSize === 'SMALL' ? 'p-3' : 'p-5'} bg-black/20 ${getOverlayPositionClasses(adData.overlayPosition, adSize)}`}>
                                    <span 
                                        className="font-bold drop-shadow-md whitespace-pre-wrap leading-snug"
                                        style={{
                                            fontSize: `${getResponsiveFontSize(adData.overlayFontSize && !isNaN(Number(adData.overlayFontSize)) ? Number(adData.overlayFontSize) : 20, adSize)}px`,
                                            color: adData.overlayColor || '#FFFFFF'
                                        }}
                                    >
                                        {getLocalizedAdText(adData.overlayText, i18n.language)}
                                    </span>
                                </div>
                            )}
                        </>
                    )}
                    
                    {/* Learn More Overlay for ALL ads */}
                    {adData.linkUrl && (
                        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full flex items-center gap-1 text-[10px] font-bold text-amber-500 border border-amber-500/20 shadow-md pointer-events-none">
                            <span>Learn More</span>
                            <ExternalLink size={10} />
                        </div>
                    )}
                </div>
            </div>
            
            {adData.linkUrl && (
                <a 
                    href={adData.linkUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="absolute inset-0 z-40"
                    aria-label="Visit Sponsor"
                    onClick={() => {
                        fetch(`${API_BASE}/api/ads/track`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                            },
                            body: JSON.stringify({
                                creativeId: adData.id,
                                actionType: 'CLICK'
                            })
                        }).catch(e => console.error('Failed to track click', e));
                    }}
                >
                    <span className="sr-only">Visit Sponsor</span>
                </a>
            )}
        </div>
    );
};
