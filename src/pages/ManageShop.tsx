import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Store, Save, X, Camera, Trash2, Search, CheckCircle2, BarChart2, Activity, TrendingUp, Star, Target, Users, Sparkles, Megaphone, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { API_BASE } from '../utils/apiConfig';

// Fix for default marker icons in Leaflet + React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationPicker({ position, setPosition }: { position: L.LatLngExpression, setPosition: (pos: any) => void }) {
    useMapEvents({
        click(e) {
            setPosition(e.latlng);
        },
    });
    return position === null ? null : (
        <Marker position={position}></Marker>
    );
}

// Component to programmatically move the map upon search
function MapController({ center }: { center: [number, number] | null }) {
    const map = useMapEvents({});
    useEffect(() => {
        if (center) {
            map.flyTo(center, 15, { animate: true, duration: 1.5 });
        }
    }, [center, map]);

    // Fix for Leaflet grey map bug when rendered inside animating containers (framer-motion)
    useEffect(() => {
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 400); // trigger after page transition completes
        return () => clearTimeout(timer);
    }, [map]);

    return null;
}

export default function ManageShop() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [shops, setShops] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingShop, setEditingShop] = useState<any>(null);
    const [reportShop, setReportShop] = useState<any>(null); // State for Premium Report Modal
    const [editData, setEditData] = useState<any>({
        name: '', address: '', phone: '', shortDesc: '', longDesc: '', hours: '',
        signatureBean: '', signatureMenu: '', dessertPairing: '', equipment: '', websiteUrl: '',
        acidity: 3, sweetness: 3, bitterness: 3, body: 3,
        primaryCoffeeType: 'GENERAL',
        hasDecaf: false, hasOatMilk: false,
        hasParking: false, hasWifi: false, hasPetFriendly: false, hasPowerOutlets: false,
        lat: 37.5665, lng: 126.9780,
        beanOrigin: '', beanRoastLevel: '', beanNotes: ''
    });
    const [mediaFiles, setMediaFiles] = useState<{ url: string, file?: File }[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [coffeeMenuImages, setCoffeeMenuImages] = useState<{ url: string, file?: File }[]>([]);
    const coffeeMenuInputRef = useRef<HTMLInputElement>(null);
    const [popularMenuImages, setPopularMenuImages] = useState<{ url: string, file?: File }[]>([]);
    const popularMenuInputRef = useRef<HTMLInputElement>(null);
    const [menuItems, setMenuItems] = useState<{name: string; price: string; category: string; imageUrl: string | null; imageFile?: File}[]>([]);
    const menuItemImageRefs = useRef<(HTMLInputElement | null)[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [markerImageIndex, setMarkerImageIndex] = useState(0);

    // Host Story Publishing State
    const [storyShop, setStoryShop] = useState<any>(null);
    const [storyContent, setStoryContent] = useState('');
    const [storyImages, setStoryImages] = useState<{ url: string, file?: File }[]>([]);
    const storyImageInputRef = useRef<HTMLInputElement>(null);
    const [isSubmittingStory, setIsSubmittingStory] = useState(false);
    const [sendEmail, setSendEmail] = useState(false);

    // Daily Hours
    const defaultDailyHours = [
        { day: '월', open: '08:00', close: '22:00', isClosed: false },
        { day: '화', open: '08:00', close: '22:00', isClosed: false },
        { day: '수', open: '08:00', close: '22:00', isClosed: false },
        { day: '목', open: '08:00', close: '22:00', isClosed: false },
        { day: '금', open: '08:00', close: '22:00', isClosed: false },
        { day: '토', open: '10:00', close: '22:00', isClosed: false },
        { day: '일', open: '10:00', close: '22:00', isClosed: false },
    ];
    const [dailyHours, setDailyHours] = useState<any[]>(defaultDailyHours);

    const [mapSearchQuery, setMapSearchQuery] = useState('');
    const [isMapSearching, setIsMapSearching] = useState(false);
    const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);



    const fetchMyShops = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) return navigate('/profile', { replace: true });

            const response = await fetch(`${API_BASE}/api/shops/my`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setShops(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };



    useEffect(() => {
        fetchMyShops();
    }, [navigate]);

    const openEdit = (shop: any) => {
        setEditingShop(shop);
        setEditData({
            name: shop.name || '',
            address: shop.address || '',
            phone: shop.phone || '',
            shortDesc: shop.shortDesc || '',
            longDesc: shop.longDesc || '',
            hours: shop.hours || '',
            signatureBean: shop.signatureBean || '',
            signatureMenu: shop.signatureMenu || '',
            dessertPairing: shop.dessertPairing || '',
            equipment: shop.equipment || '',
            websiteUrl: shop.websiteUrl || '',
            acidity: shop.acidity || 3,
            sweetness: shop.sweetness || 3,
            bitterness: shop.bitterness || 3,
            body: shop.body || 3,
            primaryCoffeeType: shop.primaryCoffeeType || 'GENERAL',
            hasDecaf: Boolean(shop.hasDecaf),
            hasOatMilk: Boolean(shop.hasOatMilk),
            hasParking: Boolean(shop.hasParking),
            hasWifi: Boolean(shop.hasWifi),
            hasPetFriendly: Boolean(shop.hasPetFriendly),
            hasPowerOutlets: Boolean(shop.hasPowerOutlets),
            lat: shop.lat || 37.5665,
            lng: shop.lng || 126.9780,
            beanOrigin: shop.beanOrigin || '',
            beanRoastLevel: shop.beanRoastLevel || '',
            beanNotes: shop.beanNotes || ''
        });
        
        let parsedHours = defaultDailyHours;
        try {
            if (shop.hours && shop.hours.startsWith('[')) {
                parsedHours = JSON.parse(shop.hours);
            }
        } catch(e) {}
        setDailyHours(parsedHours);

        setMapCenter([shop.lat || 37.5665, shop.lng || 126.9780]);
        setMediaFiles(shop.media ? shop.media.map((m: any) => ({ url: m.url })) : []);
        try {
            const parsedCoffee = JSON.parse(shop.coffeeMenuImageUrl || "[]");
            setCoffeeMenuImages(Array.isArray(parsedCoffee) ? parsedCoffee.map((url: string) => ({ url })) : shop.coffeeMenuImageUrl ? [{ url: shop.coffeeMenuImageUrl }] : []);
        } catch {
            setCoffeeMenuImages(shop.coffeeMenuImageUrl ? [{ url: shop.coffeeMenuImageUrl }] : []);
        }

        try {
            const parsedPopular = JSON.parse(shop.popularMenuImageUrl || "[]");
            setPopularMenuImages(Array.isArray(parsedPopular) ? parsedPopular.map((url: string) => ({ url })) : shop.popularMenuImageUrl ? [{ url: shop.popularMenuImageUrl }] : []);
        } catch {
            setPopularMenuImages(shop.popularMenuImageUrl ? [{ url: shop.popularMenuImageUrl }] : []);
        }

        const markerIdx = shop.media && shop.markerImageUrl ? shop.media.findIndex((m: any) => m.url === shop.markerImageUrl) : 0;
        setMarkerImageIndex(Math.max(0, markerIdx));
        
        if (shop.menuItems && Array.isArray(shop.menuItems)) {
            setMenuItems(shop.menuItems);
        } else {
            setMenuItems([]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files).map(f => ({ file: f, url: URL.createObjectURL(f) }));
            setMediaFiles(prev => [...prev, ...newFiles].slice(0, 5));
        }
    };
    const removeFile = (index: number) => {
        setMediaFiles(prev => prev.filter((_, i) => i !== index));

        if (markerImageIndex === index) setMarkerImageIndex(0);
        else if (markerImageIndex > index) setMarkerImageIndex(prev => prev - 1);
    };

    const handleMenuFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<{ url: string, file?: File }[]>>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files).map(f => ({ file: f, url: URL.createObjectURL(f) }));
            setter(prev => [...prev, ...newFiles].slice(0, 5));
        }
    };
    const removeMenuFile = (index: number, setter: React.Dispatch<React.SetStateAction<{ url: string, file?: File }[]>>) => {
        setter(prev => prev.filter((_, i) => i !== index));
    };

    const handleMapSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mapSearchQuery.trim()) return;

        setIsMapSearching(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mapSearchQuery)}`);
            if (response.ok) {
                const results = await response.json();
                if (results && results.length > 0) {
                    const firstResult = results[0];
                    const lat = parseFloat(firstResult.lat);
                    const lng = parseFloat(firstResult.lon);
                    setMapCenter([lat, lng]);
                    setEditData(prev => ({ ...prev, lat, lng }));
                } else {
                    alert(t('register_shop.alert_no_search_results', '검색 결과가 없습니다. 다른 지역명이나 주소로 다시 시도해주세요.'));
                }
            }
        } catch (err) {
            console.error('Geocoding search failed:', err);
            alert(t('register_shop.alert_search_fail', '위치 검색에 실패했습니다.'));
        } finally {
            setIsMapSearching(false);
        }
    };

    const handleSave = async () => {
        if (!editingShop) return;
        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            const mediaUrlsPromises = mediaFiles.map(mf => new Promise<string>((resolve, reject) => {
                if (mf.file) {
                    const reader = new FileReader();
                    reader.readAsDataURL(mf.file);
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = error => reject(error);
                } else {
                    resolve(mf.url);
                }
            }));
            const mediaUrls = await Promise.all(mediaUrlsPromises);

            // Convert menu single images to base64
            const processMultiImages = async (imgStates: { url: string, file?: File }[]) => {
                if (!imgStates || imgStates.length === 0) return null;
                const promises = imgStates.map(img => new Promise<string>((resolve, reject) => {
                    if (!img.file) return resolve(img.url);
                    const reader = new FileReader();
                    reader.readAsDataURL(img.file);
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = error => reject(error);
                }));
                const results = await Promise.all(promises);
                return JSON.stringify(results);
            };

            const coffeeMenuImageUrl = await processMultiImages(coffeeMenuImages);
            const popularMenuImageUrl = await processMultiImages(popularMenuImages);

            const response = await fetch(`${API_BASE}/api/shops/${editingShop.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ ...editData, hours: JSON.stringify(dailyHours), mediaUrls, markerImageIndex, coffeeMenuImageUrl, popularMenuImageUrl, menuItems })
            });

            if (response.ok) {
                alert(t('manage_shop.alert_edit_success', '매장 정보가 성공적으로 수정되었습니다.'));
                setEditingShop(null);
                fetchMyShops(); // Refresh list
            } else {
                const err = await response.json();
                alert(t('manage_shop.alert_edit_fail', '수정 실패: {{error}}', { error: err.error }));
            }
        } catch (error) {
            console.error('Update failed', error);
            alert(t('manage_shop.alert_server_err', '서버 오류로 인해 수정에 실패했습니다.'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleResubmit = async (id: string, name: string) => {
        if (!window.confirm(t('manage_shop.confirm_resubmit', '\'{{name}}\' 매장의 심사를 다시 요청하시겠습니까?', { name }))) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/shops/${id}/resubmit`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                alert(t('manage_shop.alert_resubmit_success', '승인 재요청이 완료되었습니다.'));
                fetchMyShops();
            } else {
                const err = await res.json();
                alert(t('manage_shop.alert_resubmit_fail', '재요청 실패: {{error}}', { error: err.error }));
            }
        } catch (error) {
            console.error('Resubmit failed', error);
            alert(t('manage_shop.alert_resubmit_error', '서버 오류로 인해 실패했습니다.'));
        }
    };

    const handleDeleteShop = async (id: string, name: string) => {
        if (!window.confirm(t('manage_shop.confirm_delete', '\'{{name}}\' 매장을 대시보드에서 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.', { name }))) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/shops/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                alert(t('manage_shop.alert_delete_success', '매장이 삭제되었습니다.'));
                fetchMyShops();
            } else {
                const err = await res.json();
                alert(t('manage_shop.alert_delete_fail', '삭제 실패: {{error}}', { error: err.error }));
            }
        } catch (error) {
            console.error('Delete failed', error);
            alert(t('manage_shop.alert_server_err', '서버 오류로 인해 실패했습니다.'));
        }
    };

    const handleStoryImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files).map(f => ({ file: f, url: URL.createObjectURL(f) }));
            setStoryImages(prev => [...prev, ...newFiles].slice(0, 3));
        }
    };

    const handlePublishStory = async () => {
        if (!storyShop || !storyContent.trim()) {
            alert(t('manage_shop.alert_story_empty', '소식 내용을 입력해주세요.'));
            return;
        }

        setIsSubmittingStory(true);
        try {
            const token = localStorage.getItem('token');
            // Process images to Base64
            const mediaUrlsPromises = storyImages.map(mf => new Promise<string>((resolve, reject) => {
                if (mf.file) {
                    const reader = new FileReader();
                    reader.readAsDataURL(mf.file);
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = error => reject(error);
                } else {
                    resolve(mf.url);
                }
            }));
            const mediaUrls = await Promise.all(mediaUrlsPromises);

            const formData = new FormData();
            formData.append('content', storyContent);
            formData.append('storeId', storyShop.id);
            formData.append('postType', 'ANNOUNCEMENT');
            formData.append('sendEmail', sendEmail.toString());
            storyImages.forEach(img => {
                if (img.file) formData.append('images', img.file);
            });

            const response = await fetch(`${API_BASE}/api/community/posts`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (response.ok) {
                alert(t('manage_shop.alert_story_success', '소식이 성공적으로 단골 고객들에게 발행되었습니다!'));
                setStoryShop(null);
                setStoryContent('');
                setStoryImages([]);
                setSendEmail(false);
            } else {
                const err = await response.json();
                alert(t('manage_shop.alert_story_fail', '소식 발행 실패: {{error}}', { error: err.error || 'Server error' }));
            }
        } catch (error) {
            console.error('Failed to publish story', error);
            alert(t('manage_shop.alert_server_err', '서버 오류로 인해 실패했습니다.'));
        } finally {
            setIsSubmittingStory(false);
        }
    };

    return (
        <div className="h-full w-full bg-espresso-950 flex flex-col font-sans relative overflow-x-hidden">
            <header className="px-6 py-4 pt-safe flex items-center bg-espresso-900 border-b border-coffee-100 shrink-0 sticky top-0 z-10">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-espresso-100 hover:bg-espresso-800 rounded-full transition-colors active:scale-95">
                    <ChevronLeft size={28} />
                </button>
                <h1 className="font-serif font-bold text-xl text-espresso-50 ml-2">{t('manage_shop.title', '내 매장 관리')}</h1>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 content-start">

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coffee-800"></div>
                    </div>
                ) : shops.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-20 opacity-60">
                        <Store size={48} className="text-coffee-300 mb-4" />
                        <p className="font-medium text-coffee-600" dangerouslySetInnerHTML={{ __html: t('manage_shop.no_shops_registered', '등록된 내 매장이 없습니다.<br />새로운 매장을 등록해 보세요!') }}></p>
                        <button onClick={() => navigate('/register')} className="mt-6 px-6 py-3 bg-espresso-700 text-espresso-100 rounded-xl font-bold text-sm">
                            {t('manage_shop.btn_go_register', '매장 등록하러 가기')}
                        </button>
                    </div>
                ) : (
                    shops.map((shop, idx) => (
                        <motion.div key={shop.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-espresso-900 p-5 rounded-2xl border border-coffee-100 shadow-sm flex flex-col gap-4">
                            <div>
                                <h2 className="font-bold text-espresso-50 text-xl flex items-center flex-wrap gap-2">
                                    {shop.name}
                                    {shop.storePlan === 'PREMIUM' && (
                                        <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold border border-amber-200 uppercase tracking-widest whitespace-nowrap"><span className="mr-0.5">👑</span> {t('manage_shop.premium_host', 'PREMIUM 호스트')}</span>
                                    )}
                                </h2>
                                <p className="text-sm font-medium text-espresso-300 mt-1">{shop.address}</p>
                            </div>
                            <div className="bg-espresso-950 rounded-xl p-3 flex justify-between items-center text-sm font-medium border border-white/5">
                                <span className="text-coffee-600">{t('manage_shop.status_label', '심사 상태')}</span>
                                <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${shop.status === 'APPROVED' ? 'bg-green-900/30 border-green-500/20 text-green-400' : shop.status === 'REJECTED' ? 'bg-red-900/30 border-red-500/20 text-red-400' : 'bg-orange-900/30 border-orange-500/20 text-orange-400'}`}>
                                    {shop.status === 'PENDING' ? t('manage_shop.status_pending', '심사대기') : shop.status === 'REJECTED' ? (shop.approvalRequestsCount >= 3 ? t('manage_shop.status_rejected_permanent', '영구 반려') : t('manage_shop.status_rejected_remain', '심사반려 (재요청 잔여: {{count}}회)', { count: 3 - (shop.approvalRequestsCount || 1) })) : t('manage_shop.status_approved', '승인완료')}
                                </span>
                            </div>
                            {shop.status === 'REJECTED' && (
                                <div className="bg-red-950/40 border border-red-500/20 text-red-300 rounded-xl p-3 text-[13px] font-medium flex gap-2 items-start mt-[-0.5rem]">
                                    <span className="shrink-0 mt-0.5 opacity-80">🚨</span>
                                    <div>
                                        <div className="font-bold text-red-400 mb-0.5 text-[12px]">{t('manage_shop.reject_reason_title', '반려 사유')}</div>
                                        <p className="leading-relaxed whitespace-pre-wrap">{shop.rejectionReason || t('manage_shop.no_reject_reason', '안내된 상세 사유 없음 (재요청 시 정상화됩니다.)')}</p>
                                    </div>
                                </div>
                            )}

                            {/* PREMIUM 통계 대시보드 */}
                            {shop.storePlan === 'PREMIUM' && shop.premiumStats && (
                                <div className="bg-espresso-950 rounded-2xl p-4 border border-white/5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-8 h-8 rounded-full bg-amber-400/10 flex items-center justify-center">
                                            <Activity size={16} className="text-amber-500" />
                                        </div>
                                        <span className="font-bold text-amber-100 text-sm tracking-wide">{t('manage_shop.premium_insight_title', '프리미엄 인사이트')}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-espresso-900/40 rounded-xl p-3.5 text-center border border-white/5">
                                            <div className="text-[11px] font-bold text-espresso-300 mb-1">{t('manage_shop.stat_views', '이번 달 누적 조회수')}</div>
                                            <div className="text-xl font-black text-espresso-50 flex items-center justify-center gap-1">
                                                {shop.premiumStats.totalViews.toLocaleString()} <span className="text-[10px] text-coffee-400 font-bold mb-1">{t('manage_shop.unit_times', '회')}</span>
                                            </div>
                                        </div>
                                        <div className="bg-espresso-900/40 rounded-xl p-3.5 text-center border border-white/5">
                                            <div className="text-[11px] font-bold text-espresso-300 mb-1">{t('manage_shop.stat_visitors', '주간 신규 방문자')}</div>
                                            <div className="text-xl font-black text-espresso-50 flex items-center justify-center gap-1">
                                                {shop.premiumStats.recentVisitors.toLocaleString()} <span className="text-[10px] text-coffee-400 font-bold mb-1">{t('manage_shop.unit_people', '명')}</span>
                                            </div>
                                        </div>
                                        <div className="bg-espresso-900/40 rounded-xl p-3.5 text-center border border-white/5">
                                            <div className="text-[11px] font-bold text-amber-200/70 mb-1">{t('manage_shop.stat_ai', 'AI 매커니즘 추천')}</div>
                                            <div className="text-xl font-black text-amber-50 flex items-center justify-center gap-1">
                                                {shop.premiumStats.searchAppearances.toLocaleString()} <span className="text-[10px] text-amber-600/60 font-bold mb-1">{t('manage_shop.unit_times', '회')}</span>
                                            </div>
                                        </div>
                                        <div className="bg-espresso-900/40 rounded-xl p-3.5 text-center border border-white/5">
                                            <div className="text-[11px] font-bold text-espresso-300 mb-1">{t('manage_shop.stat_bookmarks', '누적 매장 찜하기')}</div>
                                            <div className="text-xl font-black text-espresso-50 flex items-center justify-center gap-1">
                                                {shop.premiumStats.totalBookmarks.toLocaleString()} <span className="text-[10px] text-coffee-400 font-bold mb-1">{t('manage_shop.unit_people', '명')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center px-1">
                                        <span className="text-[11px] text-espresso-400 font-medium tracking-wide">{t('manage_shop.expire_date', '만료일: ')} <span className="text-amber-200/70">{shop.planExpiresAt ? new Date(shop.planExpiresAt).toLocaleDateString() : t('manage_shop.auto_renew', '자동 갱신')}</span></span>
                                        <button className="text-[11px] font-bold text-amber-300 bg-amber-900/40 border border-amber-500/20 hover:bg-amber-900/60 transition-colors px-2.5 py-1.5 rounded-lg flex items-center gap-1" onClick={() => setReportShop(shop)}>
                                            <Activity size={12} /> {t('manage_shop.btn_detail_report', '상세 리포트')}
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <button onClick={() => openEdit(shop)} className="flex-1 bg-coffee-800 text-espresso-50 rounded-xl py-3 font-bold text-sm active:scale-[0.98] transition-all">
                                    {t('manage_shop.btn_edit_info', '주요 정보 수정하기')}
                                </button>
                                {shop.status === 'REJECTED' && (shop.approvalRequestsCount || 1) < 3 && (
                                    <button onClick={() => handleResubmit(shop.id, shop.name)} className="flex-1 bg-espresso-800 text-espresso-100 rounded-xl py-3 font-bold text-sm active:scale-[0.98] transition-all hover:bg-espresso-700">
                                        {t('manage_shop.btn_resubmit', '승인 재요청')}
                                    </button>
                                )}
                                <button onClick={() => handleDeleteShop(shop.id, shop.name)} className="bg-red-900/40 text-red-400 hover:bg-red-900/60 border border-red-500/20 rounded-xl px-4 font-bold text-[13px] active:scale-[0.98] transition-all flex items-center justify-center shrink-0">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            

                            {/* Host Story Publishing feature for APPROVED shops */}
                            {shop.status === 'APPROVED' && (
                                <div className="mt-1">
                                    <button 
                                        onClick={() => setStoryShop(shop)} 
                                        className="w-full flex items-center justify-center gap-2 bg-espresso-950/80 border border-orange-500/30 text-orange-50 rounded-xl py-3.5 font-bold text-[14px] active:scale-[0.98] transition-all shadow-sm group hover:border-orange-500/50 hover:bg-espresso-950"
                                    >
                                        <Megaphone size={18} className="text-orange-500 group-hover:scale-110 transition-transform" />
                                        <span>{t('manage_shop.btn_publish_story', '📣 단골 고객들에게 소식/공지 발행')}</span>
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    ))
                )}
            </div>

            {/* Edit Modal */}
            <AnimatePresence>
                {editingShop && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingShop(null)} className="fixed inset-0 bg-coffee-900/40 backdrop-blur-sm z-[90]" />
                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="fixed bottom-0 left-0 w-full bg-espresso-900 rounded-t-[2rem] z-[95] p-6 pb-[calc(5rem+env(safe-area-inset-bottom))] max-h-[92vh] flex flex-col hide-scrollbar overflow-x-hidden">
                            <div className="w-12 h-1.5 bg-espresso-700 rounded-full mx-auto mb-6 shrink-0" />
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-serif font-bold text-espresso-50 truncate pr-4">{editingShop.name} {t('manage_shop.modal_edit_title', '수정')}</h3>
                                <button onClick={() => setEditingShop(null)} className="p-2 -mr-2 bg-espresso-800 text-coffee-600 rounded-full"><X size={20} /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-5 pr-1 pb-6 w-full">
                                {/* Basic Info */}
                                <div className="space-y-4">
                                    <h4 className="font-bold text-espresso-50 border-b border-coffee-100 pb-2 text-[15px]">{t('manage_shop.title_basic_info', '기본 정보')}</h4>
                                    <div>
                                        <label className="block text-[13px] font-bold text-coffee-600 mb-1">{t('register_shop.label_shop_name', '매장명')}</label>
                                        <input type="text" value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} className="w-full bg-espresso-950 border border-coffee-100 h-11 px-4 rounded-xl focus:ring-2 focus:ring-coffee-700 outline-none text-[14px] font-bold text-espresso-50" />
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-bold text-espresso-200 mb-1.5 ml-1">{t('register_shop.label_address', '매장 주소')}</label>
                                        <input type="text" value={editData.address} onChange={e => setEditData({ ...editData, address: e.target.value })} className="w-full bg-espresso-900 border border-espresso-600 h-12 px-4 rounded-xl focus:border-coffee-700 focus:ring-2 focus:ring-coffee-700/20 outline-none text-[15px] font-bold text-espresso-50 shadow-sm transition-all" />

                                        <div className="mt-4 border border-coffee-100 rounded-xl overflow-hidden bg-espresso-900">
                                            <div className="bg-espresso-950 px-4 py-3 border-b border-coffee-100">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div>
                                                        <span className="text-[13px] font-bold text-espresso-100 block">{t('register_shop.label_pin_title', '매장 위치 핀 설정')}</span>
                                                        <span className="text-[11px] text-espresso-300 font-medium">{t('register_shop.label_pin_desc', '주소 검색 후 지도를 터치하여 정확한 위치로 핀을 이동해주세요.')}</span>
                                                    </div>
                                                </div>

                                                {/* Map Geocoding Search Form */}
                                                <form onSubmit={handleMapSearch} className="relative flex items-center gap-2">
                                                    <div className="relative flex-1">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-coffee-400" size={14} />
                                                        <input
                                                            type="text"
                                                            placeholder={t('register_shop.ph_map_search', '지역명, 주소, 상호명 등 지도에서 검색')}
                                                            className="w-full bg-espresso-900 border border-espresso-700 h-9 pl-9 pr-8 rounded-lg outline-none text-[12px] font-medium focus:ring-1 focus:ring-coffee-500 transition-shadow"
                                                            value={mapSearchQuery}
                                                            onChange={(e) => setMapSearchQuery(e.target.value)}
                                                        />
                                                        {isMapSearching && (
                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-coffee-800"></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button type="submit" disabled={isMapSearching} className="bg-coffee-800 disabled:opacity-50 text-espresso-50 h-9 px-3 rounded-lg text-[12px] font-bold shrink-0">
                                                        {t('register_shop.btn_search', '검색')}
                                                    </button>
                                                </form>
                                            </div>
                                            <div className="h-48 w-full relative z-0">
                                                <MapContainer
                                                    center={mapCenter || [editData.lat, editData.lng]}
                                                    zoom={15}
                                                    scrollWheelZoom={false}
                                                    className="w-full h-full"
                                                >
                                                    <MapController center={mapCenter} />
                                                    <TileLayer
                                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                    />
                                                    <LocationPicker
                                                        position={[editData.lat, editData.lng]}
                                                        setPosition={(pos) => setEditData({ ...editData, lat: pos.lat, lng: pos.lng })}
                                                    />
                                                </MapContainer>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-bold text-espresso-200 mb-1.5 ml-1">{t('register_shop.label_phone', '연락처')}</label>
                                        <input type="text" value={editData.phone} onChange={e => setEditData({ ...editData, phone: e.target.value })} className="w-full bg-espresso-900 border border-espresso-600 h-12 px-4 rounded-xl focus:border-coffee-700 focus:ring-2 focus:ring-coffee-700/20 outline-none text-[15px] font-bold text-espresso-50 shadow-sm transition-all" />
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-end mb-1.5 ml-1">
                                            <label className="block text-[13px] font-bold text-espresso-200">{t('register_shop.label_hours', '영업시간')}</label>
                                            <button 
                                                onClick={() => {
                                                    const mon = dailyHours[0];
                                                    setDailyHours(dailyHours.map(h => ({ ...h, open: mon.open, close: mon.close, isClosed: mon.isClosed })));
                                                }}
                                                className="text-[11px] font-bold bg-espresso-800 text-espresso-200 hover:text-espresso-50 px-2 py-1 rounded-md transition-colors"
                                            >
                                                월요일 기준 전체 적용
                                            </button>
                                        </div>
                                        <div className="space-y-2 border border-espresso-700 bg-espresso-900 p-3 rounded-xl">
                                            {dailyHours.map((dayHour, idx) => (
                                                <div key={idx} className="flex flex-col gap-1.5 bg-espresso-950 p-2 rounded-lg border border-espresso-800">
                                                        <div className="flex items-center gap-2">

                                                    <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-[13px] shrink-0 ${['토','일'].includes(dayHour.day) ? 'bg-orange-900/40 text-orange-400' : 'bg-espresso-800 text-espresso-200'}`}>
                                                        {dayHour.day}
                                                    </div>
                                                    
                                                    {!dayHour.isClosed ? (
                                                        <div className="flex-1 flex items-center gap-2">
                                                            <input type="time" value={dayHour.open} onChange={e => setDailyHours(prev => prev.map((h, i) => i === idx ? { ...h, open: e.target.value } : h))} className="flex-1 bg-espresso-900 border border-espresso-700 rounded h-8 px-2 outline-none text-[13px] font-medium text-espresso-50 focus:border-coffee-500" />
                                                            <span className="text-espresso-400">-</span>
                                                            <input type="time" value={dayHour.close} onChange={e => setDailyHours(prev => prev.map((h, i) => i === idx ? { ...h, close: e.target.value } : h))} className="flex-1 bg-espresso-900 border border-espresso-700 rounded h-8 px-2 outline-none text-[13px] font-medium text-espresso-50 focus:border-coffee-500" />
                                                        </div>
                                                    ) : (
                                                        <div className="flex-1 flex items-center justify-center bg-espresso-900/50 rounded h-8 border border-espresso-800">
                                                            <span className="text-[12px] font-bold text-red-400/80">휴무일</span>
                                                        </div>
                                                    )}
                                                    
                                                    <label className="flex items-center gap-1.5 ml-1 shrink-0 cursor-pointer">
                                                        <input type="checkbox" checked={dayHour.isClosed} onChange={e => setDailyHours(prev => prev.map((h, i) => i === idx ? { ...h, isClosed: e.target.checked } : h))} className="w-4 h-4 accent-red-500 rounded border-espresso-700" />
                                                        <span className="text-[11px] font-medium text-espresso-300">휴무</span>
                                                    </label>
                                                        </div>
                                                        <div className="flex items-center pl-[2.5rem]">
                                                            <input 
                                                                type="text" 
                                                                placeholder="특이사항 (예: 어린이날, 브레이크타임 등)" 
                                                                value={dayHour.comment || ''} 
                                                                onChange={e => setDailyHours(prev => prev.map((h, i) => i === idx ? { ...h, comment: e.target.value } : h))}
                                                                className="w-full bg-espresso-900 border border-espresso-800 rounded h-7 px-2 outline-none text-[12px] font-medium text-espresso-200 focus:border-coffee-500 placeholder:text-espresso-600" 
                                                            />
                                                        </div>
                                                    </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-bold text-espresso-200 mb-1.5 ml-1">{t('register_shop.label_website', '홈페이지 / SNS / 블로그 링크')}</label>
                                        <input type="url" placeholder="https://instagram.com/..." value={editData.websiteUrl} onChange={e => setEditData({ ...editData, websiteUrl: e.target.value })} className="w-full bg-espresso-900 border border-espresso-600 h-12 px-4 rounded-xl focus:border-coffee-700 focus:ring-2 focus:ring-coffee-700/20 outline-none text-[15px] font-bold text-espresso-50 shadow-sm transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-bold text-espresso-200 mb-1.5 ml-1">{t('register_shop.label_short_desc', '한 줄 소개')}</label>
                                        <input type="text" value={editData.shortDesc} onChange={e => setEditData({ ...editData, shortDesc: e.target.value })} className="w-full bg-espresso-900 border border-espresso-600 h-12 px-4 rounded-xl focus:border-coffee-700 focus:ring-2 focus:ring-coffee-700/20 outline-none text-[15px] font-bold text-espresso-50 shadow-sm transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-bold text-espresso-200 mb-1.5 ml-1">{t('register_shop.label_long_desc', '상세 스토리 / 철학')}</label>
                                        <textarea value={editData.longDesc} onChange={e => setEditData({ ...editData, longDesc: e.target.value })} className="w-full bg-espresso-900 border border-espresso-600 p-4 rounded-xl focus:border-coffee-700 focus:ring-2 focus:ring-coffee-700/20 outline-none text-[15px] font-medium text-espresso-50 min-h-[120px] resize-none shadow-sm transition-all" />
                                    </div>



                                    <div className="pt-2">
                                        <label className="block text-[13px] font-bold text-coffee-600 mb-1.5 ml-1">{t('register_shop.label_coffee_type', '매장 주력 커피 유형')}</label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {[
                                                { id: 'SINGLE_ORIGIN', label: t('register_shop.type_single', '✨ 싱글오리진 스페셜티 중심') },
                                                { id: 'BLENDED', label: t('register_shop.type_blended', '🎨 독자적인 로스터리 블렌딩') },
                                                { id: 'SPECIALTY_ROASTERY', label: t('register_shop.type_specialty', '🏆 스페셜티 로스터리 (모두 취급)') },
                                                { id: 'GENERAL', label: t('register_shop.type_general', '🏬 대중적인 프랜차이즈 / 일반') }
                                            ].map(type => (
                                                <button
                                                    key={type.id}
                                                    onClick={() => setEditData({ ...editData, primaryCoffeeType: type.id })}
                                                    className={`p-4 rounded-xl border-2 text-left font-bold text-[14px] transition-all flex items-center justify-between ${editData.primaryCoffeeType === type.id ? 'border-coffee-700 bg-espresso-950 text-espresso-50' : 'border-coffee-100 bg-espresso-900 text-espresso-300'}`}
                                                >
                                                    <span>{type.label}</span>
                                                    {editData.primaryCoffeeType === type.id && <CheckCircle2 size={18} className="text-espresso-200" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <label className="block text-[13px] font-bold text-coffee-600 mb-2 ml-1">{t('register_shop.label_amenities_title', '편의 시설 제공 여부')}</label>
                                        <div className="grid grid-cols-2 gap-3 p-4 bg-espresso-900 border border-espresso-700 shadow-sm rounded-xl">
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input type="checkbox" className="w-5 h-5 accent-coffee-700 rounded" checked={editData.hasParking} onChange={e => setEditData({ ...editData, hasParking: e.target.checked })} />
                                                <span className="font-bold text-[14px] text-espresso-100">{t('register_shop.amenity_parking', '🚙 주차 가능')}</span>
                                            </label>
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input type="checkbox" className="w-5 h-5 accent-coffee-700 rounded" checked={editData.hasWifi} onChange={e => setEditData({ ...editData, hasWifi: e.target.checked })} />
                                                <span className="font-bold text-[14px] text-espresso-100">{t('register_shop.amenity_wifi', '📶 와이파이')}</span>
                                            </label>
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input type="checkbox" className="w-5 h-5 accent-coffee-700 rounded" checked={editData.hasPowerOutlets} onChange={e => setEditData({ ...editData, hasPowerOutlets: e.target.checked })} />
                                                <span className="font-bold text-[14px] text-espresso-100">{t('register_shop.amenity_power', '🔌 콘센트 제공')}</span>
                                            </label>
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input type="checkbox" className="w-5 h-5 accent-coffee-700 rounded" checked={editData.hasPetFriendly} onChange={e => setEditData({ ...editData, hasPetFriendly: e.target.checked })} />
                                                <span className="font-bold text-[14px] text-espresso-100">{t('register_shop.amenity_pet', '🐶 반려동물 동반')}</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-espresso-950 border border-coffee-100 rounded-xl space-y-3 mt-4">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input type="checkbox" className="w-5 h-5 accent-coffee-700 rounded" checked={editData.hasDecaf} onChange={e => setEditData({ ...editData, hasDecaf: e.target.checked })} />
                                            <span className="font-bold text-[14px] text-espresso-100">{t('register_shop.opt_decaf', '디카페인 원두 변경 가능')}</span>
                                        </label>
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input type="checkbox" className="w-5 h-5 accent-coffee-700 rounded" checked={editData.hasOatMilk} onChange={e => setEditData({ ...editData, hasOatMilk: e.target.checked })} />
                                            <span className="font-bold text-[14px] text-espresso-100">{t('register_shop.opt_oatmilk', '오트밀 / 두유 대체유 변경 가능')}</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Menu & Equipment */}
                                <div className="space-y-4 pt-4">
                                    <h4 className="font-bold text-espresso-50 border-b border-coffee-100 pb-2 text-[15px]">{t('manage_shop.title_coffee_menu', '커피 & 메뉴 정보')}</h4>
                                    <div>
                                        <label className="block text-[13px] font-bold text-espresso-200 mb-1.5 ml-1">{t('register_shop.label_signature_bean', '시그니처/싱글오리진 원두명')}</label>
                                        <input type="text" placeholder={t('manage_shop.ph_bean_name', '예: 에티오피아 예가체프 G1')} value={editData.signatureBean} onChange={e => setEditData({ ...editData, signatureBean: e.target.value })} className="w-full bg-espresso-900 border border-espresso-600 h-12 px-4 rounded-xl focus:border-coffee-700 focus:ring-2 focus:ring-coffee-700/20 outline-none text-[15px] font-bold text-espresso-50 shadow-sm transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-bold text-espresso-200 mb-1.5 ml-1">{t('manage_shop.label_bean_origin', '대표 원산지(지역/농장)')}</label>
                                        <input type="text" placeholder={t('manage_shop.ph_bean_origin', '예: Ethiopia Yirgacheffe Aricha')} value={editData.beanOrigin} onChange={e => setEditData({ ...editData, beanOrigin: e.target.value })} className="w-full bg-espresso-900 border border-espresso-600 h-12 px-4 rounded-xl focus:border-coffee-700 focus:ring-2 focus:ring-coffee-700/20 outline-none text-[15px] font-bold text-espresso-50 shadow-sm transition-all" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[13px] font-bold text-espresso-200 mb-1.5 ml-1">{t('manage_shop.label_roast_level', '로스팅 포인트')}</label>
                                            <input type="text" placeholder={t('manage_shop.ph_roast_level', '예: 약배전 (Light)')} value={editData.beanRoastLevel} onChange={e => setEditData({ ...editData, beanRoastLevel: e.target.value })} className="w-full bg-espresso-900 border border-espresso-600 h-12 px-4 rounded-xl focus:border-coffee-700 focus:ring-2 focus:ring-coffee-700/20 outline-none text-[15px] font-bold text-espresso-50 shadow-sm transition-all" />
                                        </div>
                                        <div>
                                            <label className="block text-[13px] font-bold text-espresso-200 mb-1.5 ml-1">{t('manage_shop.label_tasting_notes', '테이스팅 노트')}</label>
                                            <input type="text" placeholder={t('manage_shop.ph_tasting_notes', '예: 자스민, 베리, 초콜릿')} value={editData.beanNotes} onChange={e => setEditData({ ...editData, beanNotes: e.target.value })} className="w-full bg-espresso-900 border border-espresso-600 h-12 px-4 rounded-xl focus:border-coffee-700 focus:ring-2 focus:ring-coffee-700/20 outline-none text-[15px] font-bold text-espresso-50 shadow-sm transition-all" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-bold text-espresso-200 mb-1.5 ml-1">{t('register_shop.label_signature_menu', '시그니처 메뉴')}</label>
                                        <input type="text" value={editData.signatureMenu} onChange={e => setEditData({ ...editData, signatureMenu: e.target.value })} className="w-full bg-espresso-900 border border-espresso-600 h-12 px-4 rounded-xl focus:border-coffee-700 focus:ring-2 focus:ring-coffee-700/20 outline-none text-[15px] font-bold text-espresso-50 shadow-sm transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-bold text-espresso-200 mb-1.5 ml-1">{t('register_shop.label_dessert', '페어링 디저트 (AI 추천용)')}</label>
                                        <input type="text" value={editData.dessertPairing} onChange={e => setEditData({ ...editData, dessertPairing: e.target.value })} className="w-full bg-espresso-900 border border-espresso-600 h-12 px-4 rounded-xl focus:border-coffee-700 focus:ring-2 focus:ring-coffee-700/20 outline-none text-[15px] font-bold text-espresso-50 shadow-sm transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-bold text-espresso-200 mb-1.5 ml-1">{t('register_shop.label_equipment', '주요 장비 (로스터기, 머신 등)')}</label>
                                        <input type="text" value={editData.equipment} onChange={e => setEditData({ ...editData, equipment: e.target.value })} className="w-full bg-espresso-900 border border-espresso-600 h-12 px-4 rounded-xl focus:border-coffee-700 focus:ring-2 focus:ring-coffee-700/20 outline-none text-[15px] font-bold text-espresso-50 shadow-sm transition-all" />
                                    </div>
                                    
                                    {/* Detailed Menu Items Builder */}
                                    <div className="border border-coffee-100 bg-espresso-900 rounded-xl p-4 space-y-4">
                                        <div className="flex justify-between items-center border-b border-coffee-100 pb-2 mb-2">
                                            <h3 className="font-bold text-[14px] text-espresso-100">{t('register_shop.label_menu_builder', '상세 메뉴 등록')}</h3>
                                            <span className="text-[11px] text-espresso-400">{t('register_shop.label_menu_builder_desc', '개별 메뉴 사진과 가격을 등록합니다.')}</span>
                                        </div>
                                        {menuItems.map((item, idx) => (
                                            <div key={idx} className="bg-espresso-950 p-3 rounded-xl border border-espresso-700 flex gap-3 relative">
                                                <button onClick={() => setMenuItems(prev => prev.filter((_, i) => i !== idx))} className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-espresso-800 rounded-full text-espresso-200 active:scale-95 text-[10px] z-10">✕</button>
                                                <div 
                                                    className="w-20 h-20 shrink-0 bg-espresso-900 rounded-lg border border-espresso-700 overflow-hidden cursor-pointer flex flex-col items-center justify-center relative"
                                                    onClick={() => menuItemImageRefs.current[idx]?.click()}
                                                >
                                                    {item.imageUrl ? <img src={item.imageUrl.startsWith('data:') || item.imageUrl.startsWith('http') ? item.imageUrl : `${API_BASE}${item.imageUrl}`} className="w-full h-full object-cover" alt="" /> : <React.Fragment><Camera size={18} className="text-coffee-400 mb-1" /><span className="text-[10px] text-coffee-400">사진 등록</span></React.Fragment>}
                                                    <input 
                                                        type="file" 
                                                        className="hidden" 
                                                        ref={el => menuItemImageRefs.current[idx] = el}
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                const reader = new FileReader();
                                                                reader.onload = () => {
                                                                    setMenuItems(prev => prev.map((m, i) => i === idx ? { ...m, imageUrl: reader.result as string, imageFile: file } : m));
                                                                };
                                                                reader.readAsDataURL(file);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex-1 space-y-2.5 pt-1">
                                                    <input type="text" placeholder={t('register_shop.ph_item_name', '메뉴명 (예: 아메리카노)')} value={item.name} onChange={e => setMenuItems(prev => prev.map((m, i) => i === idx ? { ...m, name: e.target.value } : m))} className="w-full bg-transparent border-b border-espresso-700 focus:border-coffee-500 outline-none text-[14px] font-bold text-espresso-50 pb-1" />
                                                    <div className="flex gap-2">
                                                        <select value={item.category} onChange={e => setMenuItems(prev => prev.map((m, i) => i === idx ? { ...m, category: e.target.value } : m))} className="bg-espresso-900 border border-espresso-700 text-[11px] font-bold text-espresso-200 rounded px-1.5 h-8 outline-none">
                                                            <option value="COFFEE">Coffee</option>
                                                            <option value="DESSERT">Dessert</option>
                                                            <option value="BEVERAGE">Beverage</option>
                                                            <option value="TEA">Tea</option>
                                                            <option value="BREAD">Bread</option>
                                                            <option value="FOOD">Food</option>
                                                            <option value="ETC">Etc</option>
                                                        </select>
                                                        <input type="text" placeholder={t('register_shop.ph_item_price', '가격 (예: 5,000원 또는 변동)')} value={item.price} onChange={e => setMenuItems(prev => prev.map((m, i) => i === idx ? { ...m, price: e.target.value } : m))} className="flex-1 bg-transparent border-b border-espresso-700 focus:border-coffee-500 outline-none text-[13px] font-medium text-espresso-200 pb-1 h-8" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <button onClick={() => setMenuItems(prev => [...prev, { name: '', price: '', category: 'COFFEE', imageUrl: null }])} className="w-full py-3 rounded-xl border border-dashed border-coffee-400 bg-espresso-950 text-coffee-400 font-bold text-[13px] flex items-center justify-center gap-2 hover:bg-espresso-800 transition-colors">
                                            + {t('register_shop.btn_add_menu_item', '상세 메뉴 추가')}
                                        </button>
                                    </div>

                                    {/* Sub Menu Images Uploaders */}
                                    <div className="space-y-6 pt-4">
                                        {/* Coffee Menu Images */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="block text-[13px] font-bold text-espresso-200 ml-1">{t('manage_shop.label_menu_image', '커피 메뉴판 이미지')}</label>
                                                <span className="text-[12px] font-normal text-coffee-400">{coffeeMenuImages.length}/5</span>
                                            </div>
                                            <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar snap-x">
                                                {coffeeMenuImages.length < 5 && (
                                                    <button onClick={() => coffeeMenuInputRef.current?.click()} className="w-24 h-24 shrink-0 rounded-2xl border-2 border-dashed border-espresso-700 bg-espresso-950 flex flex-col items-center justify-center text-coffee-400 hover:bg-espresso-800 transition-colors snap-center">
                                                        <Camera size={24} className="mb-1" />
                                                        <span className="text-[11px] font-bold">{t('manage_shop.btn_add_menu', '메뉴 등록')}</span>
                                                    </button>
                                                )}
                                                {coffeeMenuImages.map((media, idx) => (
                                                    <div key={idx} className="relative w-24 h-24 shrink-0 snap-center rounded-2xl overflow-hidden border-2 border-espresso-700">
                                                        <img src={media.url.startsWith('data:') || media.url.startsWith('http') ? media.url : `${API_BASE}${media.url}`} alt={`Menu ${idx}`} className="w-full h-full object-cover" />
                                                        <button onClick={() => removeMenuFile(idx, setCoffeeMenuImages)} className="absolute top-1.5 right-1.5 w-6 h-6 bg-espresso-950/50 text-espresso-50 rounded-full flex items-center justify-center backdrop-blur-sm shadow-sm active:scale-90">
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                                <input type="file" ref={coffeeMenuInputRef} onChange={(e) => handleMenuFileChange(e, setCoffeeMenuImages)} multiple accept="image/*" className="hidden" />
                                            </div>
                                        </div>

                                        {/* Popular Menu Images */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="block text-[13px] font-bold text-espresso-200 ml-1">{t('manage_shop.label_popular_image', '인기 디저트/메뉴 이미지')}</label>
                                                <span className="text-[12px] font-normal text-coffee-400">{popularMenuImages.length}/5</span>
                                            </div>
                                            <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar snap-x">
                                                {popularMenuImages.length < 5 && (
                                                    <button onClick={() => popularMenuInputRef.current?.click()} className="w-24 h-24 shrink-0 rounded-2xl border-2 border-dashed border-espresso-700 bg-espresso-950 flex flex-col items-center justify-center text-coffee-400 hover:bg-espresso-800 transition-colors snap-center">
                                                        <Camera size={24} className="mb-1" />
                                                        <span className="text-[11px] font-bold">{t('manage_shop.btn_add_popular', '사진 등록')}</span>
                                                    </button>
                                                )}
                                                {popularMenuImages.map((media, idx) => (
                                                    <div key={idx} className="relative w-24 h-24 shrink-0 snap-center rounded-2xl overflow-hidden border-2 border-espresso-700">
                                                        <img src={media.url.startsWith('data:') || media.url.startsWith('http') ? media.url : `${API_BASE}${media.url}`} alt={`Popular ${idx}`} className="w-full h-full object-cover" />
                                                        <button onClick={() => removeMenuFile(idx, setPopularMenuImages)} className="absolute top-1.5 right-1.5 w-6 h-6 bg-espresso-950/50 text-espresso-50 rounded-full flex items-center justify-center backdrop-blur-sm shadow-sm active:scale-90">
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                                <input type="file" ref={popularMenuInputRef} onChange={(e) => handleMenuFileChange(e, setPopularMenuImages)} multiple accept="image/*" className="hidden" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Taste Profile Sliders */}
                                <div className="space-y-4 pt-4">
                                    <h4 className="font-bold text-espresso-50 border-b border-coffee-100 pb-2 text-[15px]">{t('manage_shop.title_taste_profile', '원두 맛 프로필')}</h4>
                                    {[
                                        { id: 'acidity', label: t('manage_shop.taste_acidity', '산미 (Acidity)'), min: t('manage_shop.taste_min_less', '적게'), max: t('manage_shop.taste_max_more', '많이') },
                                        { id: 'sweetness', label: t('manage_shop.taste_sweetness', '단맛 (Sweetness)'), min: t('manage_shop.taste_min_less', '적게'), max: t('manage_shop.taste_max_more', '많이') },
                                        { id: 'bitterness', label: t('manage_shop.taste_bitterness', '쓴맛 (Bitterness)'), min: t('manage_shop.taste_min_less', '적게'), max: t('manage_shop.taste_max_more', '많이') },
                                        { id: 'body', label: t('manage_shop.taste_body', '바디감 (Body)'), min: t('manage_shop.taste_min_light', '가볍게'), center: t('manage_shop.taste_center_balance', '균형'), max: t('manage_shop.taste_max_heavy', '무겁게') }
                                    ].map(taste => (
                                        <div key={taste.id}>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-[14px] font-bold text-espresso-200">{taste.label}</label>
                                                <span className="text-coffee-600 font-bold bg-espresso-800 px-2 py-0.5 rounded-md text-[13px]">{(editData as any)[taste.id]} / 5</span>
                                            </div>
                                            <input
                                                type="range" min="1" max="5" step="0.5"
                                                value={(editData as any)[taste.id]}
                                                onChange={e => setEditData({ ...editData, [taste.id]: Number(e.target.value) })}
                                                className="w-full accent-coffee-700 h-1.5 bg-espresso-800 rounded-lg appearance-none cursor-pointer"
                                            />
                                            <div className="flex justify-between relative text-[10px] font-bold text-coffee-400 mt-1.5 px-0.5">
                                                <span>{taste.min || t('manage_shop.lbl_taste_min', 'Low')}</span>
                                                {taste.center && <span className="absolute left-1/2 -translate-x-1/2">{taste.center}</span>}
                                                <span>{taste.max || t('manage_shop.lbl_taste_max', 'High')}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Options */}
                                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-coffee-100">
                                    <button onClick={() => setEditData({ ...editData, hasDecaf: !editData.hasDecaf })} className={`h-12 rounded-xl text-[13px] font-bold transition-colors ${editData.hasDecaf ? 'bg-coffee-800 text-espresso-50 border-2 border-coffee-800' : 'bg-espresso-950 border border-coffee-100 text-coffee-400'}`}>
                                        {t('manage_shop.btn_has_decaf', '디카페인 보유')}
                                    </button>
                                    <button onClick={() => setEditData({ ...editData, hasOatMilk: !editData.hasOatMilk })} className={`h-12 rounded-xl text-[13px] font-bold transition-colors ${editData.hasOatMilk ? 'bg-coffee-800 text-espresso-50 border-2 border-coffee-800' : 'bg-espresso-950 border border-coffee-100 text-coffee-400'}`}>
                                        {t('manage_shop.btn_has_oatmilk', '오트밀크 변경 가능')}
                                    </button>
                                </div>

                                {/* Media Uploader */}
                                <div className="space-y-4 pt-4 border-t border-coffee-100">
                                    <div>
                                        <h4 className="font-bold text-espresso-50 border-b border-coffee-100 pb-2 text-[15px] flex items-center justify-between">
                                            <span>{t('manage_shop.title_media', '매장 사진/영상 수정')}</span>
                                            <span className="text-[12px] font-normal text-coffee-400">{mediaFiles.length}/5</span>
                                        </h4>
                                        <p className="text-[12px] text-espresso-300 mt-2 mb-3">{t('manage_shop.desc_media', '최대 5장까지 매장의 분위기를 잘 나타내는 사진을 등록할 수 있습니다.')}</p>

                                        <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar snap-x">
                                            {mediaFiles.length < 5 && (
                                                <button onClick={() => fileInputRef.current?.click()} className="w-24 shrink-0 rounded-2xl border-2 border-dashed border-espresso-700 bg-espresso-950 flex flex-col items-center justify-center text-coffee-400 hover:bg-espresso-800 transition-colors snap-center">
                                                    <Camera size={24} className="mb-1" />
                                                    <span className="text-[11px] font-bold">{t('manage_shop.btn_add_media', '추가')}</span>
                                                </button>
                                            )}
                                            {mediaFiles.map((media, idx) => (
                                                <div key={idx} className="relative w-24 flex flex-col gap-2 shrink-0 snap-center">
                                                    <div className={`w-24 h-24 rounded-2xl overflow-hidden border-2 relative border-espresso-700`}>
                                                        {media.file?.type.startsWith('video/') || media.url.match(/\.(mp4|mov|webm)$/i) ? (
                                                            <div className="w-full h-full bg-espresso-950 flex items-center justify-center relative">
                                                                <video src={media.url.startsWith('data:') || media.url.startsWith('http') ? media.url : `${API_BASE}${media.url}`} className="w-full h-full object-cover opacity-50" />
                                                                <div className="absolute inset-0 flex items-center justify-center">
                                                                    <div className="w-8 h-8 rounded-full bg-espresso-900/20 backdrop-blur-sm flex items-center justify-center">
                                                                        <div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-l-white border-b-[5px] border-b-transparent ml-1" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <img
                                                                src={media.url.startsWith('/mock-bucket') ? 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=200' : (media.url.startsWith('data:') || media.url.startsWith('http') ? media.url : `${API_BASE}${media.url}`)}
                                                                alt={`preview ${idx}`}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=200'; }}
                                                            />
                                                        )}
                                                        <button onClick={() => removeFile(idx)} className="absolute top-1.5 right-1.5 w-6 h-6 bg-espresso-950/50 text-espresso-50 rounded-full flex items-center justify-center backdrop-blur-sm shadow-sm active:scale-90 z-10">
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept="image/*,video/*" className="hidden" />
                                    </div>
                                </div>

                                <div className="pt-6 shrink-0">
                                    <button disabled={isSaving} onClick={handleSave} className="w-full bg-coffee-900 text-espresso-50 py-4 rounded-2xl font-bold text-[16px] active:scale-[0.98] transition-all flex justify-center items-center gap-2 shadow-lg disabled:opacity-70">
                                        {isSaving ? t('manage_shop.status_saving', '저장 중...') : <><Save size={18} /> {t('manage_shop.btn_save_all', '변경사항 완벽하게 저장하기')}</>}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Premium Insights Detailed Report Modal */}
            <AnimatePresence>
                {reportShop && reportShop.premiumStats && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setReportShop(null)} className="fixed inset-0 bg-coffee-900/40 backdrop-blur-sm z-[90]" />
                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="fixed bottom-0 left-0 w-full bg-slate-50 rounded-t-[2rem] z-[95] p-6 pb-[calc(5rem+env(safe-area-inset-bottom))] max-h-[92vh] flex flex-col hide-scrollbar">
                            <div className="w-12 h-1.5 bg-espresso-700 rounded-full mx-auto mb-6 shrink-0" />
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-xl font-serif font-bold text-slate-800 pr-4">{reportShop.name}</h3>
                                    <p className="text-amber-600 font-bold text-[12px] flex items-center gap-1 mt-1"><BarChart2 size={12} /> {t('manage_shop.premium_insight_report', '프리미엄 인사이트 리포트')}</p>
                                </div>
                                <button onClick={() => setReportShop(null)} className="p-2 -mr-2 bg-slate-200 text-slate-600 rounded-full"><X size={20} /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-6 pr-1 pb-6 w-full hide-scrollbar">
                                
                                {/* Overview Cards */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-espresso-900 p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                                        <div className="flex items-center gap-2 mb-2 text-blue-600">
                                            <TrendingUp size={16} />
                                            <span className="text-[12px] font-bold">{t('manage_shop.stat_views_long', '누적 조회수')}</span>
                                        </div>
                                        <div className="text-2xl font-black text-slate-800 mt-auto">
                                            {reportShop.premiumStats.totalViews.toLocaleString()} <span className="text-[12px] font-medium text-slate-400">{t('manage_shop.unit_times', '회')}</span>
                                        </div>
                                    </div>
                                    <div className="bg-espresso-900 p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                                        <div className="flex items-center gap-2 mb-2 text-emerald-600">
                                            <Users size={16} />
                                            <span className="text-[12px] font-bold">{t('manage_shop.stat_visitors', '주간 신규 방문자')}</span>
                                        </div>
                                        <div className="text-2xl font-black text-slate-800 mt-auto">
                                            {reportShop.premiumStats.recentVisitors.toLocaleString()} <span className="text-[12px] font-medium text-slate-400">{t('manage_shop.unit_people', '명')}</span>
                                        </div>
                                    </div>
                                    <div className="bg-espresso-900 p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                                        <div className="flex items-center gap-2 mb-2 text-purple-600">
                                            <Target size={16} />
                                            <span className="text-[12px] font-bold">{t('manage_shop.stat_ai', 'AI 매커니즘 추천')}</span>
                                        </div>
                                        <div className="text-2xl font-black text-slate-800 mt-auto">
                                            {reportShop.premiumStats.searchAppearances.toLocaleString()} <span className="text-[12px] font-medium text-slate-400">{t('manage_shop.unit_times', '회')}</span>
                                        </div>
                                    </div>
                                    <div className="bg-espresso-900 p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                                        <div className="flex items-center gap-2 mb-2 text-rose-500">
                                            <Star size={16} />
                                            <span className="text-[12px] font-bold">{t('manage_shop.stat_bookmarks_long', '누적 찜하기')}</span>
                                        </div>
                                        <div className="text-2xl font-black text-slate-800 mt-auto">
                                            {reportShop.premiumStats.totalBookmarks.toLocaleString()} <span className="text-[12px] font-medium text-slate-400">{t('manage_shop.unit_people', '명')}</span>
                                        </div>
                                        <p className="text-center text-[11px] text-slate-400 mt-6 font-medium">
                                            {t('manage_shop.insight_beta_notice', '※ 베타 기간 동안 제공되는 시뮬레이션 데이터입니다.')}
                                        </p>
                                    </div>
                                </div>

                                {/* AI Insight Box */}
                                <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-5 rounded-2xl border border-amber-100/50 shadow-inner">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles size={16} className="text-amber-600" />
                                        <h4 className="font-bold text-amber-900 text-[14px]">{t('manage_shop.ai_insight_title', 'AI 성과 분석 인사이트')}</h4>
                                    </div>
                                    <p className="text-[13px] text-amber-800 leading-relaxed font-medium">
                                        {reportShop.premiumStats.searchAppearances > 0 
                                            ? t('manage_shop.ai_insight_desc_high', '지도 검색과 원두 큐레이션 매커니즘을 통해 이번 달 {{count}}번 유저들에게 상점이 추천되었습니다. 추천 트래픽 대비 상세 페이지 열람 전환율을 높이려면, 매장의 매력을 어필할 수 있는 고화질 시그니처 메뉴 사진을 상단에 배치해 보세요!', { count: reportShop.premiumStats.searchAppearances })
                                            : t('manage_shop.ai_insight_desc_low', '프로필 정보가 부족하여 아직 AI 큐레이션 엔진이 매장을 활발히 추천하지 않았을 수 있습니다. 테이스팅 노트와 장비 정보를 자세히 기재해 주시면 더 많은 고객과 연결될 수 있습니다.')}
                                    </p>
                                </div>

                                {/* Traffic Source Progress Bars (Mock Data for MVP) */}
                                <div className="bg-espresso-900 p-5 rounded-2xl shadow-sm border border-slate-100">
                                    <h4 className="font-bold text-slate-800 text-[14px] mb-4 flex items-center gap-2">
                                        <Activity size={16} className="text-slate-500" /> {t('manage_shop.traffic_source_title', '트래픽 유입 경로 분석')}
                                    </h4>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between text-[12px] font-bold mb-1.5">
                                                <span className="text-slate-600">{t('manage_shop.traffic_ai_match', 'AI 큐레이터 매칭 (내 취향 커피 찾기)')}</span>
                                                <span className="text-slate-900">45%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2">
                                                <div className="bg-purple-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-[12px] font-bold mb-1.5">
                                                <span className="text-slate-600">{t('manage_shop.traffic_map_search', '지도 검색 및 내 주변 탐색')}</span>
                                                <span className="text-slate-900">35%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2">
                                                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '35%' }}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-[12px] font-bold mb-1.5">
                                                <span className="text-slate-600">{t('manage_shop.traffic_external', '외부 공유 링크 접근')}</span>
                                                <span className="text-slate-900">20%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2">
                                                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '20%' }}></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-400 font-medium text-center">
                                        {t('manage_shop.traffic_notice', '유입 경로 통계는 이번 달(최근 30일) 누적 데이터를 바탕으로 집계됩니다.')}
                                    </div>
                                </div>

                                <button onClick={() => setReportShop(null)} className="w-full py-4 bg-slate-100 text-slate-700 font-bold rounded-xl text-[14px] active:scale-[0.98] transition-all">
                                    {t('manage_shop.btn_close', '닫기')}
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Host Story Modal */}
            <AnimatePresence>
                {storyShop && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setStoryShop(null)} className="fixed inset-0 bg-coffee-900/60 backdrop-blur-sm z-[100]" />
                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="fixed bottom-0 left-0 w-full bg-espresso-900 rounded-t-[2rem] z-[105] p-6 pb-[calc(5rem+env(safe-area-inset-bottom))] flex flex-col hide-scrollbar shadow-2xl">
                            <div className="w-12 h-1.5 bg-espresso-700 rounded-full mx-auto mb-6 shrink-0" />
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-xl font-serif font-bold text-espresso-50 pr-4">{t('manage_shop.story_title', '소식 발행하기')}</h3>
                                    <p className="text-[13px] font-medium text-espresso-300 mt-1">{t('manage_shop.story_subtitle', '단골 고객(팔로워)들의 피드에 노출됩니다.')}</p>
                                </div>
                                <button onClick={() => setStoryShop(null)} className="p-2 -mr-2 bg-espresso-800 text-coffee-600 rounded-full"><X size={20} /></button>
                            </div>

                            <div className="flex-1 space-y-4">
                                <div className="bg-orange-50/50 border border-orange-100 p-4 rounded-xl flex gap-3 text-orange-800">
                                    <Store size={20} className="shrink-0 mt-0.5" />
                                    <span className="text-[13px] font-bold leading-relaxed">{storyShop.name} {t('manage_shop.story_shop_name_suffix', '이름으로 공식 소식이 발행됩니다.')}</span>
                                </div>

                                <div>
                                    <textarea 
                                        placeholder={t('manage_shop.ph_story_content', '예: 오늘 스페셜티 원두 갓 로스팅했습니다! / 이번 주 일요일은 단축 영업합니다.')}
                                        value={storyContent}
                                        onChange={e => setStoryContent(e.target.value)}
                                        className="w-full h-32 bg-espresso-950 border border-espresso-700 rounded-xl p-4 text-[15px] outline-none focus:ring-2 focus:ring-coffee-500 transition-all resize-none"
                                    />
                                </div>

                                <div>
                                    <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                                        {storyImages.length < 3 && (
                                            <button onClick={() => storyImageInputRef.current?.click()} className="w-20 h-20 shrink-0 border border-dashed border-espresso-600 rounded-xl bg-espresso-950 flex flex-col items-center justify-center text-espresso-300 hover:bg-espresso-800 transition-colors">
                                                <ImageIcon size={20} className="mb-1" />
                                                <span className="text-[10px] font-bold">{storyImages.length}/3</span>
                                            </button>
                                        )}
                                        {storyImages.map((img, idx) => (
                                            <div key={idx} className="w-20 h-20 shrink-0 relative rounded-xl overflow-hidden border border-espresso-700">
                                                <img src={img.url.startsWith('data:') || img.url.startsWith('http') ? img.url : `${API_BASE}${img.url}`} alt="Story preview" className="w-full h-full object-cover" />
                                                <button onClick={() => setStoryImages(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 w-5 h-5 bg-espresso-950/60 text-espresso-50 rounded-full flex items-center justify-center backdrop-blur-sm">
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <input type="file" ref={storyImageInputRef} onChange={handleStoryImageChange} accept="image/*" multiple className="hidden" />
                                </div>

                                <div className="mt-4 bg-orange-950/20 border border-orange-500/20 rounded-xl p-4">
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <div className="mt-0.5">
                                            <input 
                                                type="checkbox" 
                                                checked={sendEmail} 
                                                onChange={e => setSendEmail(e.target.checked)} 
                                                className="w-5 h-5 accent-orange-500 rounded cursor-pointer" 
                                            />
                                        </div>
                                        <div>
                                            <span className="block text-[14px] font-bold text-orange-50 mb-0.5 group-hover:text-orange-200 transition-colors">
                                                📧 {t('manage_shop.opt_send_email', '단골 고객들에게 다이렉트 이메일로도 발송하기 (선택)')}
                                            </span>
                                            <span className="block text-[12px] text-orange-200/70 font-medium leading-relaxed">
                                                {t('manage_shop.opt_send_email_desc', '체크 시 매장을 팔로우하는 단골 고객 전체에게 이메일(뉴스레터) 형태로 추가 안내됩니다. 스팸 방지를 위해 중요한 이벤트(쿠폰/정기배송 등)에만 1일 1회 사용을 권장합니다.')}
                                            </span>
                                        </div>
                                    </label>
                                </div>

                                <button 
                                    disabled={isSubmittingStory || !storyContent.trim()} 
                                    onClick={handlePublishStory} 
                                    className="w-full bg-orange-500 text-espresso-50 py-4 rounded-xl font-bold text-[16px] shadow-md shadow-orange-500/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                                >
                                    {isSubmittingStory ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <><Megaphone size={18} /> {t('manage_shop.btn_publish_story_submit', '단골들에게 소식 전송하기')}</>}
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>



        </div>
    );
}
