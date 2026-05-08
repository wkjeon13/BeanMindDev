import React, { useEffect, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { AdMobFallback } from './AdMobFallback';
import { API_BASE } from '../../utils/apiConfig';
import MediaRenderer from '../community/MediaRenderer';
import { useTranslation } from 'react-i18next';
import { getLocalizedAdText } from '../../utils/adUtils';

interface ShortsAdCardProps {
    adData?: any;
    isActive?: boolean;
}

const getOverlayPositionClasses = (position: string | undefined, size: string) => {
    // If it's a small ad, we don't want it to overlap with the Shop Now button too much
    // Shorts have bottom navigation and floating buttons, so we adjust padding
    const basePadding = size === 'FULL' ? 'pb-48' : 'pb-6'; 
    switch (position) {
        case 'TOP_LEFT': return 'items-start justify-start text-left pt-16 pl-6';
        case 'TOP_CENTER': return 'items-start justify-center text-center pt-16';
        case 'TOP_RIGHT': return 'items-start justify-end text-right pt-16 pr-6';
        case 'CENTER_LEFT': return 'items-center justify-start text-left pl-6';
        case 'CENTER': return 'items-center justify-center text-center';
        case 'CENTER_RIGHT': return 'items-center justify-end text-right pr-6';
        case 'BOTTOM_LEFT': return `items-end justify-start text-left pl-6 ${basePadding}`;
        case 'BOTTOM_CENTER': return `items-end justify-center text-center ${basePadding}`;
        case 'BOTTOM_RIGHT': return `items-end justify-end text-right pr-6 ${basePadding}`;
        default: return `items-end justify-start text-left pl-6 ${basePadding}`;
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

export const ShortsAdCard: React.FC<ShortsAdCardProps> = ({ adData, isActive = false }) => {
    const { i18n } = useTranslation();
    const [hasTrackedImpression, setHasTrackedImpression] = useState(false);

    // Reset tracking if adData changes
    useEffect(() => {
        setHasTrackedImpression(false);
    }, [adData?.id]);

    // Track impression when the slide becomes active
    useEffect(() => {
        if (isActive && !hasTrackedImpression && adData && adData.fallback !== 'ADMOB') {
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
    }, [isActive, hasTrackedImpression, adData?.id]);
    
    if (!adData || adData.fallback === 'ADMOB') {
        return (
            <div className="w-full h-full bg-black flex items-center justify-center snap-start relative">
                <AdMobFallback format="auto" className="max-w-md w-full" />
                <div className="absolute top-4 right-4 bg-black/50 text-white/50 text-xs px-2 py-1 rounded backdrop-blur">
                    Advertisement
                </div>
            </div>
        );
    }

    const mediaUrl = adData.content?.startsWith('/') ? `${API_BASE}${adData.content}` : adData.content;

    return (
        <div className="w-full h-full bg-black snap-start relative overflow-hidden flex items-center justify-center">
            {/* Blurred Background Layer (For non-FULL sizes to fill the black space beautifully) */}
            <div className="absolute inset-0 overflow-hidden flex items-center justify-center pointer-events-none">
                {adData.type === 'IMAGE' && (
                    <img src={mediaUrl} className="w-full h-full object-cover opacity-30 blur-2xl scale-125" alt="" />
                )}
            </div>

            {/* Main Content Layer */}
            <div className={`relative z-10 flex items-center justify-center w-full px-4`} style={{ 
                aspectRatio: adData.size === 'LARGE' ? '1/1' : adData.size === 'SMALL' ? '4/1' : adData.size === 'FULL' ? 'auto' : '16/9', 
                height: adData.size === 'FULL' ? '100%' : 'auto', 
                padding: adData.size === 'FULL' ? '0' : undefined 
            }}>
                <div className={`relative w-full h-full overflow-hidden ${adData.size === 'FULL' ? 'rounded-none' : 'rounded-2xl shadow-2xl bg-black/40'}`}>
                    {adData.type === 'VIDEO' ? (
                        <MediaRenderer 
                            src={mediaUrl} 
                            className={`w-full h-full object-contain ${adData.size === 'FULL' ? 'rounded-none' : 'rounded-2xl'}`}
                            autoPlay={isActive}
                            forceVideo={true}
                        />
                    ) : (
                        <img 
                            src={mediaUrl} 
                            alt="Sponsor Creative" 
                            className={`w-full h-full object-contain ${adData.size === 'FULL' ? 'rounded-none' : 'rounded-2xl'}`}
                        />
                    )}
                    
                    {adData.overlayText && (
                        <div className={`absolute inset-0 flex pointer-events-none ${adData.size === 'SMALL' ? 'p-3' : 'p-5'} bg-black/20 ${getOverlayPositionClasses(adData.overlayPosition, adData.size || 'SMALL')}`}>
                            <span 
                                className="font-bold drop-shadow-md whitespace-pre-wrap leading-snug"
                                style={{
                                    fontSize: `${getResponsiveFontSize(adData.overlayFontSize && !isNaN(Number(adData.overlayFontSize)) ? Number(adData.overlayFontSize) : 20, adData.size || 'SMALL')}px`,
                                    color: adData.overlayColor || '#FFFFFF'
                                }}
                            >
                                {getLocalizedAdText(adData.overlayText, i18n.language)}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Sponsor Badge */}
            <div className="absolute top-4 left-4 bg-amber-500 text-espresso-950 text-xs font-black px-2 py-1 rounded z-30 shadow-md">
                SPONSORED
            </div>

            {/* Bottom Overlay Info */}
            {adData.linkUrl && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-32 pb-24 px-4 z-20 pointer-events-none">
                    <div className="max-w-md mx-auto pointer-events-auto">
                        <a 
                            href={adData.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-amber-500 text-espresso-950 font-bold py-3.5 px-6 rounded-full w-full flex items-center justify-center gap-2 hover:bg-amber-400 transition-colors"
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
                            <ShoppingBag size={18} />
                            Shop Now
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
};
