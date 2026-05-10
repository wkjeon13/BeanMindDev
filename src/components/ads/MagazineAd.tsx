import React from 'react';
import { ExternalLink } from 'lucide-react';
import { AdMobFallback } from './AdMobFallback';
import { useTranslation } from 'react-i18next';

interface MagazineAdProps {
    adData?: any;
}

export const MagazineAd: React.FC<MagazineAdProps> = ({ adData }) => {
    const { i18n } = useTranslation();
    const isEn = i18n.language === 'en';
    if (!adData || adData.fallback === 'ADMOB') {
        return (
            <div className="my-12 px-6">
                <div className="border-t-2 border-b-2 border-espresso-800 py-8">
                    <p className="text-center text-xs font-serif text-espresso-400 mb-6 uppercase tracking-widest">Advertisement</p>
                    <AdMobFallback format="rectangle" />
                </div>
            </div>
        );
    }

    const displayImage = adData.imageUrl || adData.content || 'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&q=80&w=800';
    const displaySponsor = isEn && adData.sponsorNameEn ? adData.sponsorNameEn : (adData.sponsorName || adData.campaignName || 'Sponsor Feature');
    const displayTitle = isEn && adData.titleEn ? adData.titleEn : (adData.title || adData.name || 'The Art of Brewing');
    
    let formattedUrl = adData.linkUrl || '';
    if (formattedUrl && !formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = `https://${formattedUrl}`;
    }

    const handleAdClick = (e: React.MouseEvent) => {
        if (formattedUrl) {
            e.preventDefault();
            window.open(formattedUrl, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <div 
            className="my-4 mx-4 relative w-[calc(100%-32px)] overflow-hidden group cursor-pointer rounded-3xl shadow-lg border border-espresso-800"
            style={{ height: adData.height ? `${adData.height}px` : '400px' }}
            onClick={handleAdClick}
        >
            <img 
                src={displayImage} 
                alt={displayTitle}
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-espresso-950 via-espresso-950/20 to-transparent"></div>
            
            <div className="absolute inset-0 flex flex-col justify-end p-8 sm:p-12">
                <p className="text-amber-500 font-serif text-sm tracking-widest uppercase mb-4">
                    {displaySponsor}
                </p>
                <h2 className="text-3xl sm:text-4xl font-serif text-white leading-tight mb-4 max-w-lg">
                    {displayTitle}
                </h2>
                {adData.flavorTags && (
                    <p className="text-espresso-200 text-lg mb-8 max-w-md font-serif italic">
                        {adData.flavorTags}
                    </p>
                )}
                
                {formattedUrl && (
                    <div className="inline-flex items-center gap-3 text-white border-b border-white pb-1 w-max hover:text-amber-500 hover:border-amber-500 transition-colors">
                        <span className="font-serif uppercase tracking-wider text-sm">Discover More</span>
                        <ExternalLink size={16} />
                    </div>
                )}
            </div>
        </div>
    );
};
