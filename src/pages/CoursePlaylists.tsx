import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ChevronLeft, Share, Map, Coffee, Copy, Lock, PlusCircle, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { API_BASE } from '../utils/apiConfig';
import { useTranslation } from 'react-i18next';

// Helper to sanitize stale local IPs from DB or localStorage
const getSafeImageUrl = (url: string | null | undefined, fallback: string = '') => {
    if (!url) return fallback;
    if (url.includes('/uploads/')) return `${API_BASE}${url.substring(url.indexOf('/uploads/'))}`;
    if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
    return url.startsWith('/') ? `${API_BASE}${url}` : `${API_BASE}/${url}`;
};

export default function CoursePlaylists() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [course, setCourse] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isForking, setIsForking] = useState(false);
    
    // Auth Check
    const token = localStorage.getItem('token');
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        if (!id) return;
        
        const fetchCourse = async () => {
            try {
                // Fetch using the public community endpoint to support anonymous KakaoTalk share links
                const headers: any = {};
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const res = await fetch(`${API_BASE}/api/community/courses/${id}`, { headers });
                
                if (res.ok) {
                    const data = await res.json();
                    
                    if (data && data.id) {
                        const isOwner = currentUser?.id === data.userId;
                        
                        // Proposal Requirement 2: Force visitors heavily into the interactive Map mode directly! 
                        if (!isOwner) {
                            navigate(`/map?courseId=${id}`, { replace: true });
                            return;
                        }
                        
                        // Proceed to mount the editor dashboard only for the creator
                        setCourse(data);
                    }
                } else {
                    alert('코스를 찾을 수 없거나 비공개 설정되어 있습니다.');
                    navigate('/profile', { replace: true });
                }
            } catch (err) {
                console.error(err);
                alert('오류가 발생했습니다.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchCourse();
    }, [id, navigate, token]);

    const handleForkCourse = async () => {
        if (!token) {
            alert('로그인이 필요합니다.');
            return;
        }

        setIsForking(true);
        try {
            const res = await fetch(`${API_BASE}/api/users/collections/${id}/fork`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                alert('내 여권 코스 목록에 추가되었습니다! 🎉');
                navigate('/profile');
            } else {
                alert('가져오기에 실패했습니다.');
            }
        } catch (e) {
            console.error(e);
            alert('오류가 발생했습니다.');
        } finally {
            setIsForking(false);
        }
    };

    const handleShareCourse = () => {
        const text = `[Beanmind 성지순례 코스]\n☕ ${course.name}\n🗺️ 추천 라우트: ${course.items?.length || 0}곳\n\n나만의 맞춤형 커피 공간을 스마트하게 발견해보세요!`;
        if (navigator.share) {
            navigator.share({ title: '커피 성지 코스 공유', text, url: window.location.href });
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert('코스 링크가 클립보드에 복사되었습니다.');
        }
    };

    const handleMoveItem = async (e: React.MouseEvent, idx: number, direction: 'up' | 'down') => {
        e.stopPropagation();
        if (direction === 'up' && idx === 0) return;
        if (direction === 'down' && idx === course.items.length - 1) return;

        const newItems = [...course.items];
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        const temp = newItems[idx];
        newItems[idx] = newItems[swapIdx];
        newItems[swapIdx] = temp;

        const reorderedPayload = newItems.map((item: any, i: number) => ({ id: item.id, orderIndex: i }));
        setCourse((prev: any) => ({ ...prev, items: newItems }));

        try {
            await fetch(`${API_BASE}/api/users/collections/${id}/reorder`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ items: reorderedPayload })
            });
        } catch (err) {
            console.error('Reorder fail', err);
        }
    };

    const handleRemoveItem = async (e: React.MouseEvent, itemId: string) => {
        e.stopPropagation();
        if (!window.confirm('이 경유지를 코스에서 삭제하시겠습니까?')) return;
        try {
            const res = await fetch(`${API_BASE}/api/users/collections/${id}/items/${itemId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setCourse((prev: any) => ({
                    ...prev,
                    items: prev.items.filter((item: any) => item.id !== itemId)
                }));
            } else {
                alert('삭제에 실패했습니다.');
            }
        } catch(err) {
            console.error(err);
            alert('오류가 발생했습니다.');
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-espresso-950">
                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!course) return null;

    const isOwner = currentUser?.id === course.userId;
    const validItems = course.items?.filter((item: any) => item.store) || [];

    const headerImageUrl = getSafeImageUrl(
        course.coverImageUrl || course.items?.[0]?.store?.mainImageUrl,
        'https://images.unsplash.com/photo-1559525839-b184a4d698c7?q=80&w=1000&auto=format&fit=crop'
    );

    return (
        <div className="flex flex-col h-full bg-[#121215] relative overflow-hidden">
            
            {/* --- FIXED UPPER SECTION --- */}
            <div className="shrink-0 flex flex-col relative z-30">
                {/* Floating Nav Bar */}
                <div className="absolute top-0 inset-x-0 z-50 flex items-center justify-between px-4 py-4 pt-safe pointer-events-none">
                    <button onClick={() => navigate(-1)} className="pointer-events-auto p-2.5 bg-espresso-950/40 backdrop-blur-md rounded-full text-espresso-50 border border-white/10 active:scale-95 transition-transform" style={{ WebkitTapHighlightColor: 'transparent' }}>
                        <ChevronLeft size={20} />
                    </button>
                    <div className="flex gap-2 pointer-events-auto">
                        <button onClick={() => navigate(`/map?courseId=${course.id}`)} className="p-2.5 bg-espresso-950/40 backdrop-blur-md rounded-full text-espresso-50 border border-white/10 active:scale-95 transition-transform" style={{ WebkitTapHighlightColor: 'transparent' }}>
                            <Map size={20} />
                        </button>
                    </div>
                </div>

                {/* Header Art */}
                <div className="relative h-[200px] shrink-0 z-10 rounded-b-3xl overflow-hidden shadow-2xl">
                    <div className="absolute inset-0 bg-espresso-900 pointer-events-none">
                        <img src={headerImageUrl} alt="Cover" className="w-full h-full object-cover opacity-60 mix-blend-luminosity" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#121215] via-[#121215]/80 to-transparent"></div>
                    </div>

                    <div className="absolute inset-x-0 bottom-4 px-6 select-text pointer-events-auto">
                        <div className="flex items-center gap-2 mb-2">
                            {course.isPublic ? (
                                <span className="bg-amber-500 text-espresso-950 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-sm">PUBLIC COURSE</span>
                            ) : (
                                <span className="bg-espresso-800 text-espresso-300 border border-espresso-700 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
                                    <Lock size={10} /> PRIVATE
                                </span>
                            )}
                            <span className="bg-espresso-800/80 text-amber-400 backdrop-blur border border-espresso-700 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-sm">
                                {validItems.length} PLACES
                            </span>
                        </div>
                        <h1 className="text-2xl font-black text-espresso-50 tracking-tight leading-tight">{course.name}</h1>
                        {course.description && (
                            <p className="text-[12px] text-espresso-200 mt-1 line-clamp-2 leading-relaxed">{course.description}</p>
                        )}
                    </div>
                </div>

                {/* Actions Bar */}
                <div className="px-6 py-4 flex gap-3 relative z-20 shrink-0 bg-[#121215]">
                    {!isOwner ? (
                        <button 
                            onClick={handleForkCourse}
                            disabled={isForking}
                            className="flex-1 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-espresso-50 font-bold text-[14px] rounded-xl py-3.5 shadow-lg active:scale-95 transition-all flex justify-center items-center gap-2 disabled:opacity-70"
                        >
                            {isForking ? (
                                <div className="w-5 h-5 border-2 border-espresso-50 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <Copy size={18} /><span>내 코스로 가져오기</span>
                                </>
                            )}
                        </button>
                    ) : (
                        <button 
                            onClick={() => navigate('/map')}
                            className="flex-1 bg-espresso-800 hover:bg-espresso-700 text-amber-500 font-bold text-[14px] rounded-xl py-3.5 border border-espresso-700 active:scale-95 transition-all flex justify-center items-center gap-2"
                        >
                            <PlusCircle size={18} /><span>경유지 추가하기</span>
                        </button>
                    )}
                    
                    <button 
                        onClick={handleShareCourse}
                        className="w-14 bg-espresso-800 hover:bg-espresso-700 text-amber-500 flex items-center justify-center rounded-xl border border-espresso-700 shadow-sm active:scale-95 transition-all"
                    >
                        <Share size={20} />
                    </button>
                </div>
            </div>

            {/* --- SCROLLABLE LOWER SECTION --- */}
            <div className="flex-1 overflow-y-auto z-20 bg-[#121215] hide-scrollbar pb-24">
                <div className="px-6 relative">
                    <div className="relative border-l-2 border-espresso-800/80 ml-3 py-4 space-y-6">
                    {validItems.map((item: any, idx: number) => {
                        const store = item.store;

                        const heroImage = getSafeImageUrl(
                            store.mainImageUrl, 
                            'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=40&w=200'
                        );

                        return (
                            <div key={item.id} className="relative pl-6">
                                {/* Waypoint Marker */}
                                <div className="absolute -left-[14px] top-6 w-[26px] h-[26px] bg-[#121215] rounded-full flex items-center justify-center border-[3px] border-amber-500 z-10 shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                                    <span className="text-[10px] font-black text-amber-500">{idx + 1}</span>
                                </div>

                                <motion.div 
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    onClick={() => navigate(`/map?courseId=${id}&shopId=${store.id}`)}
                                    className="bg-espresso-900 border border-espresso-800/80 rounded-[1.5rem] p-3 flex gap-4 cursor-pointer active:scale-95 transition-transform group shadow-lg"
                                >
                                    <div className="w-24 h-24 rounded-[1rem] bg-espresso-950 overflow-hidden shrink-0">
                                        <img src={heroImage} alt={store.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                                    </div>
                                    <div className="flex-1 py-1 pr-1 flex flex-col justify-center relative">
                                        {isOwner && (
                                            <div className="absolute top-0 right-0 flex items-center gap-1">
                                                <button onClick={(e) => handleMoveItem(e, idx, 'up')} disabled={idx === 0} className="p-1.5 text-espresso-400 hover:text-amber-500 hover:bg-espresso-800 disabled:opacity-30 rounded-md transition-all">
                                                    <ChevronUp size={16} />
                                                </button>
                                                <button onClick={(e) => handleMoveItem(e, idx, 'down')} disabled={idx === validItems.length - 1} className="p-1.5 text-espresso-400 hover:text-amber-500 hover:bg-espresso-800 disabled:opacity-30 rounded-md transition-all">
                                                    <ChevronDown size={16} />
                                                </button>
                                                <button onClick={(e) => handleRemoveItem(e, item.id)} className="p-1.5 text-espresso-400 hover:text-red-400 hover:bg-red-500/10 rounded-md ml-1 transition-all" title="코스에서 삭제">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                        <h3 className="font-bold text-[15px] text-espresso-50 leading-tight mb-1 group-hover:text-amber-500 transition-colors pr-24">{store.name}</h3>
                                        
                                        {/* Removed the raw PII address hash display here to maintain data security */}
                                        
                                        <div className="mt-2 text-[10px] bg-espresso-950/50 self-start text-amber-500/90 px-2 py-1 flex items-center gap-1 rounded-md border border-espresso-800"><Coffee size={10} /> 바로가기</div>
                                    </div>
                                </motion.div>
                            </div>
                        );
                    })}

                    {validItems.length === 0 && (
                        <div className="pl-6 py-10 text-center opacity-70">
                            <Map className="mx-auto text-espresso-400 mb-2" size={24} />
                            <p className="text-[13px] text-espresso-300 font-bold">코스가 비어있습니다.</p>
                        </div>
                    )}
                    </div>
                </div>
            </div>
        </div>
    );
}
