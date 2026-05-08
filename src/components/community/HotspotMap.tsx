import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { API_BASE } from '../../utils/apiConfig';
import { Flame, MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface Hotspot {
    lat: number;
    lng: number;
    weight: number;
}

// Sub-component to add heat points
const HotspotLayer = ({ data }: { data: Hotspot[] }) => {
    const map = useMapEvents({});

    useEffect(() => {
        if (!data || data.length === 0) return;

        data.forEach(point => {
            const intensity = Math.min(point.weight, 10) / 10;
            const size = 30 + (intensity * 40); // 30px to 70px

            const iconHtml = `
                <div style="
                    width: ${size}px;
                    height: ${size}px;
                    background: radial-gradient(circle, rgba(239, 68, 68, ${0.4 + intensity * 0.4}) 0%, rgba(239, 68, 68, 0) 70%);
                    border-radius: 50%;
                    transform: translate(-50%, -50%);
                    pointer-events: none;
                "></div>
            `;

            const glowingIcon = L.divIcon({
                html: iconHtml,
                className: '',
                iconSize: [0, 0],
            });

            L.marker([point.lat, point.lng], { icon: glowingIcon, interactive: false }).addTo(map);
        });
    }, [data, map]);

    return null;
};

const RecenterMap = ({ lat, lng }: { lat: number, lng: number }) => {
    const map = useMap();
    useEffect(() => {
        map.setView([lat, lng], map.getZoom());
    }, [lat, lng, map]);
    return null;
};

export default function HotspotMap() {
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
                            {hotspots.length === 0 ? "최근 체크인 기록이 없습니다." : '"오, 요즘 성수동에 사람 진짜 많네. 나도 가볼까?"'}
                        </p>
                    </div>
                </div>

                <div className="h-44 w-full rounded-2xl overflow-hidden shadow-inner relative border border-espresso-700/50 map-container-dark">
                    <MapContainer 
                        center={[defaultLat, defaultLng]} 
                        zoom={13} 
                        style={{ height: '100%', width: '100%', zIndex: 0 }}
                        zoomControl={false}
                        attributionControl={false}
                        dragging={true}
                    >
                        {/* Enhanced Dark Theme Layer */}
                        <TileLayer
                            url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png"
                        />
                        <RecenterMap lat={defaultLat} lng={defaultLng} />
                        <HotspotLayer data={hotspots} />
                    </MapContainer>
                    
                    <div className="absolute top-2 right-2 bg-espresso-900/80 backdrop-blur-sm text-amber-100 text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1 font-medium border border-coffee-800">
                        <MapPin size={12} className="text-red-400" />
                        활발한 체크인 구역
                    </div>
                </div>
            </div>
        </div>
    );
}
