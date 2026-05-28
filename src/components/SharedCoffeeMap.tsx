import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { GoogleMap, useJsApiLoader, OverlayViewF, OverlayView, PolylineF } from '@react-google-maps/api';
import { Heart, Navigation } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../utils/apiConfig';
import { MapSponsorMarker } from './ads/MapSponsorMarker';

const libraries: ("places")[] = ["places"];

const getFullImageUrl = (url: string | null | undefined) => {
    if (!url) return '';
    if (url.startsWith('/mock-bucket')) return 'https://images.unsplash.com/photo-1554118811-1e0d58224f24';
    if (url.startsWith('/') && !url.startsWith('//')) return `${API_BASE}${url}`;
    return url;
};

const StopPropagationWrapper = ({ children, onClick, className, onIntercept, style }: { children: React.ReactNode, onClick?: (e: any) => void, className?: string, onIntercept?: () => void, style?: React.CSSProperties }) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        
        // Use Google Maps native method to prevent map clicks/gestures from propagating through this element
        if (window.google && window.google.maps && window.google.maps.OverlayView) {
            try {
                window.google.maps.OverlayView.preventMapHitsAndGesturesFrom(el);
            } catch (e) {
                console.error("preventMapHitsAndGesturesFrom failed", e);
            }
        }

        const stopAndClick = (e: Event) => {
            e.stopPropagation();
            if (onIntercept) onIntercept();
            if (onClick) onClick(e);
        };

        const stop = (e: Event) => {
            e.stopPropagation();
            if (onIntercept) onIntercept();
        };

        el.addEventListener('click', stopAndClick);
        el.addEventListener('mousedown', stop);
        el.addEventListener('touchstart', stop, { passive: false });
        el.addEventListener('pointerdown', stop);
        el.addEventListener('touchend', stop, { passive: false });
        el.addEventListener('dblclick', stop);
        return () => {
            el.removeEventListener('click', stopAndClick);
            el.removeEventListener('mousedown', stop);
            el.removeEventListener('touchstart', stop);
            el.removeEventListener('pointerdown', stop);
            el.removeEventListener('touchend', stop);
            el.removeEventListener('dblclick', stop);
        };
    }, [onClick]);
    return <div ref={ref} className={className} style={style}>{children}</div>;
};

export interface MapShop {
    id: string;
    name: string;
    lat: number;
    lng: number;
    
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
    
    uri?: string;
    distance?: number;
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
    
    searchedShopId?: string | null;
    focusedShopId?: string | null;
    onShopClick?: (shop: MapShop) => void;
    onPopupClick?: (shop: MapShop) => void;
    onBookmarkToggle?: (shopId: string) => void;
    bookmarkedIds?: Set<string>;
    
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

const mapContainerStyle = {
    width: '100%',
    height: '100%',
    minHeight: '100%',
    position: 'absolute' as const,
    inset: 0
};

const defaultMapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
    zoomControlOptions: {
        position: 3 // TOP_RIGHT
    },
    clickableIcons: false,
    backgroundColor: '#1e1b19', // espresso-950
};

const defaultGetPixelPositionOffset = (w: number, h: number, isDbShop: boolean, isTargetRegion: boolean, shop: any) => {
    const isUnclaimed = isDbShop && !shop.mainImageUrl && !shop.markerImageUrl && (!shop.media || shop.media.length === 0);
    if (isUnclaimed || isTargetRegion) return { x: -(w / 2), y: -(h / 2) };
    return { x: -(w / 2), y: -h };
};

const MemoizedMapMarker = React.memo(({ 
    shop, lat, lng, isDbShop, isFocused, isSearched, isHighlighted, isPremium, isTargetRegion, zIndexOffset, courseIdx, ignoreMapClickRef, onShopClick, onPopupClick, bookmarkedIds, onBookmarkToggle, getFullImageUrl, t 
}: any) => {
    const focusTimeRef = useRef<number>(0);
    useEffect(() => {
        if (isFocused) {
            focusTimeRef.current = Date.now();
        }
    }, [isFocused]);

    const getOffset = useCallback((w: number, h: number) => {
        return defaultGetPixelPositionOffset(w, h, isDbShop, isTargetRegion, shop);
    }, [isDbShop, isTargetRegion, shop]);

    const courseBadge = courseIdx >= 0 ? (
        <div className="absolute -top-3.5 -left-3.5 w-7 h-7 bg-amber-500 text-white rounded-full text-sm font-black flex items-center justify-center shadow-md z-50 border-2 border-white">
            {courseIdx + 1}
        </div>
    ) : null;

    return (
        <OverlayViewF
            position={{ lat, lng }}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            getPixelPositionOffset={getOffset}
            zIndex={zIndexOffset}
        >
            <StopPropagationWrapper 
                className="relative cursor-pointer group"
                style={{ pointerEvents: 'auto' }}
                onIntercept={() => {
                    ignoreMapClickRef.current = true;
                    setTimeout(() => { ignoreMapClickRef.current = false; }, 500);
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    e.nativeEvent?.stopImmediatePropagation?.();
                    onShopClick?.(shop);
                }}
            >
                {isDbShop ? (
                    // DB Shop Marker Rendering
                    (() => {
                        const isUnclaimed = !shop.mainImageUrl && !shop.markerImageUrl && (!shop.media || shop.media.length === 0);
                        if (isUnclaimed) {
                            const size = isFocused ? 54 : 39;
                            return (
                                <div className={`transition-all duration-300 flex items-center justify-center rounded-full border-[2.5px] border-white text-white ${isHighlighted ? 'bg-red-500' : 'bg-gray-500'} ${isFocused ? 'shadow-[0_0_15px_rgba(239,68,68,0.6)]' : 'shadow-md'}`} style={{ width: size, height: size }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width={isFocused ? 27 : 21} height={isFocused ? 27 : 21} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"></path><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"></path><line x1="6" x2="6" y1="2" y2="4"></line><line x1="10" x2="10" y1="2" y2="4"></line><line x1="14" x2="14" y1="2" y2="4"></line></svg>
                                    {courseBadge}
                                    {isSearched && !isFocused && <div className="absolute -top-[30px] left-1/2 -translate-x-1/2 bg-red-500 text-white px-2 py-0.5 rounded-xl text-[11px] font-bold whitespace-nowrap shadow-sm">{t('shared_map.lbl_searched_shop', '검?된 매장')}</div>}
                                    {isFocused && <div className="absolute -top-[30px] left-1/2 -translate-x-1/2 bg-red-500 text-white px-2 py-0.5 rounded-xl text-[11px] font-bold whitespace-nowrap shadow-sm z-10">{t('shared_map.lbl_selected_shop', '?택??매장')}</div>}
                                </div>
                            );
                        } else {
                            const size = isFocused ? 64 : 48;
                            const borderColor = isFocused ? 'border-amber-500' : (isSearched ? 'border-red-500' : (isPremium ? 'border-amber-500' : 'border-white'));
                            
                            let mainImageSrc = shop.markerImageUrl || shop.mainImageUrl;
                            if (typeof mainImageSrc === 'string' && mainImageSrc.startsWith('[')) {
                                try { mainImageSrc = JSON.parse(mainImageSrc)[0]; } catch(e){}
                            }
                            if (!mainImageSrc) mainImageSrc = 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80&w=800';
                            const isVideo = typeof mainImageSrc === 'string' && (mainImageSrc.toLowerCase().endsWith('.mp4') || mainImageSrc.toLowerCase().endsWith('.mov'));

                            return (
                                <div className={`transition-all duration-300 rounded-full border-[3px] ${borderColor} overflow-hidden bg-[#f3f0ea] shadow-md relative ${isFocused || isPremium ? 'shadow-[0_0_15px_rgba(251,191,36,0.6)]' : ''}`} style={{ width: size, height: size }}>
                                    {isVideo ? (
                                        <video src={getFullImageUrl(mainImageSrc as string)} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                                    ) : (
                                        <img src={getFullImageUrl(mainImageSrc as string)} alt={shop.name} className="w-full h-full object-cover" />
                                    )}
                                    {courseBadge}
                                    {isSearched && !isFocused && <div className="absolute -top-[30px] left-1/2 -translate-x-1/2 bg-red-500 text-white px-2 py-0.5 rounded-xl text-[11px] font-bold whitespace-nowrap shadow-sm">{t('shared_map.lbl_searched_shop', '검?된 매장')}</div>}
                                    {isFocused && <div className="absolute -top-[30px] left-1/2 -translate-x-1/2 bg-amber-500 text-white px-2 py-0.5 rounded-xl text-[11px] font-bold whitespace-nowrap shadow-sm z-10">{t('shared_map.lbl_selected_shop', '?택??매장')}</div>}
                                    {isPremium && !isHighlighted && <div className="absolute -top-[18px] -right-[8px] text-[24px] rotate-[15deg] drop-shadow-md">?</div>}
                                </div>
                            );
                        }
                    })()
                ) : (
                    // Generic AI / Target Pin
                    isTargetRegion ? (
                        <div className="relative w-[30px] h-[30px] flex justify-center items-center">
                            <div className="absolute w-full h-full rounded-full bg-red-500/50 animate-ping"></div>
                            <div className="w-[16px] h-[16px] bg-red-500 border-[3px] border-white rounded-full shadow-md z-10"></div>
                            <div className="absolute -top-[25px] left-1/2 -translate-x-1/2 bg-red-500 text-white px-2 py-0.5 rounded-xl text-[11px] font-bold whitespace-nowrap shadow-sm z-20">
                                {t('shared_map.lbl_search_center', '검??중심')}
                            </div>
                        </div>
                    ) : (
                        <div className="relative flex justify-center items-center w-[28px] h-[41px] drop-shadow-md">
                            {isHighlighted && <div className="absolute -top-[25px] left-1/2 -translate-x-1/2 bg-red-500 text-white px-2 py-0.5 rounded-xl text-[11px] font-bold whitespace-nowrap shadow-sm z-10">{t('shared_map.lbl_selected_loc', '?택???치')}</div>}
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="28" height="41" fill={isHighlighted ? '#ef4444' : '#3b82f6'}>
                                <path d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/>
                            </svg>
                        </div>
                    )
                )}

                {/* Focused Shop Popup Overlay (similar to Leaflet Popup) */}
                {!shop.isGeneric && (
                    <StopPropagationWrapper 
                        className={`absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 bg-white flex p-3 gap-3 items-center hover:bg-zinc-50 transition-all duration-200 w-auto min-w-[260px] max-w-[60vw] rounded-xl shadow-lg border border-zinc-200/60 font-sans z-50 cursor-pointer origin-bottom ${isFocused ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
                        onIntercept={() => {
                            ignoreMapClickRef.current = true;
                            setTimeout(() => { ignoreMapClickRef.current = false; }, 500);
                        }}
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            e.nativeEvent?.stopImmediatePropagation?.(); 
                            // Ignore synthetic clicks that happen immediately after the popup is shown
                            if (focusTimeRef.current && Date.now() - focusTimeRef.current < 500) return;
                            (onPopupClick || onShopClick)?.(shop); 
                        }}
                    >
                        <button 
                            onClick={(e) => { e.stopPropagation(); onBookmarkToggle?.(shop.id); }} 
                            className="absolute top-2.5 right-2.5 p-1 transition-transform active:scale-90 z-10"
                        >
                            <Heart size={18} fill={bookmarkedIds.has(shop.id) ? "currentColor" : "none"} className={bookmarkedIds.has(shop.id) ? 'text-rose-500' : 'text-zinc-400'} strokeWidth={bookmarkedIds.has(shop.id) ? 0 : 2} />
                        </button>
                        <div className="w-[56px] h-[56px] shrink-0 rounded-[10px] overflow-hidden bg-zinc-100 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] border border-black/5">
                            {(() => {
                                let mainImageSrc = shop.markerImageUrl || shop.mainImageUrl;
                                if (typeof mainImageSrc === 'string' && mainImageSrc.startsWith('[')) {
                                    try { mainImageSrc = JSON.parse(mainImageSrc)[0]; } catch(e){}
                                }
                                if (!mainImageSrc) mainImageSrc = 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80&w=800';
                                const isVideo = typeof mainImageSrc === 'string' && (mainImageSrc.toLowerCase().endsWith('.mp4') || mainImageSrc.toLowerCase().endsWith('.mov'));
                                return isVideo ? (
                                    <video src={getFullImageUrl(mainImageSrc as string)} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                                ) : (
                                    <img src={getFullImageUrl(mainImageSrc as string)} alt={shop.name} className="w-full h-full object-cover" />
                                );
                            })()}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center pr-6 text-left">
                            <h3 className="font-extrabold text-[15px] font-sans text-zinc-900 leading-tight truncate w-full mb-0.5">{shop.name}</h3>
                            <div className="flex items-center gap-1 mt-1 text-[12px] text-zinc-600 w-full min-w-0 font-sans">
                                <span className="truncate block max-w-[120px]">
                                    {shop.shortDesc || shop.signatureBean || "Specialty Coffee"}
                                </span>
                                <span className="shrink-0 text-zinc-300">|</span>
                                <span className="shrink-0 text-zinc-600">
                                    {(shop.reviewCount ?? 0) > 0 ? (
                                        <span className="font-semibold text-amber-500">{shop.averageRating?.toFixed(1) || '0.0'} <span className="text-zinc-400 font-normal">({(shop.reviewCount ?? 0) >= 1000 ? ((shop.reviewCount ?? 0)/1000).toFixed(1)+'k' : shop.reviewCount})</span></span>
                                    ) : (
                                        <span className="text-zinc-500 text-[11px]">{t('shared_map.lbl_no_review', '리뷰 ?음')}</span>
                                    )}
                                </span>
                            </div>
                        </div>
                    </StopPropagationWrapper>
                )}
                
                {/* Generic AI popup (Prescription mode) */}
                {shop.isGeneric && (
                    <div className={`absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-md p-2 px-3 text-center z-50 whitespace-nowrap transition-all duration-200 origin-bottom ${isFocused ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                        <div className="font-bold text-[14px] text-espresso-950">{shop.name}</div>
                    </div>
                )}
            </StopPropagationWrapper>
        </OverlayViewF>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.shop.id === nextProps.shop.id &&
        prevProps.isFocused === nextProps.isFocused &&
        prevProps.isSearched === nextProps.isSearched &&
        prevProps.isHighlighted === nextProps.isHighlighted &&
        prevProps.lat === nextProps.lat &&
        prevProps.lng === nextProps.lng &&
        prevProps.isDbShop === nextProps.isDbShop &&
        prevProps.isPremium === nextProps.isPremium &&
        prevProps.isTargetRegion === nextProps.isTargetRegion &&
        prevProps.zIndexOffset === nextProps.zIndexOffset &&
        prevProps.courseIdx === nextProps.courseIdx &&
        prevProps.bookmarkedIds.has(prevProps.shop.id) === nextProps.bookmarkedIds.has(nextProps.shop.id)
    );
});

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
    
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        libraries,
        language: 'en'
    });

    const mapRef = useRef<google.maps.Map | null>(null);
    const prevBoundsTs = useRef(0);
    const prevCenterStr = useRef('');
    const ignoreMapClickRef = useRef(false);

    const onLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
    }, []);

    const onUnmount = useCallback(() => {
        mapRef.current = null;
    }, []);

    const pressTimer = useRef<NodeJS.Timeout | null>(null);
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);

    const onMapClickRef = useRef(onMapClick);
    useEffect(() => {
        onMapClickRef.current = onMapClick;
    }, [onMapClick]);

    const handleMapMouseDown = useCallback((e: google.maps.MapMouseEvent) => {
        if (ignoreMapClickRef.current) return;
        
        if (pressTimer.current) {
            clearTimeout(pressTimer.current);
        }
        
        pressTimer.current = setTimeout(() => {
            if (e.latLng && onMapClickRef.current) {
                onMapClickRef.current(e.latLng.lat(), e.latLng.lng());
            }
        }, 950); // 950ms sensitivity threshold for true long press
    }, []);

    const handleMapMouseUpOrDrag = useCallback(() => {
        if (pressTimer.current) {
            clearTimeout(pressTimer.current);
            pressTimer.current = null;
        }
    }, []);

    // Custom touch handling to cancel longpress on drag, zoom or quick taps
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length > 1) {
            handleMapMouseUpOrDrag();
            return;
        }
        const touch = e.touches[0];
        touchStartRef.current = { x: touch.screenX, y: touch.screenY };
    }, [handleMapMouseUpOrDrag]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (touchStartRef.current) {
            const touch = e.touches[0];
            const dx = touch.screenX - touchStartRef.current.x;
            const dy = touch.screenY - touchStartRef.current.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Cancel long press if the finger moves more than 8 pixels (scroll / drag action)
            if (distance > 8) {
                handleMapMouseUpOrDrag();
            }
        }
    }, [handleMapMouseUpOrDrag]);

    const handleTouchEnd = useCallback(() => {
        touchStartRef.current = null;
        handleMapMouseUpOrDrag();
    }, [handleMapMouseUpOrDrag]);

    // Handle Drag / Move
    const handleIdle = useCallback(() => {
        if (!mapRef.current || mode !== 'explore') return;
        
        const newCenter = mapRef.current.getCenter();
        const bounds = mapRef.current.getBounds();
        
        if (newCenter && setMapCenter) {
            setMapCenter([newCenter.lat(), newCenter.lng()]);
            prevCenterStr.current = `${newCenter.lat()},${newCenter.lng()}`;
        }
        
        if (bounds && setMapBounds) {
            const ne = bounds.getNorthEast();
            const sw = bounds.getSouthWest();
            setMapBounds({
                minLat: sw.lat(),
                maxLat: ne.lat(),
                minLng: sw.lng(),
                maxLng: ne.lng()
            });
        }
    }, [mode, setMapCenter, setMapBounds]);

    // Handle bounds to fit & centering
    useEffect(() => {
        if (!mapRef.current || mode !== 'explore') return;
        const currentCenterStr = mapCenter ? `${mapCenter[0]},${mapCenter[1]}` : '';

        if (boundsToFit && boundsToFit.ts !== prevBoundsTs.current) {
            prevBoundsTs.current = boundsToFit.ts;
            prevCenterStr.current = currentCenterStr;
            
            if (!isNaN(boundsToFit.minLat)) {
                mapRef.current.fitBounds({
                    north: boundsToFit.maxLat,
                    south: boundsToFit.minLat,
                    east: boundsToFit.maxLng,
                    west: boundsToFit.minLng
                }, 20);
            }
        } else if (mapCenter && currentCenterStr !== prevCenterStr.current) {
            prevCenterStr.current = currentCenterStr;
            if (Array.isArray(mapCenter) && !isNaN(mapCenter[0])) {
                mapRef.current.panTo({ lat: mapCenter[0], lng: mapCenter[1] });
            }
        }
    }, [mapCenter, boundsToFit, mode]);

    // Prescription mode bounds
    useEffect(() => {
        if (mapRef.current && mode === 'prescription' && userLocation && shops.length > 0) {
            const bounds = new google.maps.LatLngBounds();
            bounds.extend({ lat: userLocation[0], lng: userLocation[1] });
            shops.forEach(s => {
                if (s.lat && s.lng) bounds.extend({ lat: s.lat, lng: s.lng });
            });
            mapRef.current.fitBounds(bounds, 50);
        }
    }, [mode, userLocation, shops, isLoaded]);

    const initialCenter = mapCenter || userLocation || [37.5665, 126.9780];
    const [defaultCenter] = useState({ lat: initialCenter[0], lng: initialCenter[1] });

    if (loadError) {
        return <div className="w-full h-full flex items-center justify-center text-white bg-espresso-950">Error loading maps</div>;
    }

    if (!isLoaded) {
        return <div className="w-full h-full flex items-center justify-center bg-espresso-950">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        </div>;
    }

    return (
        <div 
            className="absolute inset-0 w-full h-full" 
            style={{ touchAction: 'none', minHeight: '100%' }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
        >
            <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={defaultCenter}
                zoom={14}
                options={defaultMapOptions}
                onLoad={onLoad}
                onUnmount={onUnmount}
                onIdle={handleIdle}
                onMouseDown={handleMapMouseDown}
                onMouseUp={handleMapMouseUpOrDrag}
                onDragStart={handleMapMouseUpOrDrag}
                onDrag={handleMapMouseUpOrDrag}
                onZoomChanged={handleMapMouseUpOrDrag}
            >
                {userLocation && !isNaN(userLocation[0]) && !isNaN(userLocation[1]) && (
                    <OverlayViewF
                        position={{ lat: userLocation[0], lng: userLocation[1] }}
                        mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                        getPixelPositionOffset={(w, h) => ({ x: -(w / 2), y: -(h / 2) })}
                        zIndex={999}
                    >    <div className="relative group cursor-pointer flex items-center justify-center">
                            <div className="w-[20px] h-[20px] bg-blue-500 border-[3px] border-white rounded-full shadow-[0_0_15px_rgba(59,130,246,0.6)]"></div>
                            <div className="opacity-0 group-hover:opacity-100 absolute top-full mt-1 bg-white p-2 rounded-xl shadow-sm text-center font-bold text-[13px] text-espresso-900 pointer-events-none transition-opacity whitespace-nowrap z-50">
                                {t('shared_map.lbl_my_location', '?재 ???치')}
                            </div>
                        </div>
                    </OverlayViewF>
                )}

                {/* Shop Markers */}
                {shops.map((shop, idx) => {
                    let lat = typeof shop.lat === 'number' ? shop.lat : parseFloat(shop.lat as any);
                    let lng = typeof shop.lng === 'number' ? shop.lng : parseFloat(shop.lng as any);
                    
                    if (isNaN(lat) || isNaN(lng)) {
                        if (userLocation && Array.isArray(userLocation)) {
                            const hash = shop.id ? shop.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : idx;
                            const latOffset = (hash % 100) * 0.00005 * (hash % 2 === 0 ? 1 : -1);
                            const lngOffset = ((hash >> 3) % 100) * 0.00005 * (hash % 3 === 0 ? 1 : -1);
                            lat = Number(userLocation[0]) + latOffset;
                            lng = Number(userLocation[1]) + lngOffset;
                        } else return null;
                    }

                    // Handle overlaps
                    const overlaps = shops.filter(s => Math.abs(s.lat - lat) < 0.00001 && Math.abs(s.lng - lng) < 0.00001);
                    if (overlaps.length > 1) {
                        const groupIdx = overlaps.findIndex(s => s.id === shop.id);
                        const radius = 0.0015; 
                        const angle = (Math.PI * 2 * groupIdx) / overlaps.length;
                        lat += radius * Math.cos(angle);
                        lng += radius * Math.sin(angle);
                    }

                    const isDbShop = mode === 'explore' && !shop.isGeneric;
                    const isFocused = shop.id === focusedShopId;
                    const isSearched = shop.id === searchedShopId && (!focusedShopId || focusedShopId === searchedShopId);
                    const isHighlighted = isSearched || isFocused;
                    const isPremium = shop.isPremiumTop || shop.storePlan === 'PREMIUM';
                    const isTargetRegion = shop.id.startsWith('target-region');

                    let zIndexOffset = 10;
                    if (isFocused) zIndexOffset = 2000;
                    else if (isSearched) zIndexOffset = 1500;
                    else if (isPremium) zIndexOffset = 1200;
                    else if (isDbShop) zIndexOffset = 1000;
                    
                    // Course Badge
                    const courseIdx = isCourseMode && courseShops ? courseShops.findIndex(s => s.id === shop.id) : -1;

                    return (
                        <MemoizedMapMarker
                            key={`map-${shop.id}`}
                            shop={shop}
                            idx={idx}
                            lat={lat}
                            lng={lng}
                            isDbShop={isDbShop}
                            isFocused={isFocused}
                            isSearched={isSearched}
                            isHighlighted={isHighlighted}
                            isPremium={isPremium}
                            isTargetRegion={isTargetRegion}
                            zIndexOffset={zIndexOffset}
                            courseIdx={courseIdx}
                            ignoreMapClickRef={ignoreMapClickRef}
                            onShopClick={onShopClick}
                            onPopupClick={onPopupClick}
                            bookmarkedIds={bookmarkedIds}
                            onBookmarkToggle={onBookmarkToggle}
                            getFullImageUrl={getFullImageUrl}
                            t={t}
                        />
                    );
                })}

                {/* Course Route Polyline */}
                {isCourseMode && (courseShops || shops).length > 1 && (
                    <PolylineF
                        path={(courseShops || shops).filter(s => s.lat && s.lng && !isNaN(Number(s.lat)) && !isNaN(Number(s.lng))).map(s => ({ lat: Number(s.lat), lng: Number(s.lng) }))}
                        options={{
                            strokeColor: "#f59e0b",
                            strokeOpacity: 0.8,
                            strokeWeight: 4,
                            icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 4 }, offset: '0', repeat: '20px' }]
                        }}
                    />
                )}
            </GoogleMap>

            {/* Overlays */}
            {mode === 'explore' && onLocateMe && (
                <button
                    onClick={(e) => { e.preventDefault(); onLocateMe(); }}
                    disabled={isLocating}
                    title={t('shared_map.title_find_me', '???치 찾기')}
                    className="absolute right-4 z-[400] w-12 h-12 bg-espresso-900 rounded-full shadow-lg flex items-center justify-center text-blue-500 border border-blue-100 hover:bg-blue-50 transition-all duration-300 disabled:opacity-50"
                    style={{ bottom: bottomPadding || '1.5rem' }}
                >
                    <Navigation size={22} className={isLocating ? "animate-spin" : ""} fill="currentColor" />
                </button>
            )}

            {mode === 'explore' && shops.length === 0 && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] bg-espresso-900/90 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg border border-espresso-700 text-center pointer-events-none">
                    <p className="font-bold text-[13px] text-espresso-100">{t('shared_map.msg_no_shops', '??지?????록??매장???습?다.')}</p>
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
