import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Heart, MapPin, Navigation, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../utils/apiConfig';

const getFullImageUrl = (url: string | null | undefined) => {
    if (!url) return '';
    if (url.startsWith('/mock-bucket')) return 'https://images.unsplash.com/photo-1554118811-1e0d58224f24';
    if (url.startsWith('/') && !url.startsWith('//')) return `${API_BASE}${url}`;
    return url;
};
export interface MapShop {
    id: string;
    name: string;
    lat: number;
    lng: number;
    
    // For Explore Mode (Local DB stores)
    shortDesc?: string | null;
    signatureBean?: string | null;
    address?: string | null;
    mainImageUrl?: string | null;
    markerImageUrl?: string | null;
    websiteUrl?: string | null;
    primaryCoffeeType?: string | null;
    media?: any[];
    isPremiumTop?: boolean;
    storePlan?: string;
    matchRate?: number;
    averageRating?: number;
    reviewCount?: number;
    
    // For Prescription Mode (Google Maps results)
    uri?: string;
    distance?: number;
    
    // For Hybrid Mode Search
    isGeneric?: boolean;
}

interface SharedCoffeeMapProps {
    mode: 'explore' | 'prescription';
    shops: MapShop[];
    userLocation: [number, number] | null;
    mapCenter: [number, number] | null;
    setMapCenter?: (center: [number, number]) => void;
    setMapBounds?: (bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }) => void;
    boundsToFit?: { minLat: number; maxLat: number; minLng: number; maxLng: number, ts: number } | null;
    
    // Explore Mode Props
    searchedShopId?: string | null;
    focusedShopId?: string | null;
    onShopClick?: (shop: MapShop) => void;
    onPopupClick?: (shop: MapShop) => void;
    onBookmarkToggle?: (shopId: string) => void;
    bookmarkedIds?: Set<string>;
    
    // Controls
    onLocateMe?: () => void;
    isLocating?: boolean;
    isCourseMode?: boolean;
    courseShops?: MapShop[];
    onMapClick?: (lat: number, lng: number) => void;
    onMapInteraction?: () => void;
    isRefreshing?: boolean;
    bottomPadding?: string;
    mapAds?: any[];
}

import { MapSponsorMarker } from './ads/MapSponsorMarker';

// Intercepts map drags and pinches to update parent state mapCenter
function MapControllerComponent({ center, setMapCenter, setMapBounds, boundsToFit, userLocation, shops, mode, isCourseMode }: { center: [number, number] | null, setMapCenter?: (c: [number, number]) => void, setMapBounds?: (bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }) => void, boundsToFit?: { minLat: number; maxLat: number; minLng: number; maxLng: number, ts: number } | null, userLocation: [number, number] | null, shops: MapShop[], mode: 'explore' | 'prescription', isCourseMode?: boolean }) {
    const map = useMap();
    const prevBoundsTs = React.useRef(0);
    const prevCenterStr = React.useRef('');

    // In explore mode, we track drag to reload shops
    useEffect(() => {
        if (!map || mode !== 'explore') return;

        const onMoveEnd = () => {
            if (setMapCenter) {
                const newCenter = map.getCenter();
                setMapCenter([newCenter.lat, newCenter.lng]);
                // Prevent React re-renders from bouncing the map back
                // by syncing the prevCenterStr ref immediately after user drag.
                prevCenterStr.current = `${newCenter.lat},${newCenter.lng}`;
            }
            if (setMapBounds) {
                const bounds = map.getBounds();
                setMapBounds({
                    minLat: bounds.getSouth(),
                    maxLat: bounds.getNorth(),
                    minLng: bounds.getWest(),
                    maxLng: bounds.getEast()
                });
            }
        };

        map.on('moveend', onMoveEnd);
        return () => {
            map.off('moveend', onMoveEnd);
        };
    }, [map, setMapCenter, setMapBounds, mode]);

    // Pan to center or fit bounds if they change externally
    useEffect(() => {
        if (!map || mode !== 'explore') return;
        
        const currentCenterStr = center ? `${center[0]},${center[1]}` : '';

        if (boundsToFit && boundsToFit.ts !== prevBoundsTs.current) {
            prevBoundsTs.current = boundsToFit.ts;
            prevCenterStr.current = currentCenterStr; // Flag this center as consumed alongside the bounds
            
            // Safari Crash Prevention: Validate bounds
            if (!isNaN(boundsToFit.minLat) && !isNaN(boundsToFit.maxLat) && !isNaN(boundsToFit.minLng) && !isNaN(boundsToFit.maxLng)) {
                try {
                    map.fitBounds([
                        [boundsToFit.minLat, boundsToFit.minLng],
                        [boundsToFit.maxLat, boundsToFit.maxLng]
                    ], { padding: [20, 20] });
                } catch (e) { console.warn("Leaflet fitBounds failed", e); }
            }
        } else if (center && currentCenterStr !== prevCenterStr.current) {
            prevCenterStr.current = currentCenterStr;
            
            // Safari Crash Prevention: Validate center coordinates
            if (Array.isArray(center) && center.length === 2 && !isNaN(center[0]) && !isNaN(center[1])) {
                try {
                    const currentMapCenter = map.getCenter();
                    // Since center is a tuple from props, we format it as L.latLng for distance calculation
                    const propLatLng = L.latLng(center[0], center[1]);
                    const dist = map.distance(propLatLng, currentMapCenter);
                    
                    // Only fly if distance > 10 meters to prevent shaking loop from precision loss
                    if (dist > 10) { 
                        map.flyTo(center, map.getZoom(), { duration: 0.5 });
                    }
                } catch (e) { console.warn("Leaflet flyTo failed", e); }
            }
        }
    }, [center, boundsToFit, map, mode]);

    // Prescription mode automatically fits bounding box
    useEffect(() => {
        if (map && mode === 'prescription' && userLocation && shops.length > 0) {
            const bounds = L.latLngBounds([userLocation]);
            shops.forEach(s => bounds.extend([s.lat, s.lng]));
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
    }, [map, mode, userLocation, shops]);

    // Container size change triggers a Leaflet redraw to prevent grey tiles
    useEffect(() => {
        if (!map) return;
        
        const forceReflow = () => {
            map.invalidateSize();
            // Dispatching global resize safely
            try { window.dispatchEvent(new Event('resize')); } catch(e){}
        };

        forceReflow();
        const timers = [100, 300, 500, 800, 1500, 2500].map(t => setTimeout(forceReflow, t));
        
        return () => {
            timers.forEach(clearTimeout);
        };
    }, [map, isCourseMode]);

    return null;
}

function MapClickHandler({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
    const timerRef = React.useRef<NodeJS.Timeout | null>(null);
    const hasTriggeredRef = React.useRef<boolean>(false);

    useMapEvents({
        contextmenu(e) {
            if (hasTriggeredRef.current) {
                hasTriggeredRef.current = false;
                return;
            }
            if (onMapClick) onMapClick(e.latlng.lat, e.latlng.lng);
        },
        mousedown(e) {
            if (e.originalEvent && (e.originalEvent as MouseEvent).button === 2) return;
            
            if (timerRef.current) clearTimeout(timerRef.current);
            hasTriggeredRef.current = false;
            
            timerRef.current = setTimeout(() => {
                hasTriggeredRef.current = true;
                if (onMapClick) onMapClick(e.latlng.lat, e.latlng.lng);
                timerRef.current = null;
            }, 600);
        },
        mouseup() {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        },
        mousemove() {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        },
        dragstart() {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        }
    });
    return null;
}

export default function SharedCoffeeMap({
    mode,
    shops,
    userLocation,
    mapCenter,
    setMapCenter,
    setMapBounds,
    boundsToFit,
    searchedShopId,
    focusedShopId,
    onShopClick,
    onPopupClick,
    onBookmarkToggle,
    bookmarkedIds = new Set(),
    onLocateMe,
    isLocating,
    isCourseMode = false,
    courseShops,
    onMapClick,
    isRefreshing = false,
    bottomPadding,
    mapAds = []
}: SharedCoffeeMapProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();

    // Map needs a valid center to render
    const initialCenter = mapCenter || userLocation || [37.5665, 126.9780];

    return (
        <div className="absolute inset-0 w-full h-full" style={{ touchAction: 'none', minHeight: '100%' }}>
            <MapContainer 
                center={initialCenter as [number, number]} 
                zoom={14} 
                className="absolute inset-0 w-full h-full pb-20 z-0 bg-espresso-950" style={{ minHeight: "100%" }} 
                zoomControl={false}
                scrollWheelZoom={true}
                touchZoom={true}
                doubleClickZoom={true}
            >
                <ZoomControl position="bottomright" />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                <MapClickHandler onMapClick={onMapClick} />

                <MapControllerComponent 
                    center={mapCenter} 
                    setMapCenter={setMapCenter} 
                    setMapBounds={setMapBounds}
                    boundsToFit={boundsToFit}
                    userLocation={userLocation} 
                    shops={shops} 
                    mode={mode} 
                    isCourseMode={isCourseMode}
                />

                {/* User's Current Location Marker */}
                {userLocation && (
                    <Marker
                        position={userLocation}
                        icon={L.divIcon({
                            className: 'user-location-marker',
                            html: `<div style="width: 20px; height: 20px; background-color: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 15px rgba(59, 130, 246, 0.6);"></div>`,
                            iconSize: [20, 20],
                            iconAnchor: [10, 10]
                        })}
                    >
                        <Popup className="rounded-xl overflow-hidden shadow-sm">
                            <div className="p-2 text-center font-bold text-[13px] text-espresso-900">{t('shared_map.lbl_my_location', '현재 내 위치')}</div>
                        </Popup>
                    </Marker>
                )}

                {/* Shop Markers */}
                {shops.map((shop, idx) => {
                    let coords: [number, number] = [37.5665 + idx * 0.001, 126.9780 + idx * 0.001]; // Safe Default Initializer
                    try {
                        const lat = typeof shop.lat === 'number' ? shop.lat : parseFloat(shop.lat as any);
                        const lng = typeof shop.lng === 'number' ? shop.lng : parseFloat(shop.lng as any);
                        if (!isNaN(lat) && !isNaN(lng)) {
                            // Find all shops with exactly the same coordinates (e.g. same building)
                            const overlaps = shops.filter(s => {
                                const slat = typeof s.lat === 'number' ? s.lat : parseFloat(s.lat as any);
                                const slng = typeof s.lng === 'number' ? s.lng : parseFloat(s.lng as any);
                                return Math.abs(slat - lat) < 0.00001 && Math.abs(slng - lng) < 0.00001;
                            });
                            
                            if (overlaps.length > 1) {
                                const groupIdx = overlaps.findIndex(s => s.id === shop.id);
                                // Create a tiny circle offset for overlapping markers (~5 meters)
                                const radius = 0.00005; 
                                const angle = (Math.PI * 2 * groupIdx) / overlaps.length;
                                coords = [lat + radius * Math.cos(angle), lng + radius * Math.sin(angle)];
                            } else {
                                coords = [lat, lng];
                            }
                        } else if (userLocation && Array.isArray(userLocation) && userLocation.length === 2) {
                            const hash = shop.id ? shop.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) : idx;
                            // TIGHTENED RADIUS: 0.00005 degrees per modulo step caps the maximum randomized scatter at ~550 meters, 
                            // guaranteeing that coordinate-less database shops (Amnesty shops) fall directly within the user's screen at zoom=14.
                            const latOffset = (hash % 100) * 0.00005 * (hash % 2 === 0 ? 1 : -1);
                            const lngOffset = ((hash >> 3) % 100) * 0.00005 * (hash % 3 === 0 ? 1 : -1);
                            coords = [Number(userLocation[0]) + latOffset, Number(userLocation[1]) + lngOffset];
                        }
                    } catch (err) {
                        console.error('Coordinate parsing error:', err);
                    }

                    const isDbShop = mode === 'explore' && !shop.isGeneric;

                    if (isDbShop) {
                        const isUnclaimed = !shop.mainImageUrl && !shop.markerImageUrl && (!shop.media || shop.media.length === 0);

                        // Handle videos in mainImage (Fallback to marker profile if main is a video for the circular map pin)
                        let parsedMainImageUrl = shop.mainImageUrl;
                        if (typeof parsedMainImageUrl === 'string' && parsedMainImageUrl.startsWith('[')) {
                            try {
                                const parsed = JSON.parse(parsedMainImageUrl);
                                if (Array.isArray(parsed) && parsed.length > 0) {
                                    parsedMainImageUrl = parsed[0];
                                }
                            } catch (e) {}
                        }

                        const fallbackMedia = shop.media?.find((m: any) => m.type === 'IMAGE' || m.type === 'VIDEO');
                        const fallbackSrc = fallbackMedia ? fallbackMedia.url : shop.markerImageUrl;
                        
                        const defaultPlaceholder = 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80&w=800';
                        const mainImageSrc = parsedMainImageUrl || fallbackSrc || defaultPlaceholder;
                        
                        const isMainMediaVideo = typeof mainImageSrc === 'string' && (mainImageSrc.toLowerCase().endsWith('.mp4') || mainImageSrc.toLowerCase().endsWith('.mov') || mainImageSrc.toLowerCase().endsWith('.webm'));
                        const markerImageSrc = shop.markerImageUrl || (isMainMediaVideo ? defaultPlaceholder : (typeof mainImageSrc === 'string' ? mainImageSrc : defaultPlaceholder));
                        
                        const isFocused = shop.id === focusedShopId;
                        // Avoid showing 2 highlight badges by ignoring searchedShopId if the user is currently scrolling/focusing on another shop via the bottom list
                        const isSearched = shop.id === searchedShopId && (!focusedShopId || focusedShopId === searchedShopId);
                        const isHighlighted = isSearched || isFocused;

                        const isPremium = shop.isPremiumTop || shop.storePlan === 'PREMIUM';
                        const courseIdx = isCourseMode && courseShops ? courseShops.findIndex(s => s.id === shop.id) : -1;
                        const courseBadgeHtml = courseIdx >= 0 ? `<div style="position: absolute; top: -14px; left: -14px; width: 28px; height: 28px; background: #f59e0b; color: white; border-radius: 50%; font-size: 14px; font-weight: 900; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.4); z-index: 5000; border: 2px solid white;">${courseIdx + 1}</div>` : '';

                        let customIcon;

                        if (isUnclaimed) {
                            // UNCLAIMED/AI-HARVESTED DB SHOP: Smaller, distinct generic icon (e.g., small gray/brown circle with Coffee Icon)
                            const size = isFocused ? 54 : 39;
                            const bgColor = isHighlighted ? '#ef4444' : '#6b7280'; // Gray-500 standard, Red if active
                            const zIndexOffset = isFocused ? 2000 : (isSearched ? 1500 : 500); // 500 < 1000 (Claimed)
                            
                            customIcon = L.divIcon({
                                className: 'unclaimed-shop-marker',
                                html: `<div class="transition-all duration-300 ease-out flex items-center justify-center font-sans tracking-tight" style="width: ${size}px; height: ${size}px; background-color: ${bgColor}; border: 2.5px solid white; border-radius: 50%; box-shadow: 0 4px 8px rgba(0,0,0,0.3); position: relative; color: white; ${isFocused ? 'box-shadow: 0 0 15px rgba(239,68,68,0.6);' : ''}">
                                          <svg xmlns="http://www.w3.org/2000/svg" width="${isFocused ? 27 : 21}" height="${isFocused ? 27 : 21}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"></path><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"></path><line x1="6" x2="6" y1="2" y2="4"></line><line x1="10" x2="10" y1="2" y2="4"></line><line x1="14" x2="14" y1="2" y2="4"></line></svg>
                                          ${isSearched && !isFocused ? `<div style="position: absolute; top: -30px; left: 50%; transform: translateX(-50%); background: #ef4444; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; white-space: nowrap; box-shadow: 0 2px 5px rgba(239, 68, 68, 0.4);">${t('shared_map.lbl_searched_shop', '검색된 매장')}</div>` : ''}
                                          ${isFocused && !isSearched ? `<div style="position: absolute; top: -30px; left: 50%; transform: translateX(-50%); background: #ef4444; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; white-space: nowrap; box-shadow: 0 2px 5px rgba(239, 68, 68, 0.4); z-index: 100;">${t('shared_map.lbl_selected_shop', '선택된 매장')}</div>` : ''}
                                          ${courseBadgeHtml}
                                       </div>`,
                                iconSize: [size, size],
                                iconAnchor: [size / 2, size / 2],
                                popupAnchor: [0, -size / 2]
                            });
                        } else {
                            // Focus style calculation
                            const size = isFocused ? 64 : 48; 
                            const borderColor = isFocused ? '#f59e0b' : (isSearched ? '#ef4444' : (isPremium ? '#f59e0b' : 'white'));
                            const zIndexOffset = isFocused ? 2000 : (isSearched ? 1500 : (isPremium ? 1200 : 1000));

                            customIcon = L.divIcon({
                                className: 'custom-shop-marker',
                                html: `<div class="transition-all duration-300 ease-out" style="width: ${size}px; height: ${size}px; border-radius: 50%; border: 3px solid ${borderColor}; box-shadow: 0 ${isFocused ? '8px 20px' : '4px 10px'} rgba(0,0,0,${isFocused ? '0.5' : '0.3'}); overflow: hidden; background-color: #f3f0ea; position: relative; ${isFocused || isPremium ? 'box-shadow: 0 0 15px rgba(251,191,36,0.6);' : ''}">
                                           <img src="${getFullImageUrl(markerImageSrc as string)}" style="width: 100%; height: 100%; object-fit: cover;" />
                                       </div>
                                       ${isSearched && !isFocused ? `<div style="position: absolute; top: -30px; left: 50%; transform: translateX(-50%); background: #ef4444; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; white-space: nowrap; box-shadow: 0 2px 5px rgba(239, 68, 68, 0.4);">${t('shared_map.lbl_searched_shop', '검색된 매장')}</div>` : ''}
                                       ${isFocused && !isSearched ? `<div style="position: absolute; top: -30px; left: 50%; transform: translateX(-50%); background: #f59e0b; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; white-space: nowrap; box-shadow: 0 2px 5px rgba(245, 158, 11, 0.4); z-index: 100;">${t('shared_map.lbl_selected_shop', '선택된 매장')}</div>` : ''}
                                       ${isFocused && isSearched ? `<div style="position: absolute; top: -30px; left: 50%; transform: translateX(-50%); background: #ef4444; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; white-space: nowrap; box-shadow: 0 2px 5px rgba(239, 68, 68, 0.4); z-index: 100;">${t('shared_map.lbl_searched_shop', '검색된 매장')}</div>` : ''}
                                       ${isPremium && !isHighlighted ? `<div style="position: absolute; top: -18px; right: -8px; font-size: 24px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5)); transform: rotate(15deg);">👑</div>` : ''}
                                       ${courseBadgeHtml}`,
                                iconSize: [size, size],
                                iconAnchor: [size / 2, size],
                                popupAnchor: [0, -size]
                            });
                        }

                        let zIndexOffset = 1000;
                        if (isFocused) zIndexOffset = 2000;
                        else if (isSearched) zIndexOffset = 1500;
                        else if (isPremium) zIndexOffset = 1200;
                        else if (isUnclaimed) zIndexOffset = 500;
                        
                        return (
                            <Marker key={`map-${shop.id}`} position={coords} icon={customIcon} zIndexOffset={zIndexOffset} eventHandlers={{ click: () => onShopClick?.(shop) }}>
                                <Popup
                                    className="shop-popup p-0 border-0"
                                    autoPan={false}
                                    closeButton={false}
                                    minWidth={240}
                                >
                                    <div 
                                        className="bg-white flex p-3 gap-3 items-center cursor-pointer hover:bg-zinc-50 transition-colors relative w-auto min-w-[260px] max-w-[60vw] rounded-xl shadow-sm border border-zinc-200/60 font-sans"
                                        onClick={(e) => { e.stopPropagation(); (onPopupClick || onShopClick)?.(shop); }}
                                    >
                                        {/* Absolute Heart Icon */}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onBookmarkToggle?.(shop.id); }} 
                                            className="absolute top-2.5 right-2.5 p-1 transition-transform active:scale-90 z-10"
                                        >
                                            <Heart size={18} fill={bookmarkedIds.has(shop.id) ? "currentColor" : "none"} className={bookmarkedIds.has(shop.id) ? 'text-rose-500' : 'text-zinc-400'} strokeWidth={bookmarkedIds.has(shop.id) ? 0 : 2} />
                                        </button>

                                        {/* Left: Thumbnail Thumbnail */}
                                        <div className="w-[56px] h-[56px] shrink-0 rounded-[10px] overflow-hidden bg-zinc-100 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] border border-black/5">
                                            {isMainMediaVideo ? (
                                                <video src={getFullImageUrl(mainImageSrc as string)} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                                            ) : (
                                                <img src={getFullImageUrl(mainImageSrc as string) || defaultPlaceholder} alt={shop.name} className="w-full h-full object-cover" />
                                            )}
                                        </div>

                                        {/* Right: Info */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-center pr-6">
                                            <h3 className="font-extrabold text-[15px] font-sans text-zinc-900 leading-tight truncate w-full mb-0.5">
                                                {shop.name}
                                            </h3>

                                            

                                            
                                            <div className="flex items-center gap-1 mt-1 text-[12px] text-zinc-600 w-full min-w-0 font-sans">
                                                <span className="truncate block max-w-[120px]">{shop.shortDesc || shop.signatureBean || "Specialty Coffee"}</span>
                                                <span className="shrink-0 text-zinc-300">|</span>
                                                <span className="shrink-0 text-zinc-600">
                                                    {(shop.reviewCount ?? 0) > 0 ? (
                                                        <span className="font-semibold text-amber-500">{shop.averageRating?.toFixed(1) || '0.0'} ★ <span className="text-zinc-400 font-normal">({(shop.reviewCount ?? 0) >= 1000 ? ((shop.reviewCount ?? 0)/1000).toFixed(1)+'k' : shop.reviewCount})</span></span>
                                                    ) : (
                                                        <span className="text-zinc-500 text-[11px]">{t('shared_map.lbl_no_review', '리뷰 없음')}</span>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    } else {
                        // PRESCRIPTION MODE & GENERIC AI PINS: Classic Blue Marker
                        const isTargetRegion = shop.id.startsWith('target-region');
                        const isFocused = shop.id === focusedShopId;
                        const isSearched = shop.id === searchedShopId && (!focusedShopId || focusedShopId === searchedShopId);
                        const isHighlighted = (isSearched || isFocused) && !isTargetRegion;
                        const defaultFill = isHighlighted ? '#ef4444' : '#3b82f6';
                        
                        let customIcon;
                        if (isTargetRegion) {
                            customIcon = L.divIcon({
                                className: 'target-region-marker',
                                html: `<div style="position:relative; width:30px; height:30px; display:flex; justify-content:center; align-items:center;">
                                          <div class="animate-ping" style="position:absolute; width:100%; height:100%; border-radius:50%; background-color:rgba(239, 68, 68, 0.5);"></div>
                                          <div style="width:16px; height:16px; background-color:#ef4444; border:3px solid white; border-radius:50%; box-shadow:0 0 10px rgba(0,0,0,0.5); z-index:2;"></div>
                                          <div style="position: absolute; top: -25px; left: 50%; transform: translateX(-50%); background: #ef4444; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; white-space: nowrap; box-shadow: 0 2px 5px rgba(239, 68, 68, 0.4); z-index: 10;">${t('shared_map.lbl_search_center', '검색 중심')}</div>
                                       </div>`,
                                iconSize: [30, 30],
                                iconAnchor: [15, 15],
                                popupAnchor: [0, -15]
                            });
                        } else {
                            customIcon = L.divIcon({
                                className: 'default-blue-marker',
                                html: `<div style="display:flex; justify-content:center; align-items:center; width: 28px; height: 41px; background: none; border: none; filter: drop-shadow(0px 4px 4px rgba(0,0,0,0.3)); position: relative;">
                                          ${isHighlighted ? `<div style="position: absolute; top: -25px; left: 50%; transform: translateX(-50%); background: #ef4444; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; white-space: nowrap; box-shadow: 0 2px 5px rgba(239, 68, 68, 0.4); z-index: 10;">${t('shared_map.lbl_selected_loc', '선택된 위치')}</div>` : ''}
                                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="28" height="41" fill="${defaultFill}">
                                              <path d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/>
                                          </svg>
                                       </div>`,
                                iconSize: [28, 41],
                                iconAnchor: [14, 41],
                                popupAnchor: [0, -41]
                            });
                        }                        
                        return (
                            <Marker key={`map-ai-${shop.id || idx}-${idx}`} position={coords} icon={customIcon} zIndexOffset={10} eventHandlers={{ click: () => onShopClick?.(shop) }}>
                                <Popup className="font-sans rounded-xl overflow-hidden shadow-md">
                                    <div 
                                        className="p-2 px-3 text-center cursor-pointer hover:bg-zinc-50 transition-colors"
                                        onClick={(e) => { e.stopPropagation(); (onPopupClick || onShopClick)?.(shop); }}
                                    >
                                        <div className="font-bold whitespace-nowrap text-[14px] text-espresso-950">{shop.name}</div>
                                        

                                    </div>
                                </Popup>
                            </Marker>
                        );
                    }
                })}

                {/* Course Route Polyline */}
                {isCourseMode && (courseShops || shops).length > 1 && (
                    <Polyline 
                        positions={(courseShops || shops).filter(s => s.lat && s.lng && !isNaN(Number(s.lat)) && !isNaN(Number(s.lng))).map(s => [Number(s.lat), Number(s.lng)] as [number, number])} 
                        color="#f59e0b"
                        weight={4}
                        opacity={0.8}
                        dashArray="8, 12" 
                        lineJoin="round"
                    />
                )}

                {/* Sponsor Markers */}
                {mapAds.map((ad, idx) => {
                    // For now, randomly place sponsor marker near center if lat/lng is not provided.
                    // In a real app, campaign or creative should have lat/lng targeting.
                    const lat = ad.lat || (mapCenter ? mapCenter[0] + (Math.random() - 0.5) * 0.05 : 0);
                    const lng = ad.lng || (mapCenter ? mapCenter[1] + (Math.random() - 0.5) * 0.05 : 0);
                    if (lat === 0 && lng === 0) return null;
                    
                    return (
                        <MapSponsorMarker 
                            key={`sponsor-${ad.id || idx}`} 
                            position={[lat, lng]} 
                            adData={ad} 
                            onClick={() => {
                                if (ad.linkUrl) {
                                    window.open(ad.linkUrl, '_blank');
                                    console.log('Map Ad Clicked:', ad.id);
                                }
                            }}
                        />
                    );
                })}
            </MapContainer>

            {/* Overlays */}
            {mode === 'explore' && onLocateMe && (
                <button
                    onClick={(e) => { e.preventDefault(); onLocateMe(); }}
                    disabled={isLocating}
                    title={t('shared_map.title_find_me', '내 위치 찾기')}
                    className="absolute right-4 z-[400] w-12 h-12 bg-espresso-900 rounded-full shadow-lg flex items-center justify-center text-blue-500 border border-blue-100 hover:bg-blue-50 transition-all duration-300 disabled:opacity-50"
                    style={{ bottom: bottomPadding || '1.5rem' }}
                >
                    <Navigation size={22} className={isLocating ? "animate-spin" : ""} fill="currentColor" />
                </button>
            )}

            {mode === 'explore' && shops.length === 0 && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] bg-espresso-900/90 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg border border-espresso-700 text-center pointer-events-none">
                    <p className="font-bold text-[13px] text-espresso-100">{t('shared_map.msg_no_shops', '이 지역에는 등록된 매장이 없습니다.')}</p>
                </div>
            )}
            {isRefreshing && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[2000] bg-espresso-900/90 text-amber-500 px-4 py-2 rounded-full shadow-lg border border-amber-500/30 flex items-center gap-2 text-sm font-bold backdrop-blur-md">
                    <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                    {t('map.msg_loading_shops')}
                </div>
            )}
        </div>
    );
}
