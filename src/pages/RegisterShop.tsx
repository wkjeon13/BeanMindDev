import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Store, MapPin, Camera, Coffee, Type, Utensils, CheckCircle2, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DaumPostcodeEmbed from 'react-daum-postcode';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { API_BASE } from '../utils/apiConfig';
import { useTranslation } from 'react-i18next';

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

export default function RegisterShop() {

    const { t } = useTranslation();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [direction, setDirection] = useState(1);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to top when step changes
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [step]);

    const [userCountryCode, setUserCountryCode] = useState('KR');
    useEffect(() => {
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                if (user.countryCode) setUserCountryCode(user.countryCode);
            }
        } catch (e) {
            console.error(e);
        }
    }, []);

    const [shopData, setShopData] = useState({
        name: '', address: '', detailAddress: '', phone: '', hours: '', shortDesc: '', longDesc: '',
        signatureBean: '', signatureMenu: '', dessertPairing: '', equipment: 'Espresso Machine', websiteUrl: '',
        acidity: 3, sweetness: 3, bitterness: 3, body: 3,
        primaryCoffeeType: 'GENERAL',
        hasDecaf: false, hasOatMilk: false,
        hasParking: false, hasWifi: false, hasPetFriendly: false, hasPowerOutlets: false,
        businessNumber: '', ownerName: '', settlementAccount: '',
        lat: 37.5665, lng: 126.9780 // Default to Seoul City Hall
    });

    const [mapSearchQuery, setMapSearchQuery] = useState('');
    const [isMapSearching, setIsMapSearching] = useState(false);

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

    // Tracks explicit map center separate from shopData to allow panning
    const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);

    useEffect(() => {
        // Attempt to get user's current location for the map center
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
                    setShopData(prev => ({
                        ...prev,
                        lat: coords[0],
                        lng: coords[1]
                    }));
                    setMapCenter(coords);
                },
                (error) => {
                    console.error("Error getting location:", error);
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        }
    }, []);

    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

    const handleCompleteAddress = (data: any) => {
        let fullAddress = data.address;
        let extraAddress = '';

        if (data.addressType === 'R') {
            if (data.bname !== '') {
                extraAddress += data.bname;
            }
            if (data.buildingName !== '') {
                extraAddress += extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName;
            }
            fullAddress += extraAddress !== '' ? ` (${extraAddress})` : '';
        }

        setShopData({ ...shopData, address: fullAddress });
        setIsAddressModalOpen(false);
    };

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [mediaFiles, setMediaFiles] = useState<File[]>([]);
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setMediaFiles((prev) => [...prev, ...Array.from(e.target.files as FileList)].slice(0, 5));
        }
    };
    const removeFile = (index: number) => {
        setMediaFiles(prev => prev.filter((_, i) => i !== index));
    };

    const coffeeMenuInputRef = useRef<HTMLInputElement>(null);
    const [coffeeMenuImages, setCoffeeMenuImages] = useState<File[]>([]);
    const popularMenuInputRef = useRef<HTMLInputElement>(null);
    const [popularMenuImages, setPopularMenuImages] = useState<File[]>([]);
    
    const [menuItems, setMenuItems] = useState<{name: string; price: string; category: string; imageUrl: string | null}[]>([]);
    const menuItemImageRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

    const handleMenuFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<File[]>>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setter(prev => [...prev, ...newFiles].slice(0, 5));
        }
    };
    const removeMenuFile = (index: number, setter: React.Dispatch<React.SetStateAction<File[]>>) => {
        setter(prev => prev.filter((_, i) => i !== index));
    };

    const nextStep = () => { if (step < 6) { setDirection(1); setStep(s => s + 1); } };
    const prevStep = () => { if (step > 1) { setDirection(-1); setStep(s => s - 1); } else { navigate(-1); } };

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
                    setShopData(prev => ({ ...prev, lat, lng }));
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

    const [isSubmitting, setIsSubmitting] = useState(false);

    const submit = async () => {
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert(t('register_shop.alert_login_req', '매장 등록은 로그인이 필요합니다.'));
                // go to profile page or auth modal
                return;
            }

            // Convert File objects to Base64 strings for DB storage
            const processMultiImages = async (files: File[]) => {
                if (!files || files.length === 0) return null;
                const promises = files.map(f => new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(f);
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = error => reject(error);
                }));
                const results = await Promise.all(promises);
                return JSON.stringify(results);
            };

            const mediaUrls = await Promise.all(mediaFiles.map(f => new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(f);
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = error => reject(error);
            })));

            const coffeeMenuImageUrl = await processMultiImages(coffeeMenuImages);
            const popularMenuImageUrl = await processMultiImages(popularMenuImages);

            const fullAddress = `${shopData.address} ${shopData.detailAddress}`.trim();
            const payload = { ...shopData, address: fullAddress, hours: JSON.stringify(dailyHours), mediaUrls, coffeeMenuImageUrl, popularMenuImageUrl, menuItems };

            const response = await fetch(`${API_BASE}/api/shops/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setDirection(1);
                setStep(6);
            } else {
                const errData = await response.json();
                alert(t('register_shop.alert_submit_fail', '매장 등록 실패: {{error}}', { error: errData.error }));
            }
        } catch (error) {
            console.error(error);
            alert(t('register_shop.alert_server_err', "서버 연결에 실패했습니다."));
        } finally {
            setIsSubmitting(false);
        }
    };

    const pageVariants: any = {
        initial: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
        animate: { x: "0%", opacity: 1, transition: { type: "spring", stiffness: 300, damping: 30 } },
        exit: (dir: number) => ({ x: dir < 0 ? "100%" : "-100%", opacity: 0, transition: { type: "spring", stiffness: 300, damping: 30 } })
    };

    return (
        <div className="h-[100dvh] w-full bg-espresso-950 overflow-hidden flex flex-col text-espresso-50 font-sans relative z-[200]">
            <div className="flex-1 w-full max-w-md mx-auto relative flex flex-col bg-espresso-900 overflow-hidden shadow-2xl">

                {/* Header */}
                {step < 6 && (
                    <div className="px-6 pt-safe mt-6 pb-2 bg-espresso-900 z-10 shrink-0">
                        <div className="flex justify-between items-center mb-4">
                            <button onClick={prevStep} className="p-2 -ml-2 text-espresso-100 hover:bg-espresso-800 rounded-full transition-colors active:scale-95">
                                <ChevronLeft size={28} />
                            </button>
                            <span className="text-sm font-mono uppercase tracking-widest text-coffee-400 font-bold">{t(`register_shop.step_0${step}`)}</span>
                            <div className="w-10"></div>
                        </div>
                        <div className="w-full h-1.5 bg-espresso-800 rounded-full overflow-hidden">
                            <motion.div className="h-full bg-coffee-700 rounded-full" initial={{ width: `${((step - 1) / 5) * 100}%` }} animate={{ width: `${(step / 5) * 100}%` }} transition={{ duration: 0.3 }} />
                        </div>
                    </div>
                )}

                <div ref={scrollRef} className="flex-1 relative overflow-x-hidden overflow-y-auto pb-24">
                    <AnimatePresence custom={direction} mode="wait">

                        {/* Step 1: Base Info */}
                        {step === 1 && (
                            <motion.div key="s1" custom={direction} variants={pageVariants} initial="initial" animate="animate" exit="exit" className="w-full px-6 py-6 pb-32 space-y-8">
                                <div>
                                    <h2 className="text-3xl font-serif font-bold text-espresso-50 leading-tight" dangerouslySetInnerHTML={{ __html: t('register_shop.s1_title') }} />
                                    <p className="text-espresso-300 mt-2">{t('register_shop.s1_desc', '기본 정보를 입력해 주세요.')}</p>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[13px] font-bold text-coffee-600 mb-1.5 ml-1">{t('register_shop.label_shop_name', '매장명')}</label>
                                        <div className="relative">
                                            <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-coffee-400" size={18} />
                                            <input type="text" placeholder={t('register_shop.ph_shop_name')} className="w-full bg-espresso-950 border border-coffee-100 h-14 pl-12 pr-4 rounded-xl focus:ring-2 focus:ring-coffee-700 outline-none text-[15px] font-bold text-espresso-50" value={shopData.name} onChange={e => setShopData({ ...shopData, name: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[13px] font-bold text-coffee-600 ml-1">{t('register_shop.label_address', '매장 주소')}</label>
                                        {userCountryCode === 'KR' ? (
                                            <div className="relative">
                                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-coffee-400 pointer-events-none" size={18} />
                                                <input type="text" readOnly placeholder={t('register_shop.ph_address')} className="w-full bg-espresso-950 border border-coffee-100 h-14 pl-12 pr-20 rounded-xl outline-none text-[15px] font-bold text-espresso-50 cursor-pointer placeholder-coffee-400/70" value={shopData.address} onClick={() => setIsAddressModalOpen(true)} />
                                                <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-coffee-800 text-espresso-50 text-[11px] font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-transform" onClick={(e) => { e.preventDefault(); setIsAddressModalOpen(true); }}>
                                                    {t('register_shop.btn_address_search', '주소 검색')}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-coffee-400 pointer-events-none" size={18} />
                                                <input type="text" placeholder={t('register_shop.ph_address')} className="w-full bg-espresso-950 border border-coffee-100 h-14 pl-12 pr-4 rounded-xl outline-none text-[15px] font-bold text-espresso-50 placeholder-coffee-400/70 focus:ring-2 focus:ring-coffee-700" value={shopData.address} onChange={e => setShopData({ ...shopData, address: e.target.value })} />
                                            </div>
                                        )}
                                        <input type="text" placeholder={t('register_shop.ph_detail_address')} className="w-full bg-espresso-950 border border-coffee-100 h-14 px-4 rounded-xl focus:ring-2 focus:ring-coffee-700 outline-none text-[15px] font-bold text-espresso-50" value={shopData.detailAddress} onChange={e => setShopData({ ...shopData, detailAddress: e.target.value })} />

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
                                                    center={mapCenter || [shopData.lat, shopData.lng]}
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
                                                        position={[shopData.lat, shopData.lng]}
                                                        setPosition={(pos) => setShopData({ ...shopData, lat: pos.lat, lng: pos.lng })}
                                                    />
                                                </MapContainer>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[13px] font-bold text-coffee-600 mb-1.5 ml-1">{t('register_shop.label_phone', '연락처')}</label>
                                            <input type="tel" placeholder={t('register_shop.ph_phone')} className="w-full bg-espresso-950 border border-coffee-100 h-14 px-4 rounded-xl focus:ring-2 focus:ring-coffee-700 outline-none text-[15px] font-bold text-espresso-50" value={shopData.phone} onChange={e => setShopData({ ...shopData, phone: e.target.value })} />
                                        </div>
                                                                                <div className="col-span-2 mt-2">
                                            <div className="flex justify-between items-end mb-1.5 ml-1">
                                                <label className="block text-[13px] font-bold text-coffee-600">{t('register_shop.label_hours', '영업시간')}</label>
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
                                            <div className="space-y-2 border border-coffee-100 bg-espresso-950 p-3 rounded-xl">
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
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-bold text-coffee-600 mb-1.5 ml-1">{t('register_shop.label_website', '홈페이지 / SNS / 블로그 링크')}</label>
                                        <input type="url" placeholder={t('register_shop.ph_website')} className="w-full bg-espresso-950 border border-coffee-100 h-14 px-4 rounded-xl focus:ring-2 focus:ring-coffee-700 outline-none text-[15px] font-bold text-espresso-50" value={shopData.websiteUrl} onChange={e => setShopData({ ...shopData, websiteUrl: e.target.value })} />
                                    </div>

                                    {/* Business Profile Section */}
                                    <div className="mt-4 border border-coffee-100 rounded-xl overflow-hidden bg-espresso-900 px-4 py-4 space-y-4">
                                        <h3 className="font-bold text-[14px] text-espresso-100 border-b border-coffee-100 pb-2">{t('register_shop.biz_info_title', '기본 비즈니스 정보 (프리미엄 정산용)')}</h3>
                                        <div>
                                            <label className="block text-[12px] font-bold text-coffee-600 mb-1">{t('register_shop.label_owner_name', '대표자 성명')}</label>
                                            <input type="text" placeholder={t('register_shop.ph_owner_name')} className="w-full bg-espresso-950 border border-coffee-100 h-12 px-3 rounded-lg focus:ring-2 focus:ring-coffee-700 outline-none text-[14px] font-bold text-espresso-50" value={shopData.ownerName} onChange={e => setShopData({ ...shopData, ownerName: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-[12px] font-bold text-coffee-600 mb-1">{t('register_shop.label_biz_number', '사업자등록번호')}</label>
                                            <input type="text" placeholder={t('register_shop.ph_biz_number')} className="w-full bg-espresso-950 border border-coffee-100 h-12 px-3 rounded-lg focus:ring-2 focus:ring-coffee-700 outline-none text-[14px] font-bold text-espresso-50" value={shopData.businessNumber} onChange={e => setShopData({ ...shopData, businessNumber: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-[12px] font-bold text-coffee-600 mb-1">{t('register_shop.label_account', '정산 대금 수령 계좌')}</label>
                                            <input type="text" placeholder={t('register_shop.ph_account')} className="w-full bg-espresso-950 border border-coffee-100 h-12 px-3 rounded-lg focus:ring-2 focus:ring-coffee-700 outline-none text-[14px] font-bold text-espresso-50" value={shopData.settlementAccount} onChange={e => setShopData({ ...shopData, settlementAccount: e.target.value })} />
                                            <p className="text-[11px] text-coffee-400 mt-1">{t('register_shop.account_notice', '※ 향후 커피쿠폰 판매 대금 정산 시 사용됩니다.')}</p>
                                        </div>
                                    </div>

                                </div>
                            </motion.div>
                        )}

                        {/* Step 2: Story & Media */}
                        {step === 2 && (
                            <motion.div key="s2" custom={direction} variants={pageVariants} initial="initial" animate="animate" exit="exit" className="w-full px-6 py-6 pb-32 space-y-8">
                                <div>
                                    <h2 className="text-3xl font-serif font-bold text-espresso-50 leading-tight" dangerouslySetInnerHTML={{ __html: t('register_shop.s2_title') }} />
                                </div>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[13px] font-bold text-coffee-600 mb-1.5 ml-1">{t('register_shop.label_short_desc', '한 줄 소개')}</label>
                                        <input type="text" placeholder={t('register_shop.ph_short_desc')} className="w-full bg-espresso-950 border border-coffee-100 h-14 px-4 rounded-xl focus:ring-2 focus:ring-coffee-700 outline-none text-[15px] font-bold text-espresso-50" value={shopData.shortDesc} onChange={e => setShopData({ ...shopData, shortDesc: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-bold text-coffee-600 mb-1.5 ml-1">{t('register_shop.label_long_desc', '상세 스토리 / 철학')}</label>
                                        <textarea placeholder={t('register_shop.ph_long_desc')} className="w-full bg-espresso-950 border border-coffee-100 h-32 p-4 rounded-xl focus:ring-2 focus:ring-coffee-700 outline-none text-[15px] font-bold text-espresso-50 resize-none leading-relaxed" value={shopData.longDesc} onChange={e => setShopData({ ...shopData, longDesc: e.target.value })}></textarea>
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-bold text-coffee-600 mb-1.5 ml-1">{t('register_shop.label_media', '미디어 갤러리 등록 ({{count}}/5)', { count: mediaFiles.length })}</label>
                                        <div className="relative w-full h-32">
                                            <input type="file" multiple accept="image/*,video/*" className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" onChange={handleFileChange} />
                                            <div className="absolute inset-0 w-full h-full border-2 border-dashed border-espresso-700 bg-espresso-950/50 rounded-2xl flex flex-col items-center justify-center text-coffee-400">
                                                <Camera size={28} className="mb-2" />
                                                <span className="text-[13px] font-bold">{t('register_shop.media_upload_title', '사진 또는 동영상 업로드하기')}</span>
                                                <span className="text-[11px]">{t('register_shop.media_upload_desc', '최대 5장 (현재 {{count}}장)', { count: mediaFiles.length })}</span>
                                            </div>
                                        </div>
                                        {mediaFiles.length > 0 && (
                                            <div className="flex gap-3 mt-4 overflow-x-auto pb-4 hide-scrollbar">
                                                {mediaFiles.map((file, i) => (
                                                    <div key={i} className="relative w-24 flex flex-col gap-2 shrink-0">
                                                        <div className={`w-24 h-24 rounded-2xl overflow-hidden border-2 bg-espresso-950 relative border-coffee-100`}>
                                                            {file.type.startsWith('image/') ? (
                                                                <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-coffee-400 bg-espresso-800">VIDEO</div>
                                                            )}
                                                            <button onClick={() => removeFile(i)} className="absolute top-1.5 right-1.5 w-6 h-6 bg-espresso-950/60 backdrop-blur-sm rounded-full text-espresso-50 flex items-center justify-center text-[10px] font-bold shadow-sm z-10 active:scale-95 transition-transform">✕</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 3: Taste Profile */}
                        {step === 3 && (
                            <motion.div key="s3" custom={direction} variants={pageVariants} initial="initial" animate="animate" exit="exit" className="w-full px-6 py-6 pb-32 space-y-6">
                                <div>
                                    <h2 className="text-3xl font-serif font-bold text-espresso-50 leading-tight" dangerouslySetInnerHTML={{ __html: t('register_shop.s3_title') }} />
                                    <p className="text-espresso-300 mt-2 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: t('register_shop.s3_desc') }} />
                                </div>

                                <div className="flex flex-col gap-4">
                                    <div>
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
                                                    onClick={() => setShopData({ ...shopData, primaryCoffeeType: type.id })}
                                                    className={`p-4 rounded-xl border-2 text-left font-bold text-[14px] transition-all flex items-center justify-between ${shopData.primaryCoffeeType === type.id ? 'border-coffee-700 bg-espresso-950 text-espresso-50' : 'border-coffee-100 bg-espresso-900 text-espresso-300'}`}
                                                >
                                                    <span>{type.label}</span>
                                                    {shopData.primaryCoffeeType === type.id && <CheckCircle2 size={18} className="text-espresso-200" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-espresso-900 p-5 rounded-2xl border-2 border-coffee-100 focus-within:border-espresso-600">
                                        <label className="block text-[14px] font-bold text-espresso-50 mb-2">{t('register_shop.label_signature_bean', '대표 원두명 / 싱글 오리진 등')}</label>
                                        <input type="text" placeholder={t('register_shop.ph_signature_bean')} className="w-full bg-espresso-950 border border-coffee-100 h-14 px-4 rounded-xl focus:ring-2 focus:ring-coffee-700 outline-none text-[15px] font-bold text-espresso-50" value={shopData.signatureBean} onChange={e => setShopData({ ...shopData, signatureBean: e.target.value })} />
                                    </div>
                                    {[
                                        { id: 'acidity', title: t('register_shop.taste_acidity', '산미 (신맛)'), min: t('register_shop.taste_min_less', '적게'), max: t('register_shop.taste_max_more', '많이') },
                                        { id: 'sweetness', title: t('register_shop.taste_sweetness', '단맛'), min: t('register_shop.taste_min_less', '적게'), max: t('register_shop.taste_max_more', '많이') },
                                        { id: 'bitterness', title: t('register_shop.taste_bitterness', '쓴맛'), min: t('register_shop.taste_min_less', '적게'), max: t('register_shop.taste_max_more', '많이') },
                                        { id: 'body', title: t('register_shop.taste_body', '바디감'), min: t('register_shop.taste_min_light', '가볍게'), center: t('register_shop.taste_center_balance', '균형'), max: t('register_shop.taste_max_heavy', '무겁게') }
                                    ].map(taste => (
                                        <div key={taste.id} className="bg-espresso-900 p-3 rounded-xl border-2 border-coffee-100 focus-within:border-espresso-600">
                                            <div className="flex justify-between items-end mb-2">
                                                <div className="font-bold text-[15px] text-espresso-50">{taste.title}</div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-lg text-espresso-200">{shopData[taste.id as keyof typeof shopData]}</span><span className="text-xs font-medium text-coffee-300">/ 5</span>
                                                </div>
                                            </div>
                                            <input type="range" min="1" max="5" step="0.5" value={shopData[taste.id as keyof typeof shopData] as number} onChange={(e) => setShopData({ ...shopData, [taste.id]: parseFloat(e.target.value) })} className="w-full h-2 bg-espresso-700 rounded-lg appearance-none cursor-pointer accent-coffee-700 shadow-inner" />
                                            <div className="flex justify-between relative text-[11px] font-bold text-coffee-400 mt-2.5 px-0.5">
                                                <span>{taste.min}</span>
                                                {taste.center && <span className="absolute left-1/2 -translate-x-1/2">{taste.center}</span>}
                                                <span>{taste.max}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Step 4: Menus & Desserts */}
                        {step === 4 && (
                            <motion.div key="s4" custom={direction} variants={pageVariants} initial="initial" animate="animate" exit="exit" className="w-full px-6 py-6 pb-32 space-y-8">
                                <div>
                                    <h2 className="text-3xl font-serif font-bold text-espresso-50 leading-tight" dangerouslySetInnerHTML={{ __html: t('register_shop.s4_title') }} />
                                </div>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[13px] font-bold text-coffee-600 mb-1.5 ml-1">{t('register_shop.label_equipment', '주력 추출 장비 (베이스)')}</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {['Espresso Machine', 'Hand Drip', 'Cold Brew', 'Moka Pot'].map(eq => (
                                                <button key={eq} onClick={() => setShopData({ ...shopData, equipment: eq })} className={`p-4 rounded-xl border-2 font-bold text-[14px] transition-all ${shopData.equipment === eq ? 'border-coffee-700 bg-espresso-950 text-espresso-50' : 'border-coffee-100 bg-espresso-900 text-espresso-300'}`}>{eq}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-bold text-coffee-600 mb-1.5 ml-1">{t('register_shop.label_signature_menu', '시그니처 음료')}</label>
                                        <div className="relative">
                                            <Coffee className="absolute left-4 top-1/2 -translate-y-1/2 text-coffee-400" size={18} />
                                            <input type="text" placeholder={t('register_shop.ph_signature_menu')} className="w-full bg-espresso-950 border border-coffee-100 h-14 pl-12 pr-4 rounded-xl focus:ring-2 focus:ring-coffee-700 outline-none text-[15px] font-bold text-espresso-50" value={shopData.signatureMenu} onChange={e => setShopData({ ...shopData, signatureMenu: e.target.value })} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-bold text-coffee-600 mb-1.5 ml-1">{t('register_shop.label_dessert', '페어링 디저트 (AI 추천용)')}</label>
                                        <div className="relative">
                                            <Utensils className="absolute left-4 top-1/2 -translate-y-1/2 text-coffee-400" size={18} />
                                            <input type="text" placeholder={t('register_shop.ph_dessert')} className="w-full bg-espresso-950 border border-coffee-100 h-14 pl-12 pr-4 rounded-xl focus:ring-2 focus:ring-coffee-700 outline-none text-[15px] font-bold text-espresso-50" value={shopData.dessertPairing} onChange={e => setShopData({ ...shopData, dessertPairing: e.target.value })} />
                                        </div>
                                        <p className="text-[11px] text-coffee-400 mt-1.5 ml-1">{t('register_shop.dessert_notice', '입력하신 디저트는 AI가 고객에게 원두와 함께 추천할 때 우선적으로 노출됩니다.')}</p>
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
                                                    {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" alt="" /> : <React.Fragment><Camera size={18} className="text-coffee-400 mb-1" /><span className="text-[10px] text-coffee-400">사진 등록</span></React.Fragment>}
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
                                                                    setMenuItems(prev => prev.map((m, i) => i === idx ? { ...m, imageUrl: reader.result as string } : m));
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
                                    <div className="space-y-6 pt-2">
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
                                                {coffeeMenuImages.map((file, idx) => (
                                                    <div key={idx} className="relative w-24 h-24 shrink-0 snap-center rounded-2xl overflow-hidden border-2 border-espresso-700">
                                                        <img src={URL.createObjectURL(file)} alt={`Menu ${idx}`} className="w-full h-full object-cover" />
                                                        <button onClick={() => removeMenuFile(idx, setCoffeeMenuImages)} className="absolute top-1.5 right-1.5 w-6 h-6 bg-espresso-950/50 text-espresso-50 rounded-full flex items-center justify-center backdrop-blur-sm shadow-sm active:scale-90">
                                                            ✕
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
                                                {popularMenuImages.map((file, idx) => (
                                                    <div key={idx} className="relative w-24 h-24 shrink-0 snap-center rounded-2xl overflow-hidden border-2 border-espresso-700">
                                                        <img src={URL.createObjectURL(file)} alt={`Popular ${idx}`} className="w-full h-full object-cover" />
                                                        <button onClick={() => removeMenuFile(idx, setPopularMenuImages)} className="absolute top-1.5 right-1.5 w-6 h-6 bg-espresso-950/50 text-espresso-50 rounded-full flex items-center justify-center backdrop-blur-sm shadow-sm active:scale-90">
                                                            ✕
                                                        </button>
                                                    </div>
                                                ))}
                                                <input type="file" ref={popularMenuInputRef} onChange={(e) => handleMenuFileChange(e, setPopularMenuImages)} multiple accept="image/*" className="hidden" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-espresso-950 border border-coffee-100 rounded-xl space-y-3 mt-4">
                                        <h3 className="font-bold text-[14px] text-espresso-100 border-b border-coffee-100 pb-2 mb-3">{t('register_shop.label_options_title', '옵션 변경 가능 여부')}</h3>
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input type="checkbox" className="w-5 h-5 accent-coffee-700 rounded" checked={shopData.hasDecaf} onChange={e => setShopData({ ...shopData, hasDecaf: e.target.checked })} />
                                            <span className="font-bold text-[14px] text-espresso-100">{t('register_shop.opt_decaf', '디카페인 원두 변경 가능')}</span>
                                        </label>
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input type="checkbox" className="w-5 h-5 accent-coffee-700 rounded" checked={shopData.hasOatMilk} onChange={e => setShopData({ ...shopData, hasOatMilk: e.target.checked })} />
                                            <span className="font-bold text-[14px] text-espresso-100">{t('register_shop.opt_oatmilk', '오트밀 / 두유 대체유 변경 가능')}</span>
                                        </label>
                                    </div>

                                    <div className="p-4 bg-espresso-900 border border-espresso-700 shadow-sm rounded-xl space-y-3 mt-4">
                                        <h3 className="font-bold text-[14px] text-espresso-100 border-b border-coffee-100 pb-2 mb-3">{t('register_shop.label_amenities_title', '편의 시설 제공 여부')}</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input type="checkbox" className="w-5 h-5 accent-coffee-700 rounded" checked={shopData.hasParking} onChange={e => setShopData({ ...shopData, hasParking: e.target.checked })} />
                                                <span className="font-bold text-[14px] text-espresso-100">{t('register_shop.amenity_parking', '🚙 주차 가능')}</span>
                                            </label>
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input type="checkbox" className="w-5 h-5 accent-coffee-700 rounded" checked={shopData.hasWifi} onChange={e => setShopData({ ...shopData, hasWifi: e.target.checked })} />
                                                <span className="font-bold text-[14px] text-espresso-100">{t('register_shop.amenity_wifi', '📶 와이파이')}</span>
                                            </label>
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input type="checkbox" className="w-5 h-5 accent-coffee-700 rounded" checked={shopData.hasPowerOutlets} onChange={e => setShopData({ ...shopData, hasPowerOutlets: e.target.checked })} />
                                                <span className="font-bold text-[14px] text-espresso-100">{t('register_shop.amenity_power', '🔌 콘센트 제공')}</span>
                                            </label>
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input type="checkbox" className="w-5 h-5 accent-coffee-700 rounded" checked={shopData.hasPetFriendly} onChange={e => setShopData({ ...shopData, hasPetFriendly: e.target.checked })} />
                                                <span className="font-bold text-[14px] text-espresso-100">{t('register_shop.amenity_pet', '🐶 반려동물 동반')}</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 5: Final Review */}
                        {step === 5 && (
                            <motion.div key="s5" custom={direction} variants={pageVariants} initial="initial" animate="animate" exit="exit" className="w-full px-6 py-6 pb-32 space-y-6 flex flex-col items-center">
                                <div className="w-16 h-16 bg-espresso-800 rounded-full flex items-center justify-center text-espresso-200 mb-2 shrink-0">
                                    <Store size={32} />
                                </div>
                                <div className="text-center">
                                    <h2 className="text-2xl font-serif font-bold text-espresso-50 leading-tight" dangerouslySetInnerHTML={{ __html: t('register_shop.s5_title') }} />
                                    <p className="text-espresso-300 mt-2 text-[14px]">{t('register_shop.s5_desc', '정확한 정보인지 확인 후 심사를 요청해 주세요.')}</p>
                                </div>

                                <div className="w-full space-y-4">
                                    <div className="bg-espresso-900 p-4 rounded-xl border border-coffee-100 shadow-sm space-y-2">
                                        <h3 className="font-bold text-espresso-50 border-b border-coffee-100 pb-2 mb-2">{t('register_shop.review_base_info', '기본 정보')}</h3>
                                        <p className="text-[13px] text-espresso-200"><span className="font-bold text-espresso-300 inline-block w-16">{t('register_shop.rv_shop_name', '매장명')}</span> {shopData.name || '-'}</p>
                                        <p className="text-[13px] text-espresso-200"><span className="font-bold text-espresso-300 inline-block w-16">{t('register_shop.rv_address', '주소')}</span> {shopData.address} {shopData.detailAddress}</p>
                                        <p className="text-[13px] text-espresso-200"><span className="font-bold text-espresso-300 inline-block w-16">{t('register_shop.rv_phone', '전화번호')}</span> {shopData.phone || '-'}</p>
                                                                                <p className="text-[13px] text-espresso-200"><span className="font-bold text-espresso-300 inline-block w-16">{t('register_shop.rv_hours', '영업시간')}</span> {t('register_shop.rv_hours_configured', '요일별 설정됨')}</p>
                                        <p className="text-[13px] text-espresso-200"><span className="font-bold text-espresso-300 inline-block w-16">{t('register_shop.rv_website', '웹사이트')}</span> {shopData.websiteUrl || '-'}</p>
                                    </div>

                                    <div className="bg-espresso-900 p-4 rounded-xl border border-coffee-100 shadow-sm space-y-2">
                                        <h3 className="font-bold text-espresso-50 border-b border-coffee-100 pb-2 mb-2">{t('register_shop.review_biz_info', '비즈니스 정보')}</h3>
                                        <p className="text-[13px] text-espresso-200"><span className="font-bold text-espresso-300 inline-block w-24">{t('register_shop.rv_owner', '대표자')}</span> {shopData.ownerName || '-'}</p>
                                        <p className="text-[13px] text-espresso-200"><span className="font-bold text-espresso-300 inline-block w-24">{t('register_shop.rv_biz_num', '사업자번호')}</span> {shopData.businessNumber || '-'}</p>
                                        <p className="text-[13px] text-espresso-200"><span className="font-bold text-espresso-300 inline-block w-24">{t('register_shop.rv_account', '정산 계좌')}</span> {shopData.settlementAccount || '-'}</p>
                                    </div>

                                    <div className="bg-espresso-900 p-4 rounded-xl border border-coffee-100 shadow-sm space-y-2">
                                        <h3 className="font-bold text-espresso-50 border-b border-coffee-100 pb-2 mb-2">{t('register_shop.review_intro', '소개')}</h3>
                                        <p className="text-[13px] text-espresso-200"><span className="font-bold text-espresso-300 block mb-1">{t('register_shop.rv_short_desc', '한 줄 소개')}</span>{shopData.shortDesc || '-'}</p>
                                        <p className="text-[13px] text-espresso-200"><span className="font-bold text-espresso-300 block mb-1">{t('register_shop.rv_long_desc', '상세 소개')}</span><span className="whitespace-pre-wrap">{shopData.longDesc || '-'}</span></p>
                                    </div>

                                    <div className="bg-espresso-900 p-4 rounded-xl border border-coffee-100 shadow-sm space-y-2">
                                        <h3 className="font-bold text-espresso-50 border-b border-coffee-100 pb-2 mb-2">{t('register_shop.review_coffee', '커피 및 페어링')}</h3>
                                        <p className="text-[13px] text-espresso-200"><span className="font-bold text-espresso-300 inline-block w-20">{t('register_shop.rv_sig_bean', '시그니처 원두')}</span> {shopData.signatureBean || '-'}</p>
                                        <p className="text-[13px] text-espresso-200"><span className="font-bold text-espresso-300 inline-block w-20">{t('register_shop.rv_sig_menu', '시그니처 메뉴')}</span> {shopData.signatureMenu || '-'}</p>
                                        <p className="text-[13px] text-espresso-200"><span className="font-bold text-espresso-300 inline-block w-20">{t('register_shop.rv_equipment', '추출 장비')}</span> {shopData.equipment}</p>
                                        <p className="text-[13px] text-espresso-200"><span className="font-bold text-espresso-300 inline-block w-20">{t('register_shop.rv_dessert', '페어링 디저트')}</span> {shopData.dessertPairing || '-'}</p>
                                        <div className="flex gap-2 pt-2 text-[12px] font-bold">
                                            {shopData.hasDecaf && <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded">{t('register_shop.rv_decaf_o', '디카페인 O')}</span>}
                                            {shopData.hasOatMilk && <span className="bg-green-50 text-green-600 px-2 py-1 rounded">{t('register_shop.rv_oat_o', '대체유 O')}</span>}
                                        </div>
                                    </div>

                                    <div className="bg-espresso-900 p-4 rounded-xl border border-coffee-100 shadow-sm space-y-2">
                                        <h3 className="font-bold text-espresso-50 border-b border-coffee-100 pb-2 mb-2">{t('register_shop.review_amenities', '편의 시설')}</h3>
                                        <div className="flex flex-wrap gap-2 text-[12px] font-bold">
                                            {shopData.hasParking && <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded">{t('register_shop.amenity_parking', '🚙 주차 가능')}</span>}
                                            {shopData.hasWifi && <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded">{t('register_shop.amenity_wifi', '📶 와이파이')}</span>}
                                            {shopData.hasPowerOutlets && <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded">{t('register_shop.amenity_power', '🔌 콘센트 제공')}</span>}
                                            {shopData.hasPetFriendly && <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded">{t('register_shop.amenity_pet', '🐶 반려동물 동반')}</span>}
                                            {!shopData.hasParking && !shopData.hasWifi && !shopData.hasPowerOutlets && !shopData.hasPetFriendly && <span className="text-coffee-400 font-medium">{t('register_shop.rv_no_amenities', '등록된 편의 시설이 없습니다.')}</span>}
                                        </div>
                                    </div>

                                    <div className="bg-espresso-900 p-4 rounded-xl border border-coffee-100 shadow-sm">
                                        <h3 className="font-bold text-espresso-50 border-b border-coffee-100 pb-2 mb-3">{t('register_shop.review_taste', '맛 프로필')}</h3>
                                        <div className="grid grid-cols-4 text-center text-[12px]">
                                            <div><span className="block text-espresso-300 mb-1 font-bold">{t('register_shop.rv_acidity', '산미')}</span>{shopData.acidity}/5</div>
                                            <div><span className="block text-espresso-300 mb-1 font-bold">{t('register_shop.rv_sweetness', '단맛')}</span>{shopData.sweetness}/5</div>
                                            <div><span className="block text-espresso-300 mb-1 font-bold">{t('register_shop.rv_bitterness', '쓴맛')}</span>{shopData.bitterness}/5</div>
                                            <div><span className="block text-espresso-300 mb-1 font-bold">{t('register_shop.rv_body', '바디감')}</span>{shopData.body}/5</div>
                                        </div>
                                    </div>

                                    {mediaFiles.length > 0 && (
                                        <div className="bg-espresso-900 p-4 rounded-xl border border-coffee-100 shadow-sm">
                                            <h3 className="font-bold text-espresso-50 border-b border-coffee-100 pb-2 mb-3">{t('register_shop.review_media', '첨부 파일')}</h3>
                                            <div className="flex gap-2 text-[13px] text-espresso-200 font-medium mb-2">
                                                <Camera size={16} /> {t('register_shop.rv_media_count', '총 {{count}}개의 미디어', { count: mediaFiles.length })}
                                            </div>
                                            <div className="text-[12px] text-espresso-300 bg-espresso-950 rounded-lg p-2.5">
                                                <p className="mt-1"><span className="font-bold text-espresso-200">{t('register_shop.rv_media_list', '미디어:')}</span> {mediaFiles.map(f => f.name).join(', ')}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* Step 6: Success */}
                        {step === 6 && (
                            <motion.div key="s6" custom={direction} variants={pageVariants} initial="initial" animate="animate" exit="exit" className="w-full px-6 py-6 space-y-8 flex flex-col items-center justify-center min-h-[80vh] text-center">
                                <div className="w-24 h-24 bg-espresso-800 rounded-full flex items-center justify-center text-espresso-200 mb-4 animate-pulse">
                                    <CheckCircle2 size={48} />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-serif font-bold text-espresso-50 leading-tight" dangerouslySetInnerHTML={{ __html: t('register_shop.s6_title') }} />
                                    <p className="text-espresso-300 mt-4 leading-relaxed text-[15px]" dangerouslySetInnerHTML={{ __html: t('register_shop.s6_desc') }} />
                                </div>
                                <button onClick={() => navigate('/profile', { replace: true })} className="mt-8 bg-coffee-900 text-espresso-50 w-full py-4 rounded-2xl font-bold text-[17px] active:scale-[0.98] transition-all shadow-lg shadow-coffee-900/20">
                                    {t('register_shop.btn_back_to_profile', '내 프로필로 돌아가기')}
                                </button>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>

                {/* Global Bottom Action Bar */}
                {step < 6 && (
                    <div className="absolute bottom-0 left-0 w-full bg-espresso-900/80 backdrop-blur-xl border-t border-coffee-100 px-6 py-4 pb-safe-bottom z-50">
                        <button disabled={isSubmitting} onClick={step === 5 ? submit : nextStep} className="w-full bg-coffee-900 text-espresso-50 py-4 rounded-2xl font-bold text-[17px] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-coffee-900/20 disabled:opacity-70">
                            {step === 5 ? (isSubmitting ? t('register_shop.btn_submitting', '처리중...') : t('register_shop.btn_submit', '심사 요청하기')) : t('register_shop.btn_next', '다음으로')} <ChevronRight size={20} />
                        </button>
                    </div>
                )}

            </div>

            {/* Address Search Modal */}
            <AnimatePresence>
                {isAddressModalOpen && (
                    <React.Fragment>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddressModalOpen(false)} className="fixed inset-0 bg-coffee-900/40 backdrop-blur-sm z-[210]" />
                        <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="fixed bottom-0 left-0 w-full bg-espresso-900 rounded-t-[2rem] z-[220] p-6 pb-safe flex flex-col h-[85vh]">
                            <div className="w-12 h-1.5 bg-espresso-700 rounded-full mx-auto mb-6 shrink-0" />
                            <h3 className="text-xl font-bold font-serif text-espresso-50 mb-4">{t('register_shop.modal_address_title', '주소 검색')}</h3>
                            <div className="flex-1 overflow-hidden rounded-xl border border-coffee-100 bg-espresso-950 relative">
                                <DaumPostcodeEmbed
                                    onComplete={handleCompleteAddress}
                                    style={{ height: '100%', width: '100%' }}
                                />
                            </div>
                        </motion.div>
                    </React.Fragment>
                )}
            </AnimatePresence>

        </div>
    );
}
