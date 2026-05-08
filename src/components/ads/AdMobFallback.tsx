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
        <div className={`w-full overflow-hidden flex justify-center bg-espresso-950/30 ${className} relative min-h-[100px]`}>
            {/* Visual Placeholder for Testing / Fallback visualization */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-espresso-400 opacity-50 z-0">
                <span className="text-xs font-bold uppercase tracking-widest mb-1">Advertisement</span>
                <span className="text-[10px]">Google AdMob Network</span>
            </div>

            <ins
                ref={adRef}
                className="adsbygoogle z-10 relative"
                style={{ display: 'block', width: '100%', minHeight: '100px' }}
                data-ad-client="ca-pub-3940256099942544" // Test Client ID
                data-ad-slot={slotId}
                data-ad-format={format}
                data-full-width-responsive="true"
            ></ins>
        </div>
    );
};
