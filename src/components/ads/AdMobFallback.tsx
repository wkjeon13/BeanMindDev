import React, { useEffect, useRef } from 'react';

interface AdMobFallbackProps {
    slotId?: string;
    format?: 'auto' | 'fluid' | 'rectangle';
    className?: string;
}

export const AdMobFallback: React.FC<AdMobFallbackProps> = ({ 
    slotId = 'ca-pub-3940256099942544/6300978111', // Test Ad Unit ID
    format = 'auto',
    className = ''
}) => {
    const adRef = useRef<HTMLModElement>(null);

    useEffect(() => {
        try {
            // Check if adsbygoogle is defined on window
            if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
                (window as any).adsbygoogle.push({});
            }
        } catch (e) {
            console.error('AdMob/AdSense initialization error', e);
        }
    }, []);

    return (
        <div className={`w-full overflow-hidden flex justify-center relative min-h-[60px] bg-espresso-900/50 rounded-2xl border border-dashed border-espresso-700 items-center text-espresso-400 text-xs ${className}`}>
            {/* Visual Placeholder for Testing / Fallback visualization removed as requested */}
            <span>Ad Space</span><ins
                ref={adRef}
                className="adsbygoogle z-10 relative"
                style={{ display: 'block', width: '100%' }}
                data-ad-client="ca-pub-3940256099942544" // Test Client ID
                data-ad-slot={slotId}
                data-ad-format={format}
                data-full-width-responsive="true"
            ></ins>
        </div>
    );
};
