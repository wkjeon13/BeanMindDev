import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_BASE } from '../utils/apiConfig';
import NativeAdBanner, { AdCampaign } from './NativeAdBanner';
import { X } from 'lucide-react';

interface GlobalAdBannerProps {
    placement: string;
    className?: string; // Additional classes for the wrapper
}

export default function GlobalAdBanner({ placement, className = '' }: GlobalAdBannerProps) {
    const { i18n } = useTranslation();
    const [ad, setAd] = useState<AdCampaign | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        const fetchAd = async () => {
            try {
                setIsLoading(true);
                const currentLang = i18n.language ? i18n.language.substring(0, 2).toLowerCase() : 'ko';
                let countryQuery = 'GLOBAL';
                if (currentLang === 'ko') countryQuery = 'KR';
                else if (currentLang === 'en') countryQuery = 'US';
                else if (currentLang === 'ja') countryQuery = 'JP';

                const res = await fetch(`${API_BASE}/api/community/ads?country=${countryQuery}`);
                if (res.ok) {
                    const data: AdCampaign[] = await res.json();
                    // Find the highest priority ad for this exact placement
                    const matchedAds = data.filter(a => a.placement && a.placement.includes(placement));
                    if (matchedAds.length > 0) {
                        setAd(matchedAds[0]);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch global ad", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAd();
    }, [i18n.language, placement]);

    if (isLoading || !ad || isDismissed) return null;

    // Special handling for Popups
    if (placement === 'ETC_POPUP') {
        return (
            <div className={`fixed inset-0 z-[200] flex items-center justify-center p-6 bg-espresso-950/60 backdrop-blur-sm ${className}`}>
                <div className="relative w-full max-w-sm">
                    {/* Dismiss Button */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsDismissed(true); }}
                        className="absolute -top-12 right-0 w-10 h-10 bg-espresso-950/50 border border-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-espresso-50 hover:bg-espresso-950/70 z-10"
                    >
                        <X size={20} />
                    </button>
                    <NativeAdBanner ad={ad} />
                </div>
            </div>
        );
    }

    // Default inline rendering
    return (
        <div className={`w-full ${className}`}>
            <NativeAdBanner ad={ad} />
        </div>
    );
}
