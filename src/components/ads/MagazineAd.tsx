import React from 'react';
import { ExternalLink } from 'lucide-react';
import { AdMobFallback } from './AdMobFallback';

interface MagazineAdProps {
    adData?: any;
}

export const MagazineAd: React.FC<MagazineAdProps> = ({ adData }) => {
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

    return (
        <div className="my-16 relative w-full h-[600px] overflow-hidden group cursor-pointer">
            <img 
                src={adData.content || 'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&q=80&w=800'} 
                alt="Magazine Feature"
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-espresso-950 via-espresso-950/20 to-transparent"></div>
            
            <div className="absolute inset-0 flex flex-col justify-end p-8 sm:p-12">
                <p className="text-amber-500 font-serif text-sm tracking-widest uppercase mb-4">
                    {adData.campaignName || 'Sponsor Feature'}
                </p>
                <h2 className="text-3xl sm:text-4xl font-serif text-white leading-tight mb-4 max-w-lg">
                    {adData.name || 'The Art of Brewing'}
                </h2>
                {adData.flavorTags && (
                    <p className="text-espresso-200 text-lg mb-8 max-w-md font-serif italic">
                        {adData.flavorTags}
                    </p>
                )}
                
                {adData.linkUrl && (
                    <div className="inline-flex items-center gap-3 text-white border-b border-white pb-1 w-max hover:text-amber-500 hover:border-amber-500 transition-colors">
                        <span className="font-serif uppercase tracking-wider text-sm">Discover More</span>
                        <ExternalLink size={16} />
                    </div>
                )}
            </div>

            {adData.linkUrl && (
                <a 
                    href={adData.linkUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="absolute inset-0 z-20"
                    onClick={() => console.log('Magazine Ad Clicked')}
                >
                    <span className="sr-only">Visit Sponsor</span>
                </a>
            )}
        </div>
    );
};
