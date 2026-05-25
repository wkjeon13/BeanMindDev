import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Navigation, Wand2, X, Loader2, Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../utils/apiConfig';
import { useTranslation } from 'react-i18next';

export default function TourRouteWizard() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    
    // Form States
    const [region, setRegion] = useState('');
    const [theme, setTheme] = useState('');
    
    // Process States
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLocating, setIsLocating] = useState(false);

    const handleUseCurrentLocation = () => {
        if (!("geolocation" in navigator)) {
            alert('현재 위치 기능이 지원되지 않는 브라우저입니다.');
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setIsLocating(false);
                // We'll just generate right away with these coords
                generateTour(null, position.coords.latitude, position.coords.longitude);
            },
            (error) => {
                setIsLocating(false);
                alert('위치 정보를 가져오는데 실패했습니다.');
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    };

    const generateTour = async (searchRegion: string | null, lat?: number, lng?: number) => {
        if (!searchRegion && (!lat || !lng)) {
            alert('어느 지역을 탐험하실지 입력해주세요.');
            return;
        }

        setIsGenerating(true);

        const token = localStorage.getItem('token');
        if (!token) {
            alert('로그인이 필요한 기능입니다.');
            navigate('/profile');
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/ai-features/tour/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    region: searchRegion, 
                    theme, 
                    lat, 
                    lng 
                })
            });

            if (res.ok) {
                const data = await res.json();
                // Successfully created the collection, redirect to the course viewing page
                navigate(`/course/${data.collectionId}`);
            } else if (res.status === 401 || res.status === 403) {
                alert('로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.dispatchEvent(new Event('authStateChanged'));
                navigate('/');
            } else {
                const errorData = await res.json();
                alert(errorData.error || '투어 생성에 실패했습니다.');
            }
        } catch (error) {
            alert('일시적인 오류가 발생했습니다.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-[100dvh] bg-black text-white p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <button onClick={() => navigate(-1)} className="p-2 bg-zinc-900 rounded-full hover:bg-zinc-800 transition">
                    <X className="w-5 h-5 text-gray-400" />
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">
                        AI 카페 투어 코스 생성
                    </h1>
                </div>
                <div className="w-9" />
            </div>

            <AnimatePresence mode="wait">
                {!isGenerating ? (
                    <motion.div
                        key="input-form"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex flex-col h-[75vh]"
                    >
                        <div className="flex-1">
                            <div className="mb-10 text-center">
                                <div className="w-20 h-20 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <MapPin className="w-10 h-10 text-amber-500" />
                                </div>
                                <h2 className="text-3xl font-black tracking-tight mb-3">어디로 떠나볼까요?</h2>
                                <p className="text-zinc-400 text-sm">
                                    방문할 지역이나 원하는 분위기를 알려주시면<br/>
                                    AI 스페셜티 큐레이터가 최적의 동선을 짜드립니다.
                                </p>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-zinc-300 mb-2 ml-1">방문 지역</label>
                                    <input 
                                        type="text" 
                                        placeholder="예) 성수동, 연남동, 후쿠오카 텐진"
                                        value={region}
                                        onChange={(e) => setRegion(e.target.value)}
                                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-white placeholder:text-zinc-600 font-medium"
                                    />
                                    <button 
                                        onClick={handleUseCurrentLocation}
                                        disabled={isLocating}
                                        className="mt-3 w-full flex items-center justify-center gap-2 py-3 px-4 bg-zinc-900 hover:bg-zinc-800 text-amber-500 rounded-xl text-sm font-bold transition border border-zinc-800"
                                    >
                                        {isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                                        현재 위치 기반으로 코어 스팟 찾기
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-zinc-300 mb-2 ml-1">테마 / 분위기 (선택)</label>
                                    <input 
                                        type="text" 
                                        placeholder="예) 조용한, 에스프레소 바 위주, 데이트 가기 좋은"
                                        value={theme}
                                        onChange={(e) => setTheme(e.target.value)}
                                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-white placeholder:text-zinc-600 font-medium"
                                    />
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={() => generateTour(region)}
                            disabled={!region.trim()}
                            className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black rounded-2xl flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 active:scale-[0.98]"
                        >
                            <Wand2 className="w-5 h-5" />
                            <span>AI 맞춤 동선 코스 뚝딱 만들기</span>
                        </button>
                    </motion.div>
                ) : (
                    <motion.div
                        key="generating"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center h-[70vh] text-center"
                    >
                        <div className="relative mb-8">
                            <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full animate-pulse" />
                            <Compass className="w-20 h-20 text-amber-500 animate-[spin_3s_linear_infinite] relative z-10" />
                        </div>
                        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
                            최적의 투어 코스를<br/>탐색 중입니다...
                        </h2>
                        <div className="space-y-2 text-zinc-400 text-sm font-medium">
                            <p className="animate-pulse delay-75">스페셜티 카페 데이터를 수집하는 중...</p>
                            <p className="animate-pulse delay-150">동선을 고려하여 매장을 필터링하는 중...</p>
                            <p className="animate-pulse delay-300">나만의 비밀 지도를 그리는 중...</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
