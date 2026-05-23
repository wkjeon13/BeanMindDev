import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Map, ExternalLink, Clock, Info, CheckCircle2, Navigation, Heart, Star, Phone, Share, Bookmark, Image as ImageIcon, ChevronLeft, ChevronRight, Coffee, Globe, PlusCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { Geolocation } from '@capacitor/geolocation';
import L from 'leaflet';
import { Browser } from '@capacitor/browser';
import StoreReviewSection from './StoreReviewSection';
import StoreCoffeeTalkSection from './StoreCoffeeTalkSection';
import { API_BASE } from '../utils/apiConfig';
import GlobalAdBanner from './GlobalAdBanner';

const getFullImageUrl = (url: string | null | undefined) => {
    if (!url) return '';
    if (url.startsWith('/mock-bucket')) return 'https://images.unsplash.com/photo-1554118811-1e0d58224f24';
    if (url.startsWith('/') && !url.startsWith('//')) return `${API_BASE}${url}`;
    return url;
};

interface ShopDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    shop: any; // The shop data object
}

export default function ShopDetailModal({ isOpen, shop: propShop, currentUser, onClose, onRewardClick }: ShopDetailModalProps & { currentUser?: any, onRewardClick?: any }) {
    const { t, i18n } = useTranslation(['translation']);
    const navigate = useNavigate();

    // Support auto-hydration for partial shop records (e.g. from CoffeeTalk)
    const [fullShopData, setFullShopData] = useState<any>(null);
    const shop = fullShopData || propShop;

    useEffect(() => {
        setFullShopData(null);
    }, [propShop?.id]);

    const getFallbackTranslation = (text: string | undefined | null) => {
        if (!text) return text;
        if (text.includes('AI 큐레이터가 발굴한 스페셜티 추천 공간') || text.includes('Specialty space recommended by AI Curator')) return t('map.fallback_ai_subtitle');
        if (text.includes('AI가 발굴한 카페/명소입니다.') || text.includes('AI discovered cafe/attraction.')) return t('map.fallback_short_desc');
        if (text.includes('스페셜티/시그니처 향미') || text.includes('Specialty/Signature Flavor')) return t('map.fallback_specialty');
        if (text.includes('대표 메뉴 (상세 미정)') || text.includes('Signature Menu (TBD)')) return t('map.fallback_menu');
        if (text.includes('추천 정보 없음') || text.includes('No Recommendation Info')) return t('map.fallback_pairing');
        if (text.includes('임시 주소 (추후 업데이트 예정)') || text.includes('Temporary address (to be updated)')) return t('map.fallback_temp_addr');
        if (text.includes('추후 제공 (AI 발굴') || text.includes('TBD (AI discovered')) return t('map.fallback_tbd_hours');
        if (text.includes('추후 제공') || text.includes('TBD')) return t('map.fallback_tbd');
        if (text.startsWith('빈마인드 AI 시스템이 사용자들의 커피 성향 탐색 과정에서') || text.startsWith('This is a specialty shop discovered via web search')) return t('map.fallback_origin_story');
        return text;
    };

    const [activeTab, setActiveTab] = useState<'info' | 'reviews'>('info');
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
    const [viewerContext, setViewerContext] = useState<'gallery' | 'beverage' | 'dessert' | null>(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isFollowLoading, setIsFollowLoading] = useState(false);

    // Bookmark (Save) State
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [isBookmarkLoading, setIsBookmarkLoading] = useState(false);

    // Pilgrimage State
    const [isCheckinLoading, setIsCheckinLoading] = useState(false);
    const [isCoursePickerOpen, setIsCoursePickerOpen] = useState(false);
    const [myCourses, setMyCourses] = useState<any[]>([]);
    const [isAddingToCourse, setIsAddingToCourse] = useState(false);

    const handleOpenCoursePicker = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            alert(t('shop_detail.alert_login_required'));
            return;
        }
        setIsCoursePickerOpen(true);
        try {
            const res = await fetch(`${API_BASE}/api/users/collections`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setMyCourses(data.filter((c: any) => c.isPilgrimageCourse === true));
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleCreateCourse = async (name: string) => {
        const token = localStorage.getItem('token');
        if (!name.trim()) return;
        setIsAddingToCourse(true);
        try {
            const res = await fetch(`${API_BASE}/api/users/collections`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, isPilgrimageCourse: true })
            });
            if (res.ok) {
                const newCourse = await res.json();
                setMyCourses(prev => [newCourse, ...prev]);
                handleAddToCourse(newCourse.id);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsAddingToCourse(false);
        }
    };

    const handleAddToCourse = async (courseId: string) => {
        const token = localStorage.getItem('token');
        setIsAddingToCourse(true);
        try {
            const res = await fetch(`${API_BASE}/api/users/collections/${courseId}/items`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ storeId: shop.id })
            });
            if (res.ok) {
                alert(t('shop_detail.alert_course_added'));
                setIsCoursePickerOpen(false);
            } else {
                const err = await res.json();
                const errorMessage = err.error === 'ERR_ALREADY_IN_COLLECTION'
                    ? t('shop_detail.alert_already_in_course', '이미 코스에 포함된 매장입니다.')
                    : (err.error || t('shop_detail.error_course_add'));
                alert(errorMessage);
            }
        } catch (e) {
            console.error(e);
            alert(t('shop_detail.alert_error_occurred'));
        } finally {
            setIsAddingToCourse(false);
        }
    };

    // Reviews State
    const [reviews, setReviews] = useState<any[]>([]);

    // Derived Review Stats
    const reviewCount = reviews.length;
    const averageRating = React.useMemo(() => {
        if (reviewCount === 0) return 0;
        const sum = reviews.reduce((acc, rev) => acc + (rev.overall || 5), 0);
        return sum / reviewCount;
    }, [reviews]);

    const galleryMedia = React.useMemo(() => {
        if (!shop?.media) return [];
        return shop.media.filter((m: any) => m.type === 'IMAGE' || m.type === 'VIDEO').map((m: any) => ({ ...m, url: getFullImageUrl(m.url) }));
    }, [shop]);

    const parsedCoffeeMenuImages = React.useMemo(() => {
        if (!shop?.coffeeMenuImageUrl) return [];
        try {
            const parsed = JSON.parse(shop.coffeeMenuImageUrl);
            if (Array.isArray(parsed)) return parsed.map((url: string) => getFullImageUrl(url)) as string[];
        } catch (e) {
            return [getFullImageUrl(shop.coffeeMenuImageUrl)];
        }
        return [];
    }, [shop?.coffeeMenuImageUrl]);

    const parsedPopularMenuImages = React.useMemo(() => {
        if (!shop?.popularMenuImageUrl) return [];
        try {
            const parsed = JSON.parse(shop.popularMenuImageUrl);
            if (Array.isArray(parsed)) return parsed.map((url: string) => getFullImageUrl(url)) as string[];
        } catch (e) {
            return [getFullImageUrl(shop.popularMenuImageUrl)];
        }
        return [];
    }, [shop?.popularMenuImageUrl]);


    // Parse daily hours
    const parsedHours = React.useMemo(() => {
        if (!shop?.hours) return null;
        try {
            if (shop.hours.trim().startsWith('[')) {
                return JSON.parse(shop.hours);
            }
        } catch (e) {
            console.error("Failed to parse hours:", e);
        }
        return null;
    }, [shop?.hours]);

    const [isHoursExpanded, setIsHoursExpanded] = useState(false);
    
    const todayStatus = React.useMemo(() => {
        if (!parsedHours) return null;
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const now = new Date();
        const todayStr = days[now.getDay()];
        
        const todayHours = parsedHours.find((h: any) => h.day === todayStr);
        if (!todayHours) return null;
        
        if (todayHours.isClosed) {
            return { ...todayHours, isOpenNow: false, statusText: '휴무일' };
        }
        
        const [openHour, openMin] = todayHours.open.split(':').map(Number);
        const [closeHour, closeMin] = todayHours.close.split(':').map(Number);
        
        const currentMins = now.getHours() * 60 + now.getMinutes();
        const openMins = openHour * 60 + openMin;
        const closeMins = closeHour * 60 + closeMin;
        
        const isOpenNow = currentMins >= openMins && currentMins <= closeMins;
        return { ...todayHours, isOpenNow, statusText: isOpenNow ? '영업 중' : '영업 종료' };
    }, [parsedHours]);

    const currentViewerImages = React.useMemo(() => {
        if (viewerContext === 'gallery') return galleryMedia;
        if (viewerContext === 'beverage') return parsedCoffeeMenuImages.map(url => ({ type: 'IMAGE', url, isMenu: true }));
        if (viewerContext === 'dessert') return parsedPopularMenuImages.map(url => ({ type: 'IMAGE', url, isMenu: true }));
        return [];
    }, [viewerContext, galleryMedia, parsedCoffeeMenuImages, parsedPopularMenuImages]);

    const fetchReviews = React.useCallback(async () => {
        if (!isOpen || !shop?.id) return;
        try {
            const res = await fetch(`${API_BASE}/api/shops/${shop.id}/reviews`);
            if (res.ok) {
                const data = await res.json();
                setReviews(data);
            }
        } catch (error) {
            console.error(error);
        }
    }, [isOpen, shop?.id]);

    const fetchFollowStatus = React.useCallback(async () => {
        if (!isOpen || !shop?.id) return;
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/api/shops/${shop.id}/follow-status`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setIsFollowing(data.isFollowing);
            }
        } catch (error) {
            console.error("Failed to fetch follow status", error);
        }
    }, [isOpen, shop?.id]);

    const fetchBookmarkStatus = React.useCallback(async () => {
        if (!isOpen || !shop?.id) return;
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/api/users/bookmarks`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const bookmarks = await res.json();
                const isSaved = bookmarks.some((b: any) => b.storeId === shop.id);
                setIsBookmarked(isSaved);
            }
        } catch (error) {
            console.error("Failed to fetch bookmarks", error);
        }
    }, [isOpen, shop?.id]);

    useEffect(() => {
        fetchFollowStatus();
        fetchBookmarkStatus();
        fetchReviews();
        
        // Fetch full hydrated data and trigger view increment backend
        if (isOpen && propShop?.id) {
            const token = localStorage.getItem('token');
            const headers: any = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;
            fetch(`${API_BASE}/api/shops/${propShop.id}`, { headers })
                .then(res => res.json())
                .then(data => {
                    if (data && data.id) setFullShopData(data);
                })
                .catch(e => console.error(e));
        }
    }, [fetchFollowStatus, fetchBookmarkStatus, fetchReviews, isOpen, propShop?.id]);

    const handleToggleFollow = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            alert(t('shop_detail.alert_follow_login', '단골 맺기 기능은 로그인이 필요합니다.'));
            return;
        }
        setIsFollowLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/shops/${shop.id}/follow`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setIsFollowing(data.isFollowing);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsFollowLoading(false);
        }
    };

    const handleToggleBookmark = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            alert(t('shop_detail.alert_save_login', '저장 기능은 로그인이 필요합니다.'));
            return;
        }
        setIsBookmarkLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/users/bookmarks/${shop.id}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setIsBookmarked(data.isBookmarked);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsBookmarkLoading(false);
        }
    };

    const handleShare = async () => {
        const shareData = {
            title: shop.name,
            text: shop.shortDesc || shop.address,
            url: window.location.href, // Or construct a specific share link
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(`${shop.name}\n${window.location.href}`);
                alert(t('shop_detail.alert_copy_link', '가게 링크가 클립보드에 복사되었습니다.'));
            }
        } catch (err) {
            console.error('Error sharing:', err);
        }
    };

    const handleReport = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            alert(t('shop_detail.alert_report_login', '신고 기능은 로그인이 필요합니다.'));
            return;
        }

        const reason = window.prompt(t('shop_detail.prompt_report', '[{{name}}]\n위 매장을 신고하시는 사유를 간단히 입력해주세요.\n(예: 폐업함, 잘못된 장소 정보 등)', {name: shop.name}));
        if (!reason || reason.trim() === '') return;

        if (window.confirm(t('shop_detail.confirm_report', `'{{name}}' 매장을 관리자에게 신고하시겠습니까?`, {name: shop.name}))) {
            try {
                const res = await fetch(`${API_BASE}/api/users/report`, {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        targetId: shop.id,
                        targetType: 'STORE',
                        reason: reason.trim()
                    })
                });

                if (res.ok) {
                    alert(t('shop_detail.alert_report_ok', '정상적으로 신고가 접수되었습니다.'));
                } else {
                     alert(t('shop_detail.alert_report_fail', '신고 접수에 실패했습니다.'));
                }
            } catch (err) {
                 console.error(err);
                 alert(t('shop_detail.alert_error', '오류가 발생했습니다.'));
            }
        }
    };

    const handlePilgrimageCheckIn = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            if (window.confirm(t('shop_detail.confirm_login_pilgrimage', '성지순례 인증은 로그인이 필요합니다. 로그인/회원가입 페이지로 이동하시겠습니까?'))) {
                onClose && onClose();
                navigate('/profile');
            }
            return;
        }

        if (shop.isCheckedIn) {
            alert(t('shop_detail.alert_already_stamped'));
            return;
        }

        setIsCheckinLoading(true);
        try {
            // Re-fetch current position securely
            let position;
            try {
                try {
                    // Try high accuracy with timeout
                    position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 5000 });
                } catch (highAccErr) {
                    console.warn("High accuracy GPS failed, falling back to low accuracy", highAccErr);
                    // Fallback to low accuracy
                    position = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10000 });
                }
            } catch (gpsError) {
                console.error("GPS Error:", gpsError);
                throw new Error(t("shop_detail.error_gps"));
            }

            const res = await fetch(`${API_BASE}/api/users/checkin`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    storeId: shop.id,
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                })
            });

            const data = await res.json();
            if (res.ok) {
                // Update local state temporarily so the UI updates
                if (fullShopData) {
                    setFullShopData({ ...fullShopData, isCheckedIn: true });
                } else {
                    shop.isCheckedIn = true;
                }
                alert(t('shop_detail.alert_stamp_success'));
            } else {
                const errorKey = data.error?.startsWith('ERR_') ? `api_error.${data.error}` : null;
                alert(errorKey ? t(errorKey, data.error) : (data.error || t('shop_detail.error_stamp')));
            }
        } catch (error: any) {
            console.error(error);
            const errorKey = error.message?.startsWith('ERR_') ? `api_error.${error.message}` : null;
            alert(errorKey ? t(errorKey, error.message) : (error.message || t('shop_detail.alert_error_occurred')));
        } finally {
            setIsCheckinLoading(false);
        }
    };

    // Prevent background scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto'; // or ''
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isOpen]);

    if (!shop) return null;

    // Dynamic fallback matching the feed cards
    const fallbackMedia = shop.media?.find((m: any) => m.type === 'IMAGE');
    const fallbackSrc = fallbackMedia ? fallbackMedia.url : 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80&w=800';
    let heroImage = shop.mainImageUrl || fallbackSrc;
    if (heroImage?.startsWith('/mock-bucket')) heroImage = 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80&w=800';

    const handleDirections = () => {
        // Construct a generic map URL or specific one if we want
        // For now, use the same search URL logic as the map popup
        const query = encodeURIComponent(`${shop.name} ${shop.address || ''}`);
        window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    };

    // Extract a valid URL if user typed prefixes like "홈페이지 http://..."
    let validUrl = '';
    if (shop.websiteUrl && typeof shop.websiteUrl === 'string') {
        const str = shop.websiteUrl.replace(/['"\u200B-\u200D\uFEFF]/g, '').trim();
        const httpMatch = str.match(/https?:\/\/[^\s]+/);
        if (httpMatch) {
            validUrl = httpMatch[0];
        } else {
            const wwwMatch = str.match(/(www\.[^\s]+)/);
            if (wwwMatch) {
                validUrl = `https://${wwwMatch[0]}`;
            } else if (!str.toLowerCase().includes('null') && !str.toLowerCase().includes('undefined') && str.includes('.')) {
                // Heuristic: if it looks somewhat like a domain
                const words = str.split(' ');
                const possibleDomain = words.find(w => w.includes('.'));
                if (possibleDomain) validUrl = `https://${possibleDomain}`;
            }
        }
    }
    const hasRealWebsite = !!validUrl;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-espresso-950/60 backdrop-blur-sm z-[150]"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                    />

                    {/* Bottom Sheet Modal Wrapper */}
                    <div className="fixed inset-0 z-[160] flex flex-col items-center justify-end pointer-events-none sm:p-4">
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 28, stiffness: 250 }}
                            className="bg-espresso-950 rounded-t-[2rem] sm:rounded-[1.5rem] overflow-hidden flex flex-col shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)] pointer-events-auto relative w-full sm:max-w-[480px] h-[88vh] sm:h-[80vh] border-t sm:border border-espresso-800"
                        >
                            {/* Unified Top Actions (Close & Follow) */}
                            <div className="absolute top-0 left-0 w-full p-4 flex justify-end gap-2 items-center z-20 pointer-events-none">
                                <button
                                    onClick={handleToggleFollow}
                                    disabled={isFollowLoading}
                                    className={`pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-full backdrop-blur-md border transition-all shadow-sm ${isFollowing ? 'bg-espresso-900/95 text-rose-500 border-espresso-700/500' : 'bg-espresso-950/30 text-espresso-50 border-white/20 hover:bg-espresso-950/50'}`}
                                    style={{ WebkitTapHighlightColor: 'transparent' }}
                                >
                                    <Coffee size={16} fill={isFollowing ? "currentColor" : "none"} />
                                    <span className="font-bold text-[13px]">{isFollowing ? t('shop_detail.btn_following', '단골 매장') : t('shop_detail.btn_follow', '단골 맺기')}</span>
                                </button>
                                <button onClick={onClose} className="pointer-events-auto p-2.5 bg-espresso-950/30 border border-white/20 backdrop-blur-md rounded-full text-espresso-50 hover:bg-espresso-950/50 transition-colors shadow-sm" style={{ WebkitTapHighlightColor: 'transparent' }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="overflow-y-auto hide-scrollbar flex-1 relative bg-[#111114] pb-safe-bottom">

                                {/* Refined Hero Image with Gradient Overlay & Text */}
                                <div className="w-full h-[380px] relative bg-espresso-800 shrink-0">
                                    {(typeof heroImage === 'string' && (heroImage.toLowerCase().endsWith('.mp4') || heroImage.toLowerCase().endsWith('.mov') || heroImage.toLowerCase().endsWith('.webm'))) ? (
                                        <video src={getFullImageUrl(heroImage)} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
                                    ) : (
                                        <img src={typeof heroImage === 'string' ? getFullImageUrl(heroImage) : undefined} alt={shop.name} className="w-full h-full object-cover" />
                                    )}
                                    <div className="absolute inset-x-0 bottom-0 pt-32 pb-6 px-6 bg-gradient-to-t from-[#111114] via-[#111114]/80 to-transparent flex flex-col justify-end pointer-events-none">
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {shop.primaryCoffeeType === 'SINGLE_ORIGIN' && <span className="px-2 py-1 bg-amber-500/20 text-amber-500 border border-amber-500/20 text-[10px] font-bold uppercase tracking-widest rounded-sm backdrop-blur-sm pointer-events-auto">Single Origin</span>}
                                            {shop.primaryCoffeeType === 'BLENDED' && <span className="px-2 py-1 bg-amber-500/20 text-amber-500 border border-amber-500/20 text-[10px] font-bold uppercase tracking-widest rounded-sm backdrop-blur-sm pointer-events-auto">House Blend</span>}
                                            {shop.primaryCoffeeType === 'SPECIALTY_ROASTERY' && <span className="px-2 py-1 bg-amber-500/20 text-amber-500 border border-amber-500/20 text-[10px] font-bold uppercase tracking-widest rounded-sm backdrop-blur-sm pointer-events-auto">Specialty</span>}
                                            {shop.matchRate != null && shop.matchRate > 0 && <span className="px-2 py-1 bg-[#111114]/80 text-[#FFD570] border border-white/10 text-[10px] font-bold uppercase tracking-widest rounded-sm backdrop-blur-sm pointer-events-auto">{shop.matchRate}% Match</span>}
                                        </div>
                                        <h2 className="text-[32px] sm:text-[36px] font-bold font-sans text-white tracking-tight leading-[1.1] mb-2 pointer-events-auto">{shop.name}</h2>
                                        {shop.shortDesc && <p className="text-espresso-200 font-medium text-[14px] leading-snug line-clamp-2 pointer-events-auto">{getFallbackTranslation(shop.shortDesc)}</p>}
                                    </div>
                                </div>

                                <div className="px-6 py-6 pb-20 flex flex-col gap-8 pointer-events-auto">
                                    
                                    {/* Action Bar (Compact & Modern) */}
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 bg-white/5 border border-white/5 px-4 py-2.5 rounded-[1rem] backdrop-blur-sm">
                                            <div className="flex items-center gap-1.5">
                                                <Star fill="#f59e0b" className="text-amber-500 w-[18px] h-[18px]" />
                                                <span className="font-bold text-[16px] text-white">{reviewCount > 0 ? averageRating.toFixed(1) : '-'}</span>
                                            </div>
                                            <div className="w-[1px] h-4 bg-white/10" />
                                            <div className="flex items-center gap-1.5 text-espresso-200">
                                                <Navigation size={16} className="text-amber-500/70" />
                                                <span className="font-bold text-[14px]">{shop.distance !== undefined ? (shop.distance < 1 ? `${(shop.distance * 1000).toFixed(0)}m` : `${shop.distance.toFixed(1)}km`) : t('shop_detail.no_distance_info')}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                            {shop.phone && <a href={`tel:${shop.phone}`} className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full transition-all text-espresso-200 hover:text-white" style={{ WebkitTapHighlightColor: 'transparent' }}><Phone size={18} /></a>}
                                            <button onClick={handleShare} className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full transition-all text-espresso-200 hover:text-white" style={{ WebkitTapHighlightColor: 'transparent' }}><Share size={18} /></button>
                                            <button onClick={handleToggleBookmark} disabled={isBookmarkLoading} className={`p-3 border rounded-full transition-all ${isBookmarked ? 'bg-amber-500/20 border-amber-500/30 text-amber-500' : 'bg-white/5 hover:bg-white/10 border-white/5 text-espresso-200 hover:text-white'}`} style={{ WebkitTapHighlightColor: 'transparent' }}><Bookmark size={18} fill={isBookmarked ? "currentColor" : "none"} /></button>
                                        </div>
                                    </div>

                                    {/* Core Info - Static Grid */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="col-span-2 bg-white/5 border border-white/5 rounded-[1.25rem] p-4 flex items-start gap-3">
                                            <MapPin size={18} className="text-amber-500 shrink-0 mt-0.5" />
                                            <p className="text-white text-[13px] font-medium leading-relaxed break-keep">{getFallbackTranslation(shop.address)}</p>
                                        </div>
                                        {shop.hours && (
                                        <div className={hasRealWebsite && validUrl ? "col-span-1 bg-white/5 border border-white/5 rounded-[1.25rem] p-4 flex flex-col justify-center gap-3" : "col-span-2 bg-white/5 border border-white/5 rounded-[1.25rem] p-4 flex flex-col justify-center gap-3"}>
                                            <div className="flex items-center justify-between cursor-pointer w-full" onClick={() => parsedHours && setIsHoursExpanded(!isHoursExpanded)}>
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <Clock size={18} className="text-amber-500 shrink-0" />
                                                    {parsedHours && todayStatus ? (
                                                        <div className="flex flex-col min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-[12px] font-bold ${todayStatus.isOpenNow ? 'text-green-400' : 'text-red-400'} shrink-0`}>{todayStatus.statusText}</span>
                                                                <span className="text-white text-[13px] font-medium truncate">
                                                                    {todayStatus.isClosed ? '오늘 휴무' : `${todayStatus.open} - ${todayStatus.close}`}
                                                                    {todayStatus.comment && <span className="ml-1.5 text-amber-500/80 text-[12px]">({todayStatus.comment})</span>}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="text-white text-[13px] font-medium line-clamp-1 flex-1" title={shop.hours}>{getFallbackTranslation(shop.hours)}</p>
                                                    )}
                                                </div>
                                                {parsedHours && (
                                                    <div className="text-espresso-300 shrink-0 ml-2">
                                                        {isHoursExpanded ? <ChevronLeft size={16} className="-rotate-90" /> : <ChevronRight size={16} className="rotate-90" />}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Expanded Hours */}
                                            {parsedHours && isHoursExpanded && (
                                                <div className="pt-3 border-t border-white/10 space-y-2 mt-1 w-full">
                                                    {parsedHours.map((h: any, idx: number) => {
                                                        const isToday = h.day === ['일', '월', '화', '수', '목', '금', '토'][new Date().getDay()];
                                                        return (
                                                            <div key={idx} className={`flex flex-col gap-0.5 text-[13px] ${isToday ? 'font-bold text-amber-500' : 'text-espresso-200'}`}>
                                                                <div className="flex items-center justify-between">
                                                                    <span className="w-8 shrink-0">{h.day}</span>
                                                                    <span>{h.isClosed ? '휴무일' : `${h.open} - ${h.close}`}</span>
                                                                </div>
                                                                {h.comment && (
                                                                    <div className="text-right text-amber-500/80 text-[11px] break-words whitespace-normal leading-tight ml-8">
                                                                        ({h.comment})
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                        )}
                                        {hasRealWebsite && validUrl && (
                                        <a href={validUrl.startsWith('http') ? validUrl : `https://${validUrl}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className={`${hasRealWebsite && validUrl && shop.hours ? "col-span-1" : "col-span-2"} bg-white/5 border border-white/5 rounded-[1.25rem] p-4 flex items-center gap-3 hover:bg-white/10 transition-colors`}>
                                            <ExternalLink size={18} className="text-amber-500 shrink-0" />
                                            <p className="text-amber-500 underline text-[13px] font-medium truncate flex-1">{t('shop_detail.lbl_website_sns', '웹사이트 / SNS')}</p>
                                        </a>
                                        )}
                                    </div>
                                    {/* Action Buttons */}
                                    <div className="flex gap-3 px-6 py-6 border-y border-white/20 -mx-6 mt-4 mb-2">
                                        {shop.isCheckedIn ? (
                                            <button onClick={() => { onClose(); navigate('/community', { state: { composePilgrimageLedger: true, targetShopId: shop.id, targetShopName: shop.name, targetShopAddress: shop.address, targetShopLat: shop.lat, targetShopLng: shop.lng } }); }} className="flex-1 bg-amber-500/10 border border-amber-500/30 rounded-2xl py-3.5 flex items-center justify-center gap-2 hover:bg-amber-500/20 transition-all active:scale-[0.98]">
                                                <CheckCircle2 className="text-amber-500" size={18} />
                                                <span className="text-amber-500 font-bold text-[14px]">인증완료 / 방명록</span>
                                            </button>
                                        ) : (
                                            <button onClick={handlePilgrimageCheckIn} disabled={isCheckinLoading} className="flex-1 bg-amber-500 hover:bg-amber-400 text-[#111114] rounded-2xl py-3.5 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50">
                                                {isCheckinLoading ? <div className="w-5 h-5 border-2 border-[#111114] border-t-transparent rounded-full animate-spin"></div> : <><Navigation size={18} /><span className="font-bold text-[14px]">{t('shop_detail.btn_stamp', '도장 찍기')}</span></>}
                                            </button>
                                        )}
                                        <button onClick={handleOpenCoursePicker} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-[14px] rounded-2xl px-6 py-3.5 transition-all active:scale-[0.98] flex flex-col items-center justify-center">
                                            <PlusCircle size={18} className="mb-0.5 text-espresso-300" />
                                            <span className="text-[10px] text-espresso-300">{t('shop_detail.btn_add_course', '성지 코스 추가')}</span>
                                        </button>
                                    </div>

                                    {/* Store Top Ad Banner Injection */}
                                    <GlobalAdBanner placement="STORE_TOP" className="w-full" />

                                    {/* Coffee Profile (Editorial) - Horizontal Slider */}
                                    {(shop.signatureBean || shop.beanOrigin || shop.beanNotes || shop.acidity !== undefined) && (
                                        <div className="pt-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-xl font-bold font-sans text-white">Tasting Profile</h3>
                                                <span className="text-[11px] font-bold text-espresso-400 tracking-widest uppercase">Editorial</span>
                                            </div>
                                            <div className="flex overflow-x-auto hide-scrollbar gap-4 -mx-6 px-6 pb-4 snap-x snap-mandatory">
                                                {shop.signatureBean && (
                                                    <div className="flex-none w-[260px] snap-center bg-white/5 border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
                                                        <span className="block text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-3">{t('shop_detail.lbl_signature_bean', 'Signature Bean')}</span>
                                                        <p className="text-white font-serif font-black text-[22px] leading-tight break-keep">{getFallbackTranslation(shop.signatureBean)}</p>
                                                    </div>
                                                )}
                                                {shop.beanOrigin && (
                                                    <div className="flex-none w-[180px] snap-center bg-white/5 border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
                                                        <span className="block text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-3">Origin</span>
                                                        <p className="text-white font-medium text-[15px] leading-relaxed break-keep">{shop.beanOrigin}</p>
                                                    </div>
                                                )}
                                                {shop.beanRoastLevel && (
                                                    <div className="flex-none w-[160px] snap-center bg-white/5 border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
                                                        <span className="block text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-3">Roast Level</span>
                                                        <p className="text-white font-medium text-[15px] leading-relaxed break-keep">{shop.beanRoastLevel}</p>
                                                    </div>
                                                )}
                                                {shop.beanNotes && (
                                                    <div className="flex-none w-[280px] snap-center bg-white/5 border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
                                                        <span className="block text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-3">Tasting Notes</span>
                                                        <p className="text-white font-medium text-[15px] leading-relaxed break-keep">
                                                            {shop.beanNotes.split(',').map((n: string) => n.trim()).join('  •  ')}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Enhanced Taste Levels - Mini Chart */}
                                            {(shop.acidity !== undefined || shop.sweetness !== undefined || shop.bitterness !== undefined || shop.body !== undefined) && (
                                                <div className="mt-4 bg-[#1a1a1e] border border-white/5 rounded-2xl p-5">
                                                    <div className="text-[11px] uppercase font-bold tracking-widest text-[#D4BBA5] mb-5">Taste Balance</div>
                                                    <div className="space-y-4">
                                                        {[
                                                            { label: 'Acidity', value: shop.acidity || 0 },
                                                            { label: 'Sweetness', value: shop.sweetness || 0 },
                                                            { label: 'Bitterness', value: shop.bitterness || 0 },
                                                            { label: 'Body', value: shop.body || 0 }
                                                        ].filter(t => t.value > 0).map(taste => {
                                                            const TASTE_MAP: Record<string, { kr: string, color: string }> = {
                                                                'Acidity': { kr: t('shop_detail.lbl_acidity'), color: '#FFB000' },
                                                                'Sweetness': { kr: t('shop_detail.lbl_sweetness'), color: '#FF6B81' },
                                                                'Bitterness': { kr: t('shop_detail.lbl_bitterness'), color: '#A3A398' },
                                                                'Body': { kr: t('shop_detail.lbl_body'), color: '#E57A00' }
                                                            };
                                                            const info = TASTE_MAP[taste.label];
                                                            return (
                                                                <div key={taste.label} className="flex justify-between items-center group">
                                                                    <span className="font-medium text-espresso-200 text-[13px] w-16 shrink-0">{info.kr}</span>
                                                                    <div className="flex flex-1 justify-center gap-1.5 px-4">
                                                                        {Array(5).fill(0).map((_, i) => {
                                                                            let bgStyle: any = { backgroundColor: '#33332D' };
                                                                            if (taste.value >= i + 1) {
                                                                                bgStyle = { backgroundColor: info.color };
                                                                            } else if (taste.value > i) {
                                                                                const percentage = (taste.value - i) * 100;
                                                                                bgStyle = { background: `linear-gradient(to right, ${info.color} ${percentage}%, #33332D ${percentage}%)` };
                                                                            }
                                                                            return (
                                                                                <div 
                                                                                    key={i} 
                                                                                    className="h-1.5 w-full rounded-full transition-all duration-300 opacity-80 group-hover:opacity-100"
                                                                                    style={bgStyle}
                                                                                />
                                                                            );
                                                                        })}
                                                                    </div>
                                                                    <span className="font-bold text-white text-[13px] w-6 shrink-0 text-right">{taste.value}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Pairings & Details (Text Only, No Bloated Cards) */}
                                    {/* Pairings & Curations */}
                                    {(shop.equipment || shop.signatureMenu || shop.dessertPairing) && (
                                        <div className="pt-8 border-t border-white/20 -mx-6 px-6 mt-8">
                                            <h4 className="text-[11px] font-bold text-espresso-400 tracking-widest uppercase mb-4">Curations</h4>
                                            <div className="flex overflow-x-auto hide-scrollbar gap-4 -mx-6 px-6 pb-2 snap-x snap-mandatory">
                                                {shop.signatureMenu && (
                                                    <div className="flex-none w-[220px] snap-center bg-[#1a1a1e] border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
                                                        <span className="block text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-3">{t('shop_detail.lbl_signature_menu', 'Signature Menu')}</span>
                                                        <p className="text-white font-serif font-black text-[20px] leading-snug break-keep">{getFallbackTranslation(shop.signatureMenu)}</p>
                                                    </div>
                                                )}
                                                {shop.dessertPairing && (
                                                    <div className="flex-none w-[220px] snap-center bg-[#1a1a1e] border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
                                                        <span className="block text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-3">{t('shop_detail.lbl_perfect_pairing', 'Perfect Pairing')}</span>
                                                        <p className="text-white font-medium text-[15px] leading-relaxed break-keep">{getFallbackTranslation(shop.dessertPairing)}</p>
                                                    </div>
                                                )}
                                                {shop.equipment && (
                                                    <div className="flex-none w-[220px] snap-center bg-[#1a1a1e] border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
                                                        <span className="block text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-3">Equipment</span>
                                                        <p className="text-white font-medium text-[15px] leading-relaxed break-keep">{shop.equipment}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Amenities / Tags */}
                                    {(shop.hasDecaf || shop.hasOatMilk || shop.hasParking || shop.hasWifi || shop.hasPowerOutlets || shop.hasPetFriendly) && (
                                        <div className="pt-8 border-t border-white/20 -mx-6 px-6 mt-8">
                                            <div className="flex flex-wrap gap-2">
                                                {shop.hasDecaf && <span className="px-3 py-1.5 bg-[#1a1a1e] text-espresso-200 border border-white/5 text-[12px] font-medium rounded-full flex items-center gap-1.5"><CheckCircle2 size={12} className="text-amber-500"/> Decaf</span>}
                                                {shop.hasOatMilk && <span className="px-3 py-1.5 bg-[#1a1a1e] text-espresso-200 border border-white/5 text-[12px] font-medium rounded-full flex items-center gap-1.5"><CheckCircle2 size={12} className="text-amber-500"/> Oat Milk</span>}
                                                {shop.hasParking && <span className="px-3 py-1.5 bg-[#1a1a1e] text-espresso-200 border border-white/5 text-[12px] font-medium rounded-full">Auto Parking</span>}
                                                {shop.hasWifi && <span className="px-3 py-1.5 bg-[#1a1a1e] text-espresso-200 border border-white/5 text-[12px] font-medium rounded-full">Free Wi-Fi</span>}
                                                {shop.hasPowerOutlets && <span className="px-3 py-1.5 bg-[#1a1a1e] text-espresso-200 border border-white/5 text-[12px] font-medium rounded-full">Power Outlets</span>}
                                                {shop.hasPetFriendly && <span className="px-3 py-1.5 bg-[#1a1a1e] text-espresso-200 border border-white/5 text-[12px] font-medium rounded-full">Pet Friendly</span>}
                                            </div>
                                        </div>
                                    )}

                                    {/* Menu Images - Horizontal Scroll Mode */}
                                    {(parsedCoffeeMenuImages.length > 0 || parsedPopularMenuImages.length > 0) && (
                                        <div className="pt-8 border-t border-white/20 -mx-6 px-6 mt-8">
                                            <h4 className="text-xl font-bold font-sans text-white mb-4">Menu</h4>
                                            <div className="flex overflow-x-auto hide-scrollbar gap-4 -mx-6 px-6 pb-2 snap-x snap-mandatory">
                                                {parsedCoffeeMenuImages.length > 0 && (
                                                    <div className="flex-none w-[160px] snap-center cursor-pointer group" onClick={() => { setViewerContext('beverage'); setSelectedImageIndex(0); }}>
                                                        <div className="aspect-[3/4] bg-espresso-800 rounded-2xl overflow-hidden mb-3 relative">
                                                            <img src={parsedCoffeeMenuImages[0]} alt="Coffee Menu" className="w-full h-full object-cover group-active:scale-105 transition-transform" />
                                                            {parsedCoffeeMenuImages.length > 1 && (
                                                                <div className="absolute bottom-2 right-2 bg-espresso-950/60 backdrop-blur-md px-2 py-0.5 rounded-full text-espresso-50 text-[10px] font-bold border border-white/10">
                                                                    +{parsedCoffeeMenuImages.length - 1}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className="text-[12px] font-bold text-white tracking-wide">Beverages</span>
                                                    </div>
                                                )}
                                                {parsedPopularMenuImages.length > 0 && (
                                                    <div className="flex-none w-[160px] snap-center cursor-pointer group" onClick={() => { setViewerContext('dessert'); setSelectedImageIndex(0); }}>
                                                        <div className="aspect-[3/4] bg-espresso-800 rounded-2xl overflow-hidden mb-3 relative">
                                                            <img src={parsedPopularMenuImages[0]} alt="Popular Menu" className="w-full h-full object-cover group-active:scale-105 transition-transform" />
                                                            {parsedPopularMenuImages.length > 1 && (
                                                                <div className="absolute bottom-2 right-2 bg-espresso-950/60 backdrop-blur-md px-2 py-0.5 rounded-full text-espresso-50 text-[10px] font-bold border border-white/10">
                                                                    +{parsedPopularMenuImages.length - 1}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className="text-[12px] font-bold text-white tracking-wide">Desserts</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Detailed Menu Items */}
                                    {shop.menuItems && shop.menuItems.length > 0 && (
                                        <div className="pt-8 border-t border-white/20 -mx-6 px-6 mt-8">
                                            <h4 className="text-xl font-bold font-sans text-white mb-4">Detail Menu</h4>
                                            <div className="space-y-4">
                                                {shop.menuItems.map((item: any) => (
                                                    <div key={item.id} className="flex gap-4 items-center bg-[#1a1a1e] rounded-2xl p-3 border border-white/5">
                                                        <div className="w-[84px] h-[84px] shrink-0 bg-espresso-900 rounded-xl overflow-hidden shadow-md">
                                                            {item.imageUrl ? (
                                                                <img src={getFullImageUrl(item.imageUrl)} alt={item.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-espresso-600"><Coffee size={24} /></div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 flex flex-col justify-center min-w-0 pr-2">
                                                            <div className="flex items-center justify-between gap-3 mb-1.5">
                                                                <h5 className="font-bold text-[15px] text-white truncate">{item.name}</h5>
                                                                <span className="font-bold text-[14px] text-amber-400 shrink-0">{item.price}</span>
                                                            </div>
                                                            {item.description && <p className="text-[12px] text-espresso-200 line-clamp-2 leading-relaxed mb-2">{item.description}</p>}
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-bold tracking-widest text-[#D4BBA5] px-2 py-0.5 rounded-full border border-[#D4BBA5]/30">{item.category}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Gallery */}
                                    {galleryMedia.length > 0 && (
                                        <div className="pt-8 border-t border-white/20 -mx-6 px-6 mt-8">
                                            <h4 className="text-xl font-bold font-sans text-white mb-4">Gallery</h4>
                                            
                                            {(() => {
                                                const mediaItems = galleryMedia;
                                                const count = mediaItems.length;

                                                if (count === 1) {
                                                    return (
                                                        <div className="w-full aspect-video bg-espresso-800 rounded-2xl overflow-hidden relative cursor-pointer group" onClick={() => { setViewerContext('gallery'); setSelectedImageIndex(0); }}>
                                                            {mediaItems[0].type === 'VIDEO' ? (
                                                                <video src={mediaItems[0].url} className="w-full h-full object-cover group-active:scale-105 transition-transform" />
                                                            ) : (
                                                                <img src={mediaItems[0].url.startsWith('/mock-bucket') ? `https://images.unsplash.com/photo-1554118811-1e0d58224f24` : mediaItems[0].url} alt={t('shop_detail.alt_gallery', '{{name}} 갤러리', {name: shop.name})} className="w-full h-full object-cover group-active:scale-105 transition-transform" />
                                                            )}
                                                            {mediaItems[0].type === 'VIDEO' && (
                                                                <div className="absolute inset-0 flex items-center justify-center bg-espresso-950/20">
                                                                    <div className="w-12 h-12 flex items-center justify-center rounded-full bg-espresso-900/30 backdrop-blur-md">
                                                                        <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-white border-b-[8px] border-b-transparent ml-1" />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                }

                                                if (count === 2) {
                                                    return (
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {mediaItems.map((item: any, idx: number) => (
                                                                <div key={idx} className="aspect-square bg-espresso-800 rounded-2xl overflow-hidden relative cursor-pointer group" onClick={() => { setViewerContext('gallery'); setSelectedImageIndex(idx); }}>
                                                                    {item.type === 'VIDEO' ? (
                                                                        <video src={item.url} className="w-full h-full object-cover group-active:scale-105 transition-transform" />
                                                                    ) : (
                                                                        <img src={item.url.startsWith('/mock-bucket') ? `https://images.unsplash.com/photo-${1554118811 + idx}-1e0d58224f24` : item.url} alt={t('shop_detail.alt_gallery', '{{name}} 갤러리', {name: shop.name})} className="w-full h-full object-cover group-active:scale-105 transition-transform" />
                                                                    )}
                                                                    {item.type === 'VIDEO' && (
                                                                        <div className="absolute inset-0 flex items-center justify-center bg-espresso-950/20">
                                                                            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-espresso-900/30 backdrop-blur-md">
                                                                                <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1" />
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                }

                                                // 3 or more items
                                                return (
                                                    <div className="grid grid-cols-3 grid-rows-2 gap-2 h-[240px]">
                                                        {/* Left Big Item */}
                                                        <div className="col-span-2 row-span-2 bg-espresso-800 rounded-2xl overflow-hidden relative cursor-pointer group" onClick={() => { setViewerContext('gallery'); setSelectedImageIndex(0); }}>
                                                            {mediaItems[0].type === 'VIDEO' ? (
                                                                <video src={mediaItems[0].url} className="w-full h-full object-cover group-active:scale-105 transition-transform" />
                                                            ) : (
                                                                <img src={mediaItems[0].url.startsWith('/mock-bucket') ? `https://images.unsplash.com/photo-1554118811-1e0d58224f24` : mediaItems[0].url} alt={t('shop_detail.alt_main', '{{name}} 메인 사진', {name: shop.name})} className="w-full h-full object-cover group-active:scale-105 transition-transform" />
                                                            )}
                                                            {mediaItems[0].type === 'VIDEO' && (
                                                                <div className="absolute inset-0 flex items-center justify-center bg-espresso-950/20">
                                                                    <div className="w-12 h-12 flex items-center justify-center rounded-full bg-espresso-900/30 backdrop-blur-md">
                                                                        <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-white border-b-[8px] border-b-transparent ml-1" />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Top Right Small Item */}
                                                        <div className="col-span-1 row-span-1 bg-espresso-800 rounded-2xl overflow-hidden relative cursor-pointer group" onClick={() => { setViewerContext('gallery'); setSelectedImageIndex(1); }}>
                                                            {mediaItems[1].type === 'VIDEO' ? (
                                                                <video src={mediaItems[1].url} className="w-full h-full object-cover group-active:scale-105 transition-transform" />
                                                            ) : (
                                                                <img src={mediaItems[1].url.startsWith('/mock-bucket') ? `https://images.unsplash.com/photo-1554118812-1e0d58224f24` : mediaItems[1].url} alt={t('shop_detail.alt_pic2', '{{name}} 사진 2', {name: shop.name})} className="w-full h-full object-cover group-active:scale-105 transition-transform" />
                                                            )}
                                                            {mediaItems[1].type === 'VIDEO' && (
                                                                <div className="absolute inset-0 flex items-center justify-center bg-espresso-950/20">
                                                                    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-espresso-900/30 backdrop-blur-md">
                                                                        <div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-l-white border-b-[5px] border-b-transparent ml-1" />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Bottom Right Small Item */}
                                                        <div className="col-span-1 row-span-1 bg-espresso-800 rounded-2xl overflow-hidden relative cursor-pointer group" onClick={() => { setViewerContext('gallery'); setSelectedImageIndex(2); }}>
                                                            {mediaItems[2].type === 'VIDEO' ? (
                                                                <video src={mediaItems[2].url} className="w-full h-full object-cover group-active:scale-105 transition-transform" />
                                                            ) : (
                                                                <img src={mediaItems[2].url.startsWith('/mock-bucket') ? `https://images.unsplash.com/photo-1554118813-1e0d58224f24` : mediaItems[2].url} alt={t('shop_detail.alt_pic3', '{{name}} 사진 3', {name: shop.name})} className="w-full h-full object-cover group-active:scale-105 transition-transform" />
                                                            )}
                                                            {mediaItems[2].type === 'VIDEO' && count <= 3 && (
                                                                <div className="absolute inset-0 flex items-center justify-center bg-espresso-950/20">
                                                                    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-espresso-900/30 backdrop-blur-md">
                                                                        <div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-l-white border-b-[5px] border-b-transparent ml-1" />
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {count > 3 && (
                                                                <div className="absolute inset-0 bg-[#111114]/70 flex flex-col items-center justify-center text-espresso-50 backdrop-blur-sm rounded-2xl">
                                                                    <ImageIcon size={20} className="mb-1 text-amber-500" />
                                                                    <span className="text-[12px] font-bold text-amber-500">+{count - 3}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}

                                    {/* Story */}
                                    {shop.longDesc && (
                                        <div className="pt-8 border-t border-white/20 -mx-6 px-6 mt-8 mb-4">
                                            <div className="bg-[#1a1a1e] border border-white/5 rounded-[1.5rem] p-6 text-center relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent"></div>
                                                <h4 className="font-serif font-black text-espresso-50 mb-4 inline-block text-[18px]">Origin Story</h4>
                                                <p className="text-espresso-200 text-[14px] leading-loose break-keep font-medium">
                                                    {getFallbackTranslation(shop.longDesc)}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Coffee Talk Posts Mentioning this shop */}
                                    <StoreCoffeeTalkSection storeId={shop.id} onCloseModal={onClose} />

                                    {/* Store Reviews Section */}
                                    <StoreReviewSection storeId={shop.id} shopOwnerId={shop.ownerId} reviews={reviews} onReviewAdded={fetchReviews} initialAiSummary={shop.aiReviewSummary} />

                                    {/* Report/Block Feature for App Store Requirements */}
                                    <div className="flex justify-center pt-8 pb-2">
                                        <button 
                                            onClick={handleReport}
                                            className="text-xs text-espresso-200 font-medium underline hover:text-red-500 transition-colors"
                                        >
                                            {t('manage_shop.btn_report_block', '신고 및 차단하기 (Report / Block)')}
                                        </button>
                                    </div>

                                    {/* Bottom padding to clear sticky action bar */}
                                    <div className="h-20" />
                                </div>
                            </div>

                            <div className="absolute bottom-0 left-0 w-full bg-espresso-900/80 backdrop-blur-xl border-t border-coffee-100 p-4 pb-safe-bottom flex gap-3 z-[170]">
                                <button
                                    onClick={handleDirections}
                                    className="flex-1 bg-coffee-900 text-espresso-50 rounded-xl py-3.5 font-bold text-[15px] flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-coffee-900/20"
                                    style={{ WebkitTapHighlightColor: 'transparent' }}
                                >
                                    <Navigation size={18} /> {t('shared.btn_directions', '길찾기')}
                                </button>
                                {shop.lat && shop.lng && (
                                    <button
                                        onClick={() => {
                                            if (onClose) onClose();
                                            navigate('/map', { state: { targetShopId: shop.id, targetLat: shop.lat, targetLng: shop.lng, targetName: shop.name } });
                                        }}
                                        className="flex-1 bg-espresso-900 text-espresso-50 border-2 border-espresso-700 rounded-xl py-3.5 font-bold text-[15px] flex justify-center items-center gap-2 active:scale-95 transition-transform text-center shadow-sm"
                                        style={{ WebkitTapHighlightColor: 'transparent' }}
                                    >
                                        <Map size={18} /> {t('shop_detail.btn_view_map', '커피맵에서 보기')}
                                    </button>
                                )}
                                            </div>

                        </motion.div>
                    </div>

                    {/* Course Picker Overlay */}
                    <AnimatePresence>
                        {isCoursePickerOpen && (
                            <motion.div 
                                initial={{ opacity: 0, y: 50 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 50 }}
                                className="fixed inset-x-0 bottom-0 z-[200] p-4 flex flex-col items-center pointer-events-none"
                            >
                                <div className="bg-espresso-900 border border-espresso-700/80 rounded-[1.5rem] w-full max-w-[448px] overflow-hidden shadow-[0_-10px_40px_-5px_rgba(0,0,0,0.8)] pointer-events-auto">
                                    <div className="p-4 flex justify-between items-center border-b border-espresso-800/80 bg-espresso-950/30">
                                        <h3 className="font-bold text-amber-500 flex items-center gap-2">
                                            <Globe size={18} /> {t('shop_detail.btn_add_to_course')}
                                        </h3>
                                        <button onClick={() => setIsCoursePickerOpen(false)} className="p-1.5 text-espresso-300 hover:text-espresso-50 rounded-full">
                                            <X size={20} />
                                        </button>
                                    </div>
                                    <div className="p-2 max-h-[40vh] overflow-y-auto">
                                        {myCourses.map(course => (
                                            <button 
                                                key={course.id}
                                                onClick={() => handleAddToCourse(course.id)}
                                                disabled={isAddingToCourse}
                                                className="w-full text-left p-3 hover:bg-espresso-800 rounded-xl flex items-center justify-between group transition-colors"
                                            >
                                                <div>
                                                    <div className="font-bold text-[14px] text-espresso-50 group-hover:text-amber-400 transition-colors">{course.name}</div>
                                                    <div className="text-[11px] text-espresso-400 mt-0.5">{course._count?.items || 0}{t('shop_detail.lbl_shops_included')}</div>
                                                </div>
                                                <PlusCircle size={18} className="text-espresso-500 group-hover:text-amber-500" />
                                            </button>
                                        ))}
                                        {myCourses.length === 0 && (
                                            <p className="text-center text-[13px] text-espresso-400 py-4">{t('shop_detail.no_courses_created')}</p>
                                        )}
                                        <div className="mt-2 p-2 border-t border-espresso-800/80">
                                            <form onSubmit={(e) => {
                                                e.preventDefault();
                                                const form = e.target as HTMLFormElement;
                                                const input = form.elements.namedItem('coursename') as HTMLInputElement;
                                                handleCreateCourse(input.value);
                                                input.value = '';
                                            }} className="flex gap-2">
                                                <input name="coursename" placeholder={t('shop_detail.ph_new_course')} required maxLength={30} className="flex-1 bg-espresso-950/50 border border-espresso-700/50 rounded-xl px-3 py-2 text-[13px] text-espresso-50 focus:outline-none focus:border-amber-500 transition-colors" />
                                                <button disabled={isAddingToCourse} type="submit" className="shrink-0 whitespace-nowrap bg-amber-500 text-espresso-950 font-bold px-4 py-2 rounded-xl text-[13px] hover:bg-amber-400 transition-colors disabled:opacity-70">
                                                    {t('shop_detail.btn_create_course')}
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Fullscreen Image Viewer Overlay */}
                    <AnimatePresence>
                        {selectedImageIndex !== null && currentViewerImages.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[200] bg-espresso-950 pointer-events-auto flex flex-col"
                            >
                                <div className="absolute top-0 left-0 w-full p-4 pt-safe-top flex justify-between items-center z-20 bg-gradient-to-b from-espresso-950/50 to-transparent">
                                    <div className="text-espresso-50 text-[15px] font-bold">
                                        {(() => {
                                            if (viewerContext === 'beverage') return `${selectedImageIndex + 1} / ${currentViewerImages.length} (${t('shop_detail.lbl_beverage', '커피 메뉴판')})`;
                                            if (viewerContext === 'dessert') return `${selectedImageIndex + 1} / ${currentViewerImages.length} (${t('shop_detail.lbl_dessert', '디저트/기타 메뉴')})`;
                                            return `${selectedImageIndex + 1} / ${currentViewerImages.length} (${t('shop_detail.lbl_gallery', '매장 갤러리')})`;
                                        })()}
                                    </div>
                                    <button
                                        onClick={() => { setSelectedImageIndex(null); setViewerContext(null); }}
                                        className="p-2 bg-espresso-950/40 backdrop-blur-md rounded-full text-espresso-50 active:scale-95"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>
                                <div className="flex-1 w-full relative">
                                    {/* Left Arrow */}
                                    {selectedImageIndex > 0 && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const newIndex = selectedImageIndex - 1;
                                                setSelectedImageIndex(newIndex);
                                                const container = document.getElementById('gallery-scroll-container');
                                                if (container && container.children[newIndex]) {
                                                    container.children[newIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                                                }
                                            }}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-espresso-950/50 hover:bg-espresso-950/70 rounded-full text-espresso-50 z-20 transition-colors backdrop-blur-sm shadow-xl"
                                        >
                                            <ChevronLeft size={32} />
                                        </button>
                                    )}

                                    {/* Right Arrow */}
                                    {selectedImageIndex < currentViewerImages.length - 1 && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const newIndex = selectedImageIndex + 1;
                                                setSelectedImageIndex(newIndex);
                                                const container = document.getElementById('gallery-scroll-container');
                                                if (container && container.children[newIndex]) {
                                                    container.children[newIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                                                }
                                            }}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-espresso-950/50 hover:bg-espresso-950/70 rounded-full text-espresso-50 z-20 transition-colors backdrop-blur-sm shadow-xl"
                                        >
                                            <ChevronRight size={32} />
                                        </button>
                                    )}

                                    <div id="gallery-scroll-container" className="w-full h-full flex overflow-x-auto snap-x snap-mandatory hide-scrollbar items-center bg-espresso-950"
                                        onScroll={(e) => {
                                            const target = e.target as HTMLDivElement;
                                            const newIndex = Math.round(target.scrollLeft / target.clientWidth);
                                            if (newIndex !== selectedImageIndex && !isNaN(newIndex)) {
                                                setSelectedImageIndex(newIndex);
                                            }
                                        }}
                                    >
                                        {currentViewerImages.map((item: any, idx: number) => (
                                            <div key={idx} className="w-full h-full shrink-0 snap-center flex items-center justify-center p-2 relative" ref={el => {
                                                if (el && idx === selectedImageIndex && !el.dataset.scrolled) {
                                                    el.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'center' });
                                                    el.dataset.scrolled = "true";
                                                }
                                            }}>
                                                {item.type === 'VIDEO' ? (
                                                    <video
                                                        src={item.url}
                                                        controls
                                                        autoPlay={idx === selectedImageIndex}
                                                        loop
                                                        className="max-w-full max-h-[80vh] object-contain"
                                                    />
                                                ) : (
                                                    <TransformWrapper 
                                                        initialScale={1} 
                                                        minScale={1} 
                                                        maxScale={4} 
                                                        centerOnInit 
                                                        panning={{ velocityDisabled: true }} 
                                                        doubleClick={{ disabled: false, step: 2 }}
                                                    >
                                                        <TransformComponent wrapperClass="!w-full !h-full !flex items-center justify-center cursor-zoom-in" contentClass="!w-full !h-full !flex items-center justify-center">
                                                            <img
                                                                src={item.url.startsWith('/mock-bucket') ? `https://images.unsplash.com/photo-${1554118811 + idx}-1e0d58224f24` : item.url}
                                                                alt={t('shop_detail.alt_detail_img', '상세 이미지 {{index}}', {index: idx + 1})}
                                                                className="max-w-full max-h-[80vh] object-contain transition-transform"
                                                            />
                                                        </TransformComponent>
                                                    </TransformWrapper>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                </>
            )}
        </AnimatePresence>
    );
}

