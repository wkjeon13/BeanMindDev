import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, BarChart2, PieChart, LineChart, Activity, Users, MapPin, Database, Loader2, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_BASE } from '@/utils/apiConfig';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

function MapClickHandler({ setHarvestCoords, setHarvestRegion }: any) {
    useMapEvents({
        async click(e) {
            const { lat, lng } = e.latlng;
            setHarvestCoords([lat, lng]);
            
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.address) {
                        const addr = data.address;
                        const neighborhood = addr.neighbourhood || addr.suburb || addr.town || addr.village;
                        const city = addr.city || addr.province || addr.county;
                        let displayName = '';
                        if (addr.country_code === 'kr') {
                            displayName = `${city || ''} ${neighborhood || ''}`.trim();
                        } else {
                            displayName = `${neighborhood ? neighborhood + ', ' : ''}${city || ''}`.trim();
                        }
                        if (!displayName) displayName = data.name || '선택된 지역';
                        
                        setHarvestRegion(displayName);
                    }
                }
            } catch (err) {
                console.warn('Reverse geocoding failed', err);
            }
        }
    });
    return null;
}

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [metrics, setMetrics] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const token = localStorage.getItem('token');
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    // Admin Access Check
    useEffect(() => {
        if (!token || (currentUser.role !== 'ADMIN' && currentUser.role !== 'MODERATOR')) {
            alert(t('admin_dashboard.error_login_req'));
            navigate('/');
        } else {
            fetchData();
        }
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE}/api/admin/metrics`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || t('admin_dashboard.error_server'));
            }

            const data = await res.json();
            setMetrics(data);
        } catch (err: any) {
            setError(err.message || t('admin_dashboard.error_server'));
        } finally {
            setIsLoading(false);
        }
    };

    const [harvestRegion, setHarvestRegion] = useState('');
    const [harvestCoords, setHarvestCoords] = useState<[number, number] | null>(null);
    const [isHarvesting, setIsHarvesting] = useState(false);
    const [harvestStatus, setHarvestStatus] = useState('');

    const handleHarvest = async () => {
        if (!harvestRegion.trim()) return;
        
        setIsHarvesting(true);
        setHarvestStatus(`구글 Gemini 2.5 Flash 모델 기동... "${harvestRegion}" 지역의 숨겨진 스페셜티 카페 정보를 웹과 지도에서 탐색 중입니다. (약 10~20초 소요)`);
        
        try {
            const promptStr = harvestCoords 
                ? `List up to 50 specialty coffee shops, roasteries, and highly rated popular local cafes in and around the vicinity of Latitude ${harvestCoords[0]}, Longitude ${harvestCoords[1]} (${harvestRegion}). Search a wide area. Maximize the number of results up to 50.`
                : `List up to 50 specialty coffee shops, roasteries, and highly rated popular local cafes in ${harvestRegion}. Search a wide area. Maximize the number of results up to 50.`;
            
            const fullPrompt = `${promptStr}
                    CRITICAL INSTRUCTION: You must respond ONLY with a raw, valid JSON array of objects. DO NOT include any formatting markdown like \`\`\`json. You MUST provide real 'lat' and 'lng' float coordinates for EVERY shop. If you cannot find exactly 50, provide as many beautiful cafes as possible. DO NOT return an empty [] array under any circumstances. Example format: [{"name": "Shop Name", "lat": 37.512, "lng": 126.981}]`;
            
            let mapsResponse;
            try {
                mapsResponse = await fetch(`${API_BASE}/api/ai-features/map-shops`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ promptStr: fullPrompt })
                });
                if (!mapsResponse.ok) throw new Error("Backend Map API Failed");
            } catch (aiErr: any) {
                console.error("Gemini AI Engine crash:", aiErr);
                throw new Error(`Google Gemini 통신 실패: 백엔드 서버 확인 필요`);
            }

            const mapData = await mapsResponse.json();
            const parsedData = mapData.shops || [];
            const chunks = mapData.chunks;

            if (parsedData.length === 0) {
                setHarvestStatus(`탐색 완료: "${harvestRegion}" 지역에서 스페셜티 매장 정보를 찾지 못했습니다.`);
                setIsHarvesting(false);
                return;
            }

            setHarvestStatus(`데이터 조립 중... ${parsedData.length}개의 리스트 중 구글 지도 딥링크 매칭 시작.`);

            const shopsToImport: any[] = [];
            parsedData.forEach((shop: any) => {
                if (!shop.name || shop.lat === undefined || shop.lng === undefined) return;

                let uri = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.name)}`;
                if (chunks) {
                    const matchChunk = chunks.find((c: any) => c.maps && (shop.name.toLowerCase().includes(c.maps.title.toLowerCase()) || c.maps.title.toLowerCase().includes(shop.name.toLowerCase())));
                    if (matchChunk) uri = matchChunk.maps.uri;
                }

                shopsToImport.push({ 
                    name: shop.name, 
                    lat: shop.lat, 
                    lng: shop.lng, 
                    uri 
                });
            });

            setHarvestStatus(`DB 일괄 주입 중... 추출된 ${shopsToImport.length}개의 좌표와 링크를 서버로 업로드합니다.`);

            let res: any;
            try {
                res = await fetch(`${API_BASE}/api/shops/ai-import`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ shops: shopsToImport })
                });
            } catch (dbErr: any) {
                console.error("Backend Server DB Upload crash:", dbErr);
                throw new Error(`내부 데이터베이스 통신 실패: 백엔드 접속 이상 (Failed to fetch). 서버가 실행중이거나 API 주소가 유효한지 확인하세요.`);
            }

            if (!res.ok) throw new Error(`서버 DB 업로드에 실패했습니다. HTTP 상태코드: ${res.status}`);
            
            const resultData = await res.json();
            setHarvestStatus(`✅ 처리 완료! 총 ${parsedData.length}개 탐색 완료: 신규 DB 등록 ${resultData.importedCount || 0}건, 기존 매장 갱신(위치 자가치유) ${resultData.updatedCount || 0}건이 반영되었습니다.`);
            setHarvestRegion('');
        } catch (err: any) {
            setHarvestStatus(`❌ 수집 실패: ${err.message}`);
        } finally {
            setIsHarvesting(false);
        }
    };

    return (
        <div className="h-full w-full bg-espresso-950 overflow-y-auto pb-safe font-sans">
            <div className="max-w-7xl mx-auto flex flex-col min-h-full">
                {/* Header */}
                <header className="px-6 py-6 pt-safe mt-4 shrink-0 border-b border-espresso-700">
                    <div className="flex items-center gap-3 mb-2">
                        <button onClick={() => navigate('/profile')} className="w-10 h-10 rounded-full bg-espresso-900 flex items-center justify-center border border-coffee-100 text-coffee-600 hover:bg-espresso-950 transition-colors active:scale-95 shadow-sm">
                            <ArrowLeft size={20} />
                        </button>
                        <Shield className="text-espresso-50" size={28} />
                        <h1 className="text-2xl font-serif font-bold text-espresso-50 tracking-tight">{t('admin_dashboard.title')}</h1>
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 p-4 space-y-4">
                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-coffee-400">
                            <div className="w-8 h-8 rounded-full border-4 border-espresso-700 border-t-coffee-900 animate-spin mb-4" />
                            <p className="font-medium">{t('admin_dashboard.loading')}</p>
                        </div>
                    ) : (
                        metrics && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="flex flex-col gap-2 px-2">
                                    <h2 className="text-xl font-bold text-espresso-50 flex items-center gap-2">
                                        <Activity size={20} className="text-green-600" />
                                        {t('admin_dashboard.dash_title')}
                                    </h2>
                                    <p className="text-sm text-espresso-300">{t('admin_dashboard.dash_desc')}</p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-2">
                                    <div className="bg-espresso-900 p-5 rounded-2xl shadow-sm border border-coffee-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                                        <div className="bg-cyan-50 p-3 rounded-full">
                                            <Users size={24} className="text-amber-700" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-espresso-300">{t('admin_dashboard.dash_total_users')}</p>
                                            <p className="text-2xl font-black text-espresso-50">{metrics.totalUsers}</p>
                                            <div className="flex gap-2 text-xs font-semibold mt-1">
                                                <span className="text-amber-700">{t('admin_dashboard.dash_general_users', { count: metrics.totalGeneralUsers })}</span>
                                                <span className="text-amber-600">{t('admin_dashboard.dash_host_users', { count: metrics.totalHostUsers })}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-espresso-900 p-5 rounded-2xl shadow-sm border border-coffee-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                                        <div className="bg-green-50 p-3 rounded-full">
                                            <PieChart size={24} className="text-green-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-espresso-300">{t('admin_dashboard.dash_anon_visitors')}</p>
                                            <p className="text-2xl font-black text-espresso-50">{metrics.totalAnonymousVisitors}</p>
                                            <p className="text-xs text-coffee-400 font-semibold mt-1">{t('admin_dashboard.dash_anon_sub')}</p>
                                        </div>
                                    </div>

                                    <div className="bg-espresso-900 p-5 rounded-2xl shadow-sm border border-coffee-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                                        <div className="bg-indigo-50 p-3 rounded-full">
                                            <LineChart size={24} className="text-indigo-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-espresso-300">{t('admin_dashboard.dash_prescriptions')}</p>
                                            <p className="text-2xl font-black text-espresso-50">{metrics.totalPrescriptions} <span className="text-[17px] font-bold text-indigo-600">{t('admin_dashboard.dash_px_sub', { loggedIn: metrics.aiPrescriptionsLoggedIn || 0, anon: metrics.aiPrescriptionsAnonymous || 0 })}</span></p>
                                            <p className="text-xs text-indigo-500 font-semibold mt-1">{t('admin_dashboard.dash_px_desc')}</p>
                                        </div>
                                    </div>

                                    <div className="bg-espresso-900 p-5 rounded-2xl shadow-sm border border-coffee-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                                        <div className="bg-purple-50 p-3 rounded-full">
                                            <BarChart2 size={24} className="text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-espresso-300">{t('admin_dashboard.dash_ai_users')}</p>
                                            <p className="text-2xl font-black text-espresso-50">{metrics.totalAiUsers || 0} <span className="text-lg text-purple-600">{t('admin_dashboard.dash_ai_sub', { loggedIn: metrics.aiUsersLoggedIn || 0 })}</span></p>
                                            <p className="text-xs text-purple-500 font-semibold mt-1">{t('admin_dashboard.dash_ai_desc', { anon: metrics.aiUsersAnonymous || 0 })}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* NEW: AI Data Harvester Section */}
                                <div className="mt-8 flex flex-col gap-2 px-2 pt-6 border-t border-espresso-700/50">
                                    <h2 className="text-xl font-bold text-espresso-50 flex items-center gap-2">
                                        <Database size={20} className="text-amber-500" />
                                        Regional AI Data Harvester
                                    </h2>
                                    <p className="text-sm text-espresso-300">
                                        자동화된 AI 지식 탐색기를 이용해 특정 지역(예: "제주도 서귀포시", "성수동")의 유명 스페셜티 카페들을 대량으로 발굴하고 글로벌 지도 DB에 정식 등록합니다.
                                    </p>
                                    
                                    <div className="bg-espresso-900/50 p-6 rounded-2xl shadow-sm border border-espresso-700/50 flex flex-col gap-4 mt-2 mb-8">
                                        <div className="h-[500px] w-full bg-espresso-950 rounded-xl overflow-hidden border border-espresso-700/50 relative z-10">
                                            <MapContainer 
                                                center={[37.5665, 126.9780]} 
                                                zoom={11} 
                                                zoomControl={true}
                                                style={{ height: '100%', width: '100%' }}
                                                className="z-0"
                                            >
                                                <TileLayer
                                                    url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ko"
                                                    attribution="Google Maps"
                                                />
                                                <MapClickHandler setHarvestCoords={setHarvestCoords} setHarvestRegion={setHarvestRegion} />
                                                
                                                {harvestCoords && (
                                                    <Marker 
                                                        position={harvestCoords} 
                                                        icon={L.divIcon({
                                                            className: 'admin-harvest-anchor',
                                                            html: `<div class="animate-bounce" style="font-size: 36px; text-shadow: 0 4px 8px rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: flex-end; width: 40px; height: 50px;">📍</div>`,
                                                            iconSize: [40, 50],
                                                            iconAnchor: [20, 50]
                                                        })}
                                                    />
                                                )}
                                            </MapContainer>
                                            <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg text-[12px] font-bold text-slate-800 shadow-sm z-[1000] border border-black/10 pointer-events-none flex items-center gap-1.5">
                                                👆 지도를 이리저리 움직이고 클릭하여 중심점을 선택하세요
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <div className="relative flex-1">
                                                <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-espresso-400" />
                                                <input 
                                                    type="text" 
                                                    value={harvestRegion}
                                                    onChange={(e) => setHarvestRegion(e.target.value)}
                                                    placeholder="수집할 지역 이름을 입력하세요 (예: 강남구, 도쿄 시부야)"
                                                    disabled={isHarvesting}
                                                    className="w-full bg-espresso-950/50 border border-espresso-700 rounded-xl py-3 pl-11 pr-4 text-espresso-50 placeholder-espresso-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all text-[15px]" 
                                                />
                                            </div>
                                            <button 
                                                onClick={handleHarvest}
                                                disabled={isHarvesting || !harvestRegion.trim()}
                                                className="bg-amber-600 hover:bg-amber-500 disabled:bg-espresso-800 disabled:text-espresso-500 disabled:border-transparent text-espresso-50 font-bold px-6 py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(217,119,6,0.2)] whitespace-nowrap flex items-center gap-2 border border-amber-500/50"
                                            >
                                                {isHarvesting ? <Loader2 size={18} className="animate-spin" /> : <Database size={18} />}
                                                {isHarvesting ? '수집 중...' : '발굴 및 수집 시작'}
                                            </button>
                                        </div>
                                        
                                        {harvestStatus && (
                                            <div className={`flex items-start gap-3 p-4 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-2 ${harvestStatus.includes('Error') || harvestStatus.includes('실패') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : (harvestStatus.includes('성공') ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20')}`}>
                                                {harvestStatus.includes('성공') ? <CheckCircle2 size={20} className="shrink-0" /> : (harvestStatus.includes('Error') || harvestStatus.includes('실패') ? null : <Loader2 size={20} className="shrink-0 animate-spin" />)}
                                                <p className="leading-relaxed break-keep">{harvestStatus}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
