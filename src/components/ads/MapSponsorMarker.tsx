import React from 'react';
import { divIcon } from 'leaflet';
import { Marker } from 'react-leaflet';

interface MapSponsorMarkerProps {
    shopId: string;
    position: [number, number];
    adData?: any;
    onClick: () => void;
}

export const createSponsorIcon = (imageUrl: string) => {
    return divIcon({
        className: 'custom-sponsor-marker',
        html: `
            <div class="relative group cursor-pointer w-12 h-12 flex items-center justify-center">
                <div class="absolute inset-0 bg-amber-500 rounded-full animate-ping opacity-30"></div>
                <div class="relative z-10 w-10 h-10 rounded-full overflow-hidden border-2 border-amber-500 bg-espresso-950 shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                    <img src="${imageUrl}" class="w-full h-full object-cover" />
                </div>
                <div class="absolute -top-1 -right-1 bg-amber-500 text-espresso-950 text-[8px] font-black px-1 rounded-full border border-espresso-950 z-20">
                    AD
                </div>
            </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
    });
};

export const MapSponsorMarker: React.FC<MapSponsorMarkerProps> = ({ position, adData, onClick }) => {
    if (!adData || adData.fallback === 'ADMOB') {
        // Fallback or no ad doesn't render a sponsor marker
        return null;
    }

    return (
        <Marker 
            position={position}
            icon={createSponsorIcon(adData.content || 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80&w=200')}
            eventHandlers={{ click: onClick }}
            zIndexOffset={1000} // Make sure it's above other markers
        />
    );
};
