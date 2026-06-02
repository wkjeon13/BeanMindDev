import React, { useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, OverlayView } from '@react-google-maps/api';
import { API_BASE } from '../../utils/apiConfig';
import { Flame, MapPin } from 'lucide-react';

interface Hotspot {
    lat: number;
    lng: number;
    weight: number;
    cafeName?: string | null;
    cafeLocation?: string | null;
}

export default function HotspotMap() {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        libraries: ['places']
    });

    const [hotspots, setHotspots] = useState<Hotspot[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);

    useEffect(() => {
        if (navigator.geolocation && !location) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => console.warn("Geolocation error:", err)
            );
        }
        const fetchHotspots = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/community/hotspots`);
                if (res.ok) {
                    const data = await res.json();
                    setHotspots(data);
                }
            } catch (err) {
                console.error("Failed to load hotspots:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHotspots();
        // Refresh every 60 seconds
        const intervalId = setInterval(fetchHotspots, 60000);
        return () => clearInterval(intervalId);
    }, []);

    const getHotspotText = () => {
        if (hotspots.length === 0) return "최근 체크인 기록이 없습니다.";
        const hottest = [...hotspots].sort((a, b) => b.weight - a.weight)[0];
        
        let areaName = "우리 동네";
        if (hottest.cafeName) {
            areaName = hottest.cafeName;
        } else if (hottest.cafeLocation) {
            const dongMatch = hottest.cafeLocation.match(/([가-힣]+동)(?=\s|$)/);
            if (dongMatch) {
                areaName = dongMatch[1];
            } else {
                const guMatch = hottest.cafeLocation.match(/([가-힣]+구)(?=\s|$)/);
                if (guMatch) {
                    areaName = guMatch[1];
                } else {
                    const parts = hottest.cafeLocation.split(' ');
                    areaName = parts.length > 1 ? parts[1] : "우리 동네";
                }
            }
        }
        return `"오, 요즘 ${areaName}에 사람 진짜 많네. 나도 가볼까?"`;
    };

    const defaultLat = location ? location.lat : 37.5665;
    const defaultLng = location ? location.lng : 126.9780;

    return (
        <div className="bg-espresso-900 border-b border-espresso-800 p-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="max-w-2xl mx-auto space-y-3 relative">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center animate-pulse">
                        <Flame size={18} />
                    </div>
                    <div>
                        <h2 className="text-[16px] font-bold text-amber-100 leading-tight">🔥 최근 뜨고 있는 핫스팟</h2>
                        <p className="text-[13px] text-espresso-200 mt-0.5 max-w-[280px]">
                            {getHotspotText()}
                        </p>
                    </div>
                </div>

                <div className="h-44 w-full rounded-2xl overflow-hidden shadow-inner relative border border-espresso-700/50 map-container-dark">
                    {isLoaded ? (
                        <GoogleMap
                            mapContainerStyle={{ width: '100%', height: '100%' }}
                            center={{ lat: defaultLat, lng: defaultLng }}
                            zoom={13}
                            options={{
                                disableDefaultUI: true,
                                zoomControl: false,
                                backgroundColor: '#1e1b19', // Dark mode background
                                styles: [
                                    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                                    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                                    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                                    {
                                      featureType: "administrative.locality",
                                      elementType: "labels.text.fill",
                                      stylers: [{ color: "#d59563" }],
                                    },
                                    {
                                      featureType: "water",
                                      elementType: "geometry",
                                      stylers: [{ color: "#17263c" }],
                                    },
                                ]
                            }}
                        >
                            {hotspots.map((point, i) => {
                                const intensity = Math.min(point.weight, 10) / 10;
                                const size = 30 + (intensity * 40); // 30px to 70px
                                return (
                                    <OverlayView
                                        key={`hotspot-${i}`}
                                        position={{ lat: point.lat, lng: point.lng }}
                                        mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                                        getPixelPositionOffset={(w, h) => ({ x: -(w / 2), y: -(h / 2) })}
                                    >
                                        <div style={{
                                            width: `${size}px`,
                                            height: `${size}px`,
                                            background: `radial-gradient(circle, rgba(239, 68, 68, ${0.4 + intensity * 0.4}) 0%, rgba(239, 68, 68, 0) 70%)`,
                                            borderRadius: '50%',
                                            pointerEvents: 'none',
                                        }} />
                                    </OverlayView>
                                )
                            })}
                        </GoogleMap>
                    ) : (
                        <div className="w-full h-full bg-espresso-950 flex items-center justify-center">Loading Map...</div>
                    )}
                    
                    <div className="absolute top-2 right-2 bg-espresso-900/80 backdrop-blur-sm text-amber-100 text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1 font-medium border border-coffee-800 z-10 pointer-events-none">
                        <MapPin size={12} className="text-red-400" />
                        활발한 체크인 구역
                    </div>
                </div>
            </div>
        </div>
    );
}
