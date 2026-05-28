import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
    Store, Settings, BarChart3, Clock, UserCheck, 
    Plus, Minus, Coffee, LogOut, Sparkles, RefreshCw, Undo, ScanLine, Globe, Search, Megaphone, Trash2,
    ChevronLeft, Save, X, Camera, CheckCircle2, BarChart2, Activity, TrendingUp, Star, Target, Users, Image as ImageIcon
} from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import HostQRScannerModal from '../components/HostQRScannerModal';
import HostCouponListModal from '../components/HostCouponListModal';
import HostTransactionDetailModal from '../components/HostTransactionDetailModal';
import HostTransactionListModal from '../components/HostTransactionListModal';

export default function HostDashboard() {
    const { t, i18n } = useTranslation();
    
    // UI States
    const [storeInfo, setStoreInfo] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
    const [rightPanelTab, setRightPanelTab] = useState<'CONFIG' | 'STORE'>('CONFIG');
    
    // POS Earning States
    const [targetUserId, setTargetUserId] = useState('');
    const [selectedConfigId, setSelectedConfigId] = useState('');
    const [earnAmount, setEarnAmount] = useState(1);
    const [storeConfigs, setStoreConfigs] = useState<any[]>([]);
    const [earnItems, setEarnItems] = useState<Record<string, number>>({});
    
    // QR / Coupon Scanner & List States
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
    const [couponFilter, setCouponFilter] = useState<'ALL' | 'UNUSED' | 'USED'>('ALL');

    // Transaction History States
    const [isTxnListModalOpen, setIsTxnListModalOpen] = useState(false);
    const [isTxnDetailModalOpen, setIsTxnDetailModalOpen] = useState(false);
    const [selectedTxn, setSelectedTxn] = useState<any>(null);

    // Config Builder States
    const [cardType, setCardType] = useState('REGULAR');
    const [cardTitle, setCardTitle] = useState('');
    const [maxStamps, setMaxStamps] = useState(10);
    const [targetMenu, setTargetMenu] = useState('');
    const [rewardDesc, setRewardDesc] = useState('');
    const [validDays, setValidDays] = useState(90);
    
    // Store Info States
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

    // Store Info & Management Sub-Views
    const [storeSubView, setStoreSubView] = useState<'MAIN' | 'EDIT' | 'STORY'>('MAIN');
    const [storyContent, setStoryContent] = useState('');
    const [sendEmail, setSendEmail] = useState(false);
    const [isSubmittingStory, setIsSubmittingStory] = useState(false);

    // Google Maps API Loader
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        libraries: ['places']
    });

    // Gallery & Detail Menu State & Refs
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

    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const token = localStorage.getItem('token');

    // 💡 지능형 정책 명칭 파서
    const getItemsConfig = (cfg: any) => {
        if (!cfg) return null;
        let parsed = cfg.itemsConfig;
        if (typeof parsed === 'string') {
            try {
                parsed = JSON.parse(parsed);
            } catch (e) {
                parsed = null;
            }
        }
        
        if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
        }
        
        if (cfg.cardType === 'PROMOTION' && cfg.cardTitle) {
            const tokens = cfg.cardTitle.split(/[+,]/);
            const items: { key: string; label: string; target: number }[] = [];
            let index = 0;
            for (const token of tokens) {
                const trimmed = token.trim();
                if (!trimmed) continue;
                
                const match = trimmed.match(/^([가-힣a-zA-Z\s]+?)\s*(\d+)\s*(?:잔|개|병|팩|개입)?$/);
                if (match) {
                    const label = match[1].trim();
                    const target = parseInt(match[2], 10);
                    if (label && !isNaN(target)) {
                        items.push({
                            key: `item_${index}`,
                            label: label,
                            target: target
                        });
                        index++;
                    }
                }
            }
            if (items.length > 0) {
                return items;
            }
        }
        
        return null;
    };

    const getStoreImageUrl = (url: string | null | undefined) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        // Vite proxy(/uploads)가 설정되어 있으므로 상대 경로를 그대로 사용하는 것이 안전하며,
        // HTTPS 환경에서의 Mixed Content (HTTP 이미지 차단) 에러를 완벽하게 예방합니다.
        if (url.startsWith('/uploads')) {
            return url;
        }
        return url;
    };

    const renderItemsEarnedDetail = (txn: any) => {
        if (txn.cardType !== 'PROMOTION') return null;
        
        let itemsConfig: any[] | null = null;
        if (txn.itemsConfig) {
            try {
                itemsConfig = typeof txn.itemsConfig === 'string' ? JSON.parse(txn.itemsConfig) : txn.itemsConfig;
            } catch (e) {
                itemsConfig = null;
            }
        }
        
        if (!itemsConfig && txn.cardTitle) {
            itemsConfig = getItemsConfig({ cardType: 'PROMOTION', cardTitle: txn.cardTitle });
        }
        
        if (!itemsConfig || !Array.isArray(itemsConfig)) return null;
        
        let itemsEarned: Record<string, number> = {};
        if (txn.itemsEarned) {
            try {
                itemsEarned = typeof txn.itemsEarned === 'string' ? JSON.parse(txn.itemsEarned) : txn.itemsEarned;
            } catch (e) {
                itemsEarned = {};
            }
        }
        
        const formatted = itemsConfig
            .map((item: any) => {
                const qty = itemsEarned[item.key] || 0;
                return `${item.label} ${qty}`;
            })
            .join(', ');
            
        return (
            <p className="text-[10px] text-amber-500 font-bold mt-0.5">
                {formatted}
            </p>
        );
    };

    // selectedConfigId가 바뀔 때 earnItems 초기화
    useEffect(() => {
        if (selectedConfigId && storeConfigs.length > 0) {
            const cfg = storeConfigs.find(c => c.id === selectedConfigId);
            const itemsConfig = getItemsConfig(cfg);
            if (itemsConfig && Array.isArray(itemsConfig)) {
                const initialItems: Record<string, number> = {};
                itemsConfig.forEach((item: any) => {
                    initialItems[item.key] = 0;
                });
                setEarnItems(initialItems);
            } else {
                setEarnItems({});
            }
        }
    }, [selectedConfigId, storeConfigs]);

    // 1. 초기 점주 매장 정보 & 설정 로드
    const fetchDashboardData = async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            // 내 매장 정보 찾기
            const shopsRes = await fetch('/api/shops/my', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (shopsRes.ok) {
                const stores = await shopsRes.json();
                if (stores && stores.length > 0) {
                    const myStore = stores[0];
                    setStoreInfo(myStore);
                    
                    // 폼 바인딩
                    setEditData({
                        name: myStore.name || '',
                        address: myStore.address || '',
                        phone: myStore.phone || '',
                        shortDesc: myStore.shortDesc || '',
                        longDesc: myStore.longDesc || myStore.description || '',
                        hours: myStore.hours || '',
                        signatureBean: myStore.signatureBean || '',
                        signatureMenu: myStore.signatureMenu || '',
                        dessertPairing: myStore.dessertPairing || '',
                        equipment: myStore.equipment || '',
                        websiteUrl: myStore.websiteUrl || '',
                        acidity: myStore.acidity || 3,
                        sweetness: myStore.sweetness || 3,
                        bitterness: myStore.bitterness || 3,
                        body: myStore.body || 3,
                        primaryCoffeeType: myStore.primaryCoffeeType || 'GENERAL',
                        hasDecaf: Boolean(myStore.hasDecaf),
                        hasOatMilk: Boolean(myStore.hasOatMilk),
                        hasParking: Boolean(myStore.hasParking),
                        hasWifi: Boolean(myStore.hasWifi),
                        hasPetFriendly: Boolean(myStore.hasPetFriendly),
                        hasPowerOutlets: Boolean(myStore.hasPowerOutlets),
                        lat: myStore.lat || 37.5665,
                        lng: myStore.lng || 126.9780,
                        beanOrigin: myStore.beanOrigin || '',
                        beanRoastLevel: myStore.beanRoastLevel || '',
                        beanNotes: myStore.beanNotes || ''
                    });

                    // 영업시간, 갤러리 및 상세 메뉴 정보 바인딩
                    let parsedHours = defaultDailyHours;
                    try {
                        if (myStore.hours && myStore.hours.startsWith('[')) {
                            parsedHours = JSON.parse(myStore.hours);
                        }
                    } catch(e) {}
                    setDailyHours(parsedHours);

                    setMapCenter([myStore.lat || 37.5665, myStore.lng || 126.9780]);
                    setMediaFiles(myStore.media ? myStore.media.map((m: any) => ({ url: m.url })) : []);

                    try {
                        const parsedCoffee = JSON.parse(myStore.coffeeMenuImageUrl || "[]");
                        setCoffeeMenuImages(Array.isArray(parsedCoffee) ? parsedCoffee.map((url: string) => ({ url })) : myStore.coffeeMenuImageUrl ? [{ url: myStore.coffeeMenuImageUrl }] : []);
                    } catch {
                        setCoffeeMenuImages(myStore.coffeeMenuImageUrl ? [{ url: myStore.coffeeMenuImageUrl }] : []);
                    }

                    try {
                        const parsedPopular = JSON.parse(myStore.popularMenuImageUrl || "[]");
                        setPopularMenuImages(Array.isArray(parsedPopular) ? parsedPopular.map((url: string) => ({ url })) : myStore.popularMenuImageUrl ? [{ url: myStore.popularMenuImageUrl }] : []);
                    } catch {
                        setPopularMenuImages(myStore.popularMenuImageUrl ? [{ url: myStore.popularMenuImageUrl }] : []);
                    }

                    const markerIdx = myStore.media && myStore.markerImageUrl ? myStore.media.findIndex((m: any) => m.url === myStore.markerImageUrl) : 0;
                    setMarkerImageIndex(Math.max(0, markerIdx));
                    
                    if (myStore.menuItems && Array.isArray(myStore.menuItems)) {
                        setMenuItems(myStore.menuItems);
                    } else {
                        setMenuItems([]);
                    }

                    // 스탬프 configs 및 통계 가져오기
                    const statsRes = await fetch(`/api/stamps/owner/stats/${myStore.id}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (statsRes.ok) {
                        const data = await statsRes.json();
                        setStats(data.stats);
                        setRecentTransactions(data.recentTransactions);
                    }

                    const configRes = await fetch(`/api/stamps/configs/${myStore.id}`);
                    if (configRes.ok) {
                        const configs = await configRes.json();
                        setStoreConfigs(configs);
                        if (configs.length > 0) {
                            if (!selectedConfigId || !configs.some((c: any) => c.id === selectedConfigId)) {
                                setSelectedConfigId(configs[0].id);
                            }
                        }
                    }
                } else {
                    setErrorMessage(t('host_dashboard.err_no_store', '등록된 내 매장을 찾을 수 없습니다. 마이페이지에서 매장 추가를 먼저 진행해주세요.'));
                }
            }
        } catch (err) {
            console.error("Dashboard error:", err);
            setErrorMessage(t('host_dashboard.err_load_fail', '데이터를 불러오는 중 오류가 발생했습니다.'));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    // 2. POS 적립 요청
    const handlePosEarn = async () => {
        if (!targetUserId || !selectedConfigId) {
            setErrorMessage(t('host_dashboard.err_select_card', '고객 식별코드와 스탬프 종류를 선택해 주세요.'));
            return;
        }

        const cfg = storeConfigs.find(c => c.id === selectedConfigId);
        const parsedItemsConfig = getItemsConfig(cfg);
        const isPromotion = cfg && parsedItemsConfig && Array.isArray(parsedItemsConfig);

        let finalAmount = earnAmount;
        let finalItems = null;

        const totalItemsCount = Object.values(earnItems).reduce((sum, val) => sum + val, 0);

        if (isPromotion) {
            finalItems = earnItems;
            finalAmount = totalItemsCount;
            if (finalAmount <= 0) {
                setErrorMessage(t('host_dashboard.err_min_item_qty', '최소 1개 이상의 품목 수량을 선택하여 적립을 진행해 주세요.'));
                return;
            }
        } else {
            if (totalItemsCount > 0) {
                finalItems = earnItems;
                finalAmount = totalItemsCount;
            }
        }

        setIsLoading(true);
        setErrorMessage('');
        setSuccessMessage('');
        try {
            const res = await fetch('/api/stamps/earn', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: targetUserId,
                    storeId: storeInfo?.id,
                    configId: selectedConfigId,
                    amount: finalAmount,
                    items: finalItems
                })
            });

            if (res.ok) {
                setSuccessMessage(t('host_dashboard.success_earn', '스탬프 적립이 완벽하게 완료되었습니다! 🎉'));
                setTargetUserId('');
                setEarnAmount(1);
                if (isPromotion) {
                    const resetItems: Record<string, number> = {};
                    parsedItemsConfig.forEach((item: any) => {
                        resetItems[item.key] = 0;
                    });
                    setEarnItems(resetItems);
                }
                fetchDashboardData();
            } else {
                const err = await res.json();
                setErrorMessage(err.message || t('host_dashboard.err_earn_fail', '적립 처리에 실패했습니다.'));
            }
        } catch (err) {
            setErrorMessage(t('host_dashboard.err_network', '네트워크 연결에 문제가 발생했습니다.'));
        } finally {
            setIsLoading(false);
        }
    };

    // 3. 최근 트랜잭션 롤백
    const handleRollback = async (txn: any) => {
        if (!window.confirm(t('host_dashboard.alert_rollback_confirm', { name: txn.userNickname, amount: txn.amount, defaultValue: `[${txn.userNickname}] 고객님의 최근 적립(${txn.amount}개)을 취소하고 롤백하시겠습니까?` }))) return;
        setIsLoading(true);
        setErrorMessage('');
        setSuccessMessage('');
        try {
            const res = await fetch('/api/stamps/rollback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: txn.userId,
                    storeId: txn.storeId,
                    configId: txn.configId
                })
            });

            if (res.ok) {
                setSuccessMessage(t('host_dashboard.success_rollback', '스탬프 적립이 정상적으로 취소(롤백)되었습니다. ↩'));
                fetchDashboardData();
            } else {
                const err = await res.json();
                setErrorMessage(err.message || t('host_dashboard.err_rollback_fail', '롤백 취소에 실패했습니다.'));
            }
        } catch (err) {
            setErrorMessage(t('host_dashboard.err_network_rollback', '네트워크 에러가 발생했습니다.'));
        } finally {
            setIsLoading(false);
        }
    };

    // 4. 새로운 스탬프/프로모션 정책 등록
    const handleCreateConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const storeId = storeInfo?.id;
        if (!storeId) {
            setErrorMessage(t('host_dashboard.err_no_store', '등록된 내 매장을 찾을 수 없습니다. 마이페이지에서 매장 추가를 먼저 진행해주세요.'));
            return;
        }

        if (!cardTitle || !rewardDesc) {
            setErrorMessage(t('host_dashboard.err_empty_fields', '정책명과 리워드 보상 설명은 필수입니다.'));
            return;
        }

        const finalMaxStamps = isNaN(maxStamps) || maxStamps <= 0 ? 10 : maxStamps;
        const finalValidDays = isNaN(validDays) || validDays <= 0 ? 90 : validDays;

        setIsLoading(true);
        setErrorMessage('');
        setSuccessMessage('');
        try {
            const res = await fetch('/api/stamps/configs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    storeId,
                    cardType,
                    cardTitle,
                    maxStamps: finalMaxStamps,
                    targetMenu: targetMenu || null,
                    rewardDesc,
                    validDays: finalValidDays
                })
            });

            if (res.ok) {
                setSuccessMessage(t('host_dashboard.success_config_create', '새로운 스탬프 정책이 생성되어 활성화되었습니다! 🎉'));
                setCardTitle('');
                setTargetMenu('');
                setRewardDesc('');
                fetchDashboardData();
            } else {
                const err = await res.json();
                setErrorMessage(err.message || t('host_dashboard.err_config_create_fail', '정책 생성 실패'));
            }
        } catch (err) {
            setErrorMessage(t('host_dashboard.err_network_config', '네트워크 전송 오류가 발생했습니다.'));
        } finally {
            setIsLoading(false);
        }
    };

    // 5. 이미지/미디어 및 위치 검색 헬퍼
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
                    setEditData((prev: any) => ({ ...prev, lat, lng }));
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

    // 5-1. 매장 프로필 저장
    const handleUpdateStore = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!storeInfo?.id) return;
        setIsSaving(true);
        setErrorMessage('');
        setSuccessMessage('');
        try {
            // Process media files to Base64
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

            const res = await fetch(`/api/shops/${storeInfo.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    ...editData, 
                    hours: JSON.stringify(dailyHours), 
                    mediaUrls, 
                    markerImageIndex, 
                    coffeeMenuImageUrl, 
                    popularMenuImageUrl, 
                    menuItems 
                })
            });

            if (res.ok) {
                setSuccessMessage(t('host_dashboard.success_store_update', '매장 프로필 정보가 안전하게 업데이트되었습니다! 💾'));
                setStoreSubView('MAIN');
                fetchDashboardData();
            } else {
                const err = await res.json();
                setErrorMessage(err.message || t('host_dashboard.err_store_update_fail', '프로필 변경 실패'));
            }
        } catch (err) {
            setErrorMessage(t('host_dashboard.err_network_store', '통신 에러가 발생했습니다.'));
        } finally {
            setIsSaving(false);
        }
    };

    // 5-1. 매장 삭제 처리 API 연계
    const handleDeleteStore = async () => {
        if (!storeInfo?.id) return;
        if (!window.confirm(t('manage_shop.confirm_delete', { name: storeInfo.name, defaultValue: `'${storeInfo.name}' 매장을 대시보드에서 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.` }))) return;

        setIsLoading(true);
        setErrorMessage('');
        setSuccessMessage('');
        try {
            const res = await fetch(`/api/shops/${storeInfo.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                alert(t('manage_shop.alert_delete_success', '매장이 성공적으로 삭제되었습니다.'));
                window.location.reload();
            } else {
                const err = await res.json();
                setErrorMessage(err.error || t('manage_shop.alert_delete_fail', '삭제 처리에 실패했습니다.'));
            }
        } catch (err) {
            setErrorMessage(t('host_dashboard.err_network_store', '통신 에러가 발생했습니다.'));
        } finally {
            setIsLoading(false);
        }
    };

    // 5-2. 단골 고객 대상 소식/공지 발행 API 연계
    const handlePublishStory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!storeInfo?.id || !storyContent.trim()) {
            setErrorMessage(t('manage_shop.alert_story_empty', '소식 내용을 입력해주세요.'));
            return;
        }

        setIsSubmittingStory(true);
        setErrorMessage('');
        setSuccessMessage('');
        try {
            const formData = new FormData();
            formData.append('content', storyContent);
            formData.append('storeId', storeInfo.id);
            formData.append('postType', 'ANNOUNCEMENT');
            formData.append('sendEmail', sendEmail.toString());

            const res = await fetch('/api/community/posts', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                if (sendEmail) {
                    setSuccessMessage(t('manage_shop.alert_story_success_with_email', '소식이 앱에 등록되었으며, 단골 고객들에게 이메일도 발송되었습니다! 📣'));
                } else {
                    setSuccessMessage(t('manage_shop.alert_story_success_no_email', '소식이 앱 내 피드에 성공적으로 등록되었습니다! 📣'));
                }
                setStoryContent('');
                setSendEmail(false);
                setStoreSubView('MAIN');
            } else {
                const err = await res.json();
                setErrorMessage(err.error || t('manage_shop.alert_story_fail', '소식 발행 실패'));
            }
        } catch (err) {
            setErrorMessage(t('host_dashboard.err_network_store', '통신 에러가 발생했습니다.'));
        } finally {
            setIsSubmittingStory(false);
        }
    };

    // 로그아웃
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    };

    // 언어 전환
    const toggleLanguage = () => {
        const nextLang = i18n.language === 'ko' ? 'en' : 'ko';
        i18n.changeLanguage(nextLang);
    };

    return (
        <div className="min-h-screen bg-espresso-950 text-espresso-50 flex flex-col font-sans antialiased relative overflow-hidden">
            {/* 백그라운드 프리미엄 골드/브라운 그라데이션 광원 */}
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#D4AF37]/3 rounded-full filter blur-[150px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#8c8c73]/3 rounded-full filter blur-[150px] pointer-events-none" />

            {/* 상단 네비게이션 헤더 */}
            <header className="bg-espresso-900/60 backdrop-blur-md border-b border-espresso-800/80 px-8 py-4 flex items-center justify-between shadow-lg sticky top-0 z-50 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#D4AF37]/20 to-amber-500/10 border border-[#D4AF37]/30 flex items-center justify-center text-amber-500 overflow-hidden relative">
                        {storeInfo?.mainImageUrl ? (
                            <>
                                <img 
                                    src={getStoreImageUrl(storeInfo.mainImageUrl)} 
                                    alt={storeInfo.name || "Store"} 
                                    className="w-full h-full object-cover z-10"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        const sibling = e.currentTarget.nextElementSibling;
                                        if (sibling) {
                                            sibling.classList.remove('hidden');
                                            sibling.classList.add('flex');
                                        }
                                    }}
                                />
                                <div className="absolute inset-0 hidden items-center justify-center bg-gradient-to-tr from-[#D4AF37]/20 to-amber-500/10 z-0">
                                    <Store size={20} />
                                </div>
                            </>
                        ) : (
                            <Store size={20} />
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="font-serif font-black text-xl text-espresso-50 tracking-tight">
                                {storeInfo?.name || "BeanMind Store POS"}
                            </h1>
                            <span className="bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-[10px] font-black px-1.5 py-0.5 rounded uppercase">B2B Portal</span>
                        </div>
                        <p className="text-[11px] text-espresso-400 mt-0.5">{t('host_dashboard.sub_title', '매장 전용 디지털 스탬프 관리 파트너 대시보드')}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* 실시간 QR 스캐너 작동 버튼 */}
                    <button 
                        onClick={() => setIsScannerOpen(true)}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-espresso-950 font-black text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                        <ScanLine size={14} />
                        {t('host_dashboard.btn_scanner', '실시간 QR 스캐너 열기')}
                    </button>

                    <button 
                        onClick={toggleLanguage}
                        className="p-2 bg-espresso-850 hover:bg-espresso-800 border border-espresso-800 text-espresso-300 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                        title={t('common.change_language', '언어 변경')}
                    >
                        <Globe size={16} />
                        <span className="text-[10px] font-bold uppercase">{i18n.language === 'ko' ? 'EN' : 'KO'}</span>
                    </button>

                    <button 
                        onClick={fetchDashboardData}
                        className="p-2 bg-espresso-850 hover:bg-espresso-800 border border-espresso-800 text-espresso-300 rounded-xl transition-all cursor-pointer active:rotate-180 duration-500"
                        title={t('common.refresh', '새로고침')}
                    >
                        <RefreshCw size={16} />
                    </button>

                    <button 
                        onClick={handleLogout}
                        className="px-3.5 py-2 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-400 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                        <LogOut size={14} />
                        {t('common.logout', '로그아웃')}
                    </button>
                </div>
            </header>

            {/* 통계 오버뷰 그리드 */}
            {stats && (
                <section className="px-8 py-5 grid grid-cols-2 lg:grid-cols-4 gap-5 bg-espresso-900/20 border-b border-espresso-900 relative z-10 shrink-0">
                    <div className="bg-espresso-900/40 p-4.5 rounded-2xl border border-espresso-850 shadow-sm flex flex-col justify-between transition-all hover:border-[#D4AF37]/20">
                        <span className="text-[11px] text-espresso-400 font-bold uppercase tracking-wider">{t('host_dashboard.stat_total_earn', '누적 적립 건수')}</span>
                        <div className="flex items-baseline gap-1 mt-2.5">
                            <span className="font-mono text-3xl font-black text-espresso-50">{stats.totalEarnCount}</span>
                            <span className="text-xs text-espresso-400">{t('host_dashboard.unit_count', '건')}</span>
                        </div>
                    </div>
                    <div className="bg-espresso-900/40 p-4.5 rounded-2xl border border-espresso-850 shadow-sm flex flex-col justify-between transition-all hover:border-[#D4AF37]/20">
                        <span className="text-[11px] text-amber-500 font-bold uppercase tracking-wider">{t('host_dashboard.stat_today_earn', '오늘 신규 적립')}</span>
                        <div className="flex items-baseline gap-1 mt-2.5">
                            <span className="font-mono text-3xl font-black text-amber-400">{stats.todayEarnCount}</span>
                            <span className="text-xs text-amber-500/80">{t('host_dashboard.unit_count', '건')}</span>
                        </div>
                    </div>
                    <div 
                        onClick={() => {
                            setCouponFilter('UNUSED');
                            setIsCouponModalOpen(true);
                        }}
                        className="bg-espresso-900/40 p-4.5 rounded-2xl border border-espresso-850 shadow-sm flex flex-col justify-between transition-all hover:border-[#D4AF37]/45 cursor-pointer active:scale-98"
                    >
                        <span className="text-[11px] text-espresso-400 font-bold uppercase tracking-wider">{t('host_dashboard.stat_issued_coupons', '발행된 무료 쿠폰')}</span>
                        <div className="flex items-baseline gap-1 mt-2.5">
                            <span className="font-mono text-3xl font-black text-espresso-50">{stats.totalIssuedCoupons}</span>
                            <span className="text-xs text-espresso-400">{t('host_dashboard.unit_sheets', '장')}</span>
                        </div>
                    </div>
                    <div 
                        onClick={() => {
                            setCouponFilter('USED');
                            setIsCouponModalOpen(true);
                        }}
                        className="bg-espresso-900/40 p-4.5 rounded-2xl border border-espresso-850 shadow-sm flex flex-col justify-between transition-all hover:border-[#D4AF37]/45 cursor-pointer active:scale-98"
                    >
                        <span className="text-[11px] text-green-400 font-bold uppercase tracking-wider">{t('host_dashboard.stat_used_coupons', '사용된 무료 쿠폰')}</span>
                        <div className="flex items-baseline gap-1 mt-2.5">
                            <span className="font-mono text-3xl font-black text-green-400">{stats.totalUsedCoupons}</span>
                            <span className="text-xs text-green-400/80">{t('host_dashboard.unit_sheets', '장')}</span>
                        </div>
                    </div>
                </section>
            )}

            {/* 3열 와이드 대시보드 레이아웃 바디 */}
            <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative z-10 px-8 py-6 gap-6">
                
                {/* 1열: 원터치 수동 적립 패널 (POS 대응) */}
                <div className="w-full lg:w-[32%] bg-espresso-900/30 backdrop-blur-sm border border-espresso-850 p-6 rounded-3xl flex flex-col justify-between min-h-0">
                    <div className="space-y-5">
                        <div className="flex items-center gap-2 pb-2 border-b border-espresso-850">
                            <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                <Coffee size={14} />
                            </div>
                            <h3 className="font-serif font-black text-base text-amber-500">
                                {t('host_dashboard.pos_panel_title', '원터치 수동 적립 패널 (POS 대응)')}
                            </h3>
                        </div>

                        {errorMessage && (
                            <div className="bg-red-950/40 border border-red-500/30 text-red-400 p-3.5 rounded-xl text-xs">
                                {errorMessage}
                            </div>
                        )}
                        {successMessage && (
                            <div className="bg-green-950/40 border border-green-500/30 text-green-400 p-3.5 rounded-xl text-xs">
                                {successMessage}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs text-espresso-200 font-bold block">
                                    {t('host_dashboard.ph_user_qr_string', '고객 고유식별 QR코드 문자열 (또는 ID)')}
                                </label>
                                <input 
                                    type="text" 
                                    value={targetUserId}
                                    onChange={e => setTargetUserId(e.target.value)}
                                    placeholder={t('host_scanner.ph_user_id', '유저 고유 식별코드 직접 입력')}
                                    className="w-full bg-espresso-950 border border-espresso-800 rounded-xl px-4 py-3 font-mono text-xs text-espresso-50 outline-none focus:border-amber-500/50"
                                />
                            </div>

                            {/* 적립 대상 도장판 설정 */}
                            <div className="space-y-2">
                                <label className="text-xs text-espresso-200 font-bold block">
                                    {t('host_dashboard.lbl_select_card', '적립 대상 도장판 설정')}
                                </label>
                                <select 
                                    value={selectedConfigId}
                                    onChange={e => setSelectedConfigId(e.target.value)}
                                    className="w-full bg-espresso-950 border border-espresso-800 rounded-xl px-4 py-3 text-xs text-espresso-100 outline-none focus:border-amber-500/50 cursor-pointer"
                                >
                                    <option value="">{t('host_dashboard.opt_select_card_placeholder', '적립 판을 선택하세요.')}</option>
                                    {storeConfigs.map(cfg => (
                                        <option key={cfg.id} value={cfg.id}>
                                            {t(cfg.cardTitle, cfg.cardTitle) as string} ({cfg.cardType === 'REGULAR' ? t('host_dashboard.suffix_regular_card', '일반 스탬프') : t('host_dashboard.suffix_promo_card', '시즌 프로모션')})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* 스탬프 개수 가감제어 또는 복합 품목 카운터 */}
                            {(() => {
                                const cfg = storeConfigs.find(c => c.id === selectedConfigId);
                                const parsedItemsConfig = getItemsConfig(cfg);
                                const isPromotion = cfg && parsedItemsConfig && Array.isArray(parsedItemsConfig);

                                if (isPromotion) {
                                    return (
                                        <div className="bg-espresso-950 p-4 rounded-xl border border-espresso-850 space-y-3">
                                            <span className="text-xs text-espresso-200 block text-center font-bold">
                                                {t('host_scanner.adjust_items_qty', '품목별 적립 수량 조절')}
                                            </span>
                                            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                                                {parsedItemsConfig.map((item: any) => {
                                                    const currentQty = earnItems[item.key] || 0;
                                                    return (
                                                        <div key={item.key} className="flex justify-between items-center bg-espresso-900/40 p-2.5 rounded-lg border border-espresso-800/60">
                                                            <div className="text-left">
                                                                <span className="font-bold text-[11px] text-espresso-50">{item.label}</span>
                                                                <p className="text-[9px] text-espresso-400">{t('host_scanner.target_qty', { target: item.target })}</p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <button 
                                                                    onClick={() => setEarnItems(prev => ({ ...prev, [item.key]: Math.max(0, currentQty - 1) }))}
                                                                    className="w-7 h-7 rounded bg-espresso-950 border border-espresso-750 text-espresso-200 flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                                                                >
                                                                    <Minus size={10} />
                                                                </button>
                                                                <span className="font-mono text-xs font-black text-amber-500 w-5 text-center">{currentQty}</span>
                                                                <button 
                                                                    onClick={() => setEarnItems(prev => ({ ...prev, [item.key]: Math.min(10, currentQty + 1) }))}
                                                                    className="w-7 h-7 rounded bg-[#D4AF37] text-espresso-950 flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                                                                >
                                                                    <Plus size={10} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="text-right text-[9px] text-espresso-400 font-bold pt-1 border-t border-espresso-850">
                                                {t('host_scanner.total_earn_expected', { count: Object.values(earnItems).reduce((a, b) => a + b, 0) })}
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="bg-espresso-950 p-4 rounded-xl border border-espresso-850 text-center space-y-3">
                                        <span className="text-xs text-espresso-200 block">
                                            {t('host_scanner.adjust_stamp_qty', '적립할 스탬프 수량 조절')}
                                        </span>
                                        <div className="flex justify-center items-center gap-6">
                                            <button 
                                                onClick={() => setEarnAmount(prev => Math.max(1, prev - 1))}
                                                className="w-9 h-9 rounded-lg bg-espresso-900 hover:bg-espresso-850 border border-espresso-800 text-espresso-50 flex items-center justify-center cursor-pointer"
                                            >
                                                <Minus size={14} />
                                            </button>
                                            <span className="font-mono text-xl font-black text-amber-500 w-8">{earnAmount}</span>
                                            <button 
                                                onClick={() => setEarnAmount(prev => Math.min(10, prev + 1))}
                                                className="w-9 h-9 rounded-lg bg-amber-600 hover:bg-amber-700 text-espresso-950 flex items-center justify-center cursor-pointer"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    <button 
                        onClick={handlePosEarn}
                        disabled={isLoading}
                        className="w-full py-3.5 bg-[#D4AF37] hover:bg-amber-500 text-espresso-950 font-black text-xs rounded-xl transition-all shadow-md active:scale-98 cursor-pointer flex justify-center items-center gap-1.5 mt-6"
                    >
                        <Coffee size={14} />
                        {(() => {
                            if (isLoading) return t('host_dashboard.earning_processing', '적립 처리 중...');
                            const cfg = storeConfigs.find(c => c.id === selectedConfigId);
                            const parsedItemsConfig = getItemsConfig(cfg);
                            const isPromotion = cfg && parsedItemsConfig && Array.isArray(parsedItemsConfig);
                            if (isPromotion) {
                                const totalQty = Object.values(earnItems).reduce((sum, val) => sum + val, 0);
                                return t('host_dashboard.btn_earn_submit', { count: totalQty });
                            }
                            return t('host_dashboard.btn_earn_submit', { count: earnAmount });
                        })()}
                    </button>
                </div>

                {/* 2열: 최근 적립/취소 거래 리스트 (실시간 적립 타임라인) */}
                <div className="w-full lg:w-[32%] bg-espresso-900/30 backdrop-blur-sm border border-espresso-850 p-6 rounded-3xl flex flex-col min-h-0">
                    <div className="flex items-center justify-between pb-2 border-b border-espresso-850 shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-espresso-800 text-espresso-300 flex items-center justify-center">
                                <Clock size={14} />
                            </div>
                            <h3 className="font-serif font-black text-base text-espresso-100">
                                {t('host_dashboard.timeline_title', '최근 적립 타임라인')}
                            </h3>
                        </div>
                        <button
                            onClick={() => setIsTxnListModalOpen(true)}
                            className="px-2.5 py-1 bg-espresso-850 hover:bg-espresso-800 border border-espresso-800 hover:border-amber-500/30 text-[#D4AF37] hover:text-amber-400 font-bold text-[9px] rounded-lg active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                        >
                            <Search size={10} />
                            {t('host_dashboard.btn_search_txns', '검색 / 필터')}
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-3 max-h-[580px] hide-scrollbar">
                        {recentTransactions.length > 0 ? (
                            recentTransactions.map((txn) => (
                                <div 
                                    key={txn.id} 
                                    onClick={() => {
                                        setSelectedTxn(txn);
                                        setIsTxnDetailModalOpen(true);
                                    }}
                                    className="bg-espresso-950/40 p-3.5 rounded-xl border border-espresso-850 flex justify-between items-center text-xs transition-all hover:border-[#D4AF37]/35 cursor-pointer hover:bg-espresso-900/10 active:scale-[0.99]"
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-espresso-50">{txn.userNickname}</span>
                                            <span className={`text-[8px] font-bold px-1.5 py-0.25 rounded ${txn.amount > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
                                                {txn.txnType}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-espresso-355">{t(txn.cardTitle, txn.cardTitle) as string}</p>
                                        {renderItemsEarnedDetail(txn)}
                                        <span className="text-[9px] text-espresso-400 block font-mono">{new Date(txn.createdAt).toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`font-mono font-black text-xs ${txn.amount > 0 ? 'text-amber-500' : 'text-red-500'}`}>
                                            {txn.amount > 0 ? `+${txn.amount}` : txn.amount}
                                        </span>
                                        {txn.txnType === 'EARN' && (
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRollback(txn);
                                                }}
                                                className="p-1.5 bg-espresso-900 border border-espresso-800 text-espresso-400 hover:text-red-400 rounded-lg active:scale-95 transition-all cursor-pointer"
                                                title={t('host_scanner.btn_rollback', '방금 보낸 적립 전면 취소(롤백)')}
                                            >
                                                <Undo size={11} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-20 text-espresso-400 opacity-60 text-xs">
                                {t('host_dashboard.no_timeline_history', '최근 적립 이력이 없습니다.')}
                            </div>
                        )}
                    </div>
                </div>

                {/* 3열: 스탬프 정책 빌더 & 매장 프로필 수정 스튜디오 */}
                <div className="w-full lg:w-[36%] bg-espresso-900/30 backdrop-blur-sm border border-espresso-850 p-6 rounded-3xl flex flex-col min-h-0">
                    {/* 세그먼트 형태의 탭 전환 */}
                    <div className="flex bg-espresso-950 p-1 rounded-xl border border-espresso-850 shrink-0 mb-5">
                        <button 
                            onClick={() => setRightPanelTab('CONFIG')}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${rightPanelTab === 'CONFIG' ? 'bg-[#D4AF37] text-espresso-950' : 'text-espresso-300 hover:text-espresso-50'}`}
                        >
                            <Settings size={12} className="inline mr-1" />
                            {t('host_dashboard.tab_config', '스탬프/시즌 정책 빌더')}
                        </button>
                        <button 
                            onClick={() => setRightPanelTab('STORE')}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${rightPanelTab === 'STORE' ? 'bg-[#D4AF37] text-espresso-950' : 'text-espresso-300 hover:text-espresso-50'}`}
                        >
                            <Store size={12} className="inline mr-1" />
                            {t('host_dashboard.tab_store', '매장 정보 수정')}
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-1 max-h-[580px] scrollbar-thin scrollbar-thumb-espresso-800 scrollbar-track-transparent">
                        {rightPanelTab === 'CONFIG' ? (
                            /* 스탬프 정책 생성 스튜디오 */
                            <form onSubmit={handleCreateConfig} className="space-y-4 text-xs">
                                <div className="flex justify-between items-center pb-2 border-b border-espresso-850">
                                    <h4 className="font-serif font-black text-sm text-espresso-100">
                                        {t('host_dashboard.config_builder_title', '스탬프 & 시즌 프로모션 정책 빌더')}
                                    </h4>
                                    <span className="bg-amber-600/10 border border-amber-500/20 text-amber-400 text-[8px] font-black px-2 py-0.5 rounded-full">
                                        MULTI-CONFIG ACTIVE
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-espresso-350 font-bold block">{t('host_dashboard.lbl_policy_type', '정책 종류')}</label>
                                        <select 
                                            value={cardType}
                                            onChange={e => setCardType(e.target.value)}
                                            className="w-full bg-espresso-950 border border-espresso-800 rounded-xl px-3 py-2.5 text-espresso-100 cursor-pointer outline-none focus:border-[#D4AF37]/50"
                                        >
                                            <option value="REGULAR">{t('host_dashboard.opt_regular', '일반 스탬프')}</option>
                                            <option value="PROMOTION">{t('host_dashboard.opt_promotion', '시즌 프로모션')}</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-espresso-350 font-bold block">{t('host_dashboard.lbl_max_stamps', '완성 목표 도장수')}</label>
                                        <input 
                                            type="number" 
                                            min="5" 
                                            max="20"
                                            value={maxStamps}
                                            onChange={e => setMaxStamps(parseInt(e.target.value, 10))}
                                            className="w-full bg-espresso-950 border border-espresso-800 rounded-xl px-3 py-2 text-espresso-100 outline-none focus:border-[#D4AF37]/50"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-espresso-350 font-bold block">{t('host_dashboard.lbl_card_title', '도장판 정책 명칭')}</label>
                                    <input 
                                        type="text" 
                                        value={cardTitle}
                                        onChange={e => setCardTitle(e.target.value)}
                                        placeholder={t('host_dashboard.ph_card_title', '예: 아메리카노10+시즌음료5')}
                                        className="w-full bg-espresso-950 border border-espresso-800 rounded-xl px-3 py-2 text-espresso-100 outline-none focus:border-[#D4AF37]/50"
                                        required
                                    />
                                    {cardType === 'PROMOTION' && (
                                        <div className="bg-amber-950/20 border border-amber-900/30 p-3 rounded-lg text-[10px] text-amber-400/90 leading-relaxed">
                                            <strong>{t('host_dashboard.promo_guide_title', '복합 프로모션 구성 가이드')}</strong>: {t('host_dashboard.promo_guide_body', '명칭을 [메뉴명][목표숫자] 형태로 기재하고 + 기호로 연결해 주시면(예: 아메리카노10+시즌음료5+페어링케익2), POS 수동 적립 화면에서 메뉴별 개별 수량 카운터가 자동으로 완벽하게 구성됩니다!')}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-espresso-350 font-bold block">{t('host_dashboard.lbl_reward_desc', '도장판 완성 시 무료 리워드')}</label>
                                        <input 
                                            type="text" 
                                            value={rewardDesc}
                                            onChange={e => setRewardDesc(e.target.value)}
                                            placeholder={t('host_dashboard.ph_reward_desc', '예: 아메리카노 1잔 무료 쿠폰')}
                                            className="w-full bg-espresso-950 border border-espresso-800 rounded-xl px-3 py-2 text-espresso-100 outline-none focus:border-[#D4AF37]/50"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-espresso-350 font-bold block">{t('host_dashboard.lbl_valid_days', '쿠폰 유효 기간 (일)')}</label>
                                        <input 
                                            type="number" 
                                            min="30" 
                                            max="365"
                                            value={validDays}
                                            onChange={e => setValidDays(parseInt(e.target.value, 10))}
                                            className="w-full bg-espresso-950 border border-espresso-800 rounded-xl px-3 py-2 text-espresso-100 outline-none focus:border-[#D4AF37]/50"
                                        />
                                    </div>
                                </div>

                                <button 
                                    type="submit" 
                                    className="w-full py-3 bg-espresso-850 hover:bg-espresso-800 border border-espresso-750 text-[#D4AF37] font-black rounded-xl transition-all shadow active:scale-98 cursor-pointer mt-2"
                                >
                                    {t('host_dashboard.btn_create_policy', '새로운 스탬프 정책 승인 및 활성화')}
                                </button>
                            </form>
                        ) : (
                            /* 매장 관리 통합 스튜디오 분기 */
                            storeSubView === 'MAIN' ? (
                                /* 1단계: 모바일 ManageShop.tsx 대칭형 메인 매장 관리 카드 */
                                <div className="space-y-5 text-xs">
                                    <div className="pb-2 border-b border-espresso-850">
                                        <h4 className="font-serif font-black text-sm text-amber-500">
                                            {t('manage_shop.title', '내 매장 관리')}
                                        </h4>
                                        <p className="text-[10px] text-espresso-400 mt-0.5">{t('host_dashboard.store_form_subtitle', '모바일 앱과 실시간으로 공유되는 원격 관리 스튜디오')}</p>
                                    </div>

                                    {storeInfo ? (
                                        <div className="bg-espresso-950/60 p-5 rounded-3xl border border-espresso-850/80 shadow-md space-y-4">
                                            <div>
                                                <h3 className="font-serif font-black text-lg text-espresso-50 flex items-center gap-2 flex-wrap">
                                                    {storeInfo.name}
                                                    {storeInfo.storePlan === 'PREMIUM' && (
                                                        <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                            👑 PREMIUM
                                                        </span>
                                                    )}
                                                </h3>
                                                <p className="text-[11px] text-espresso-350 mt-1 font-medium">{storeInfo.address}</p>
                                            </div>

                                            {/* 심사 상태 노출 */}
                                            <div className="bg-espresso-950 rounded-xl p-3 flex justify-between items-center text-xs font-bold border border-white/5">
                                                <span className="text-espresso-400">{t('manage_shop.status_label', '심사 상태')}</span>
                                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-black border uppercase ${
                                                    storeInfo.status === 'APPROVED' ? 'bg-green-950/40 border-green-500/30 text-green-400' :
                                                    storeInfo.status === 'REJECTED' ? 'bg-red-950/40 border-red-500/30 text-red-400' :
                                                    'bg-amber-950/40 border-amber-500/30 text-amber-400'
                                                }`}>
                                                    {storeInfo.status === 'PENDING' ? t('manage_shop.status_pending', '심사대기') :
                                                     storeInfo.status === 'REJECTED' ? t('manage_shop.status_rejected', '심사반려') :
                                                     t('manage_shop.status_approved', '승인완료')}
                                                </span>
                                            </div>

                                            {/* 버튼 그룹 */}
                                            <div className="flex gap-2">
                                                <button 
                                                    type="button"
                                                    onClick={() => setStoreSubView('EDIT')}
                                                    className="flex-1 py-3 bg-[#D4AF37] hover:bg-amber-500 text-espresso-950 font-black text-xs rounded-xl transition-all shadow-md active:scale-98 cursor-pointer flex justify-center items-center gap-1.5"
                                                >
                                                    {t('manage_shop.btn_edit_info', '주요 정보 수정하기')}
                                                </button>
                                                {storeInfo.status === 'APPROVED' && (
                                                    <button 
                                                        type="button"
                                                        onClick={() => setStoreSubView('STORY')}
                                                        className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-espresso-950 font-black text-xs rounded-xl transition-all shadow-md active:scale-98 cursor-pointer flex justify-center items-center gap-1.5"
                                                    >
                                                        📣 {t('manage_shop.btn_publish_story', '소식 발행')}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-10 text-espresso-400 bg-espresso-950/40 border border-espresso-850/50 rounded-2xl">
                                            {t('manage_shop.no_store_info', '등록된 매장 정보가 존재하지 않습니다.')}
                                        </div>
                                    )}
                                </div>
                            ) : storeSubView === 'EDIT' ? (
                                /* 2단계: 주요 정보 수정하기 폼 (모바일 ManageShop.tsx 완벽 대칭형 고급 폼) */
                                <form onSubmit={handleUpdateStore} className="space-y-5 text-xs">
                                    <div className="flex justify-between items-center pb-2 border-b border-espresso-850">
                                        <div>
                                            <h4 className="font-serif font-black text-sm text-amber-500">
                                                {t('manage_shop.modal_edit_title', '주요 정보 수정하기')}
                                            </h4>
                                            <p className="text-[10px] text-espresso-400 mt-0.5">{storeInfo?.name}</p>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => setStoreSubView('MAIN')}
                                            className="px-2.5 py-1.5 bg-espresso-950 border border-espresso-800 text-espresso-300 rounded-lg hover:text-espresso-50 font-bold active:scale-95 transition-all cursor-pointer"
                                        >
                                            {t('common.cancel', '뒤로가기')}
                                        </button>
                                    </div>

                                    {/* 1. 기본 정보 & 위치 지도 섹션 */}
                                    <div className="space-y-3.5 bg-espresso-950/40 p-4 rounded-2xl border border-espresso-850/50">
                                        <span className="text-[11px] font-black text-espresso-200 block border-b border-espresso-900 pb-1">☕ {t('manage_shop.title_basic_info', '기본 정보')}</span>
                                        
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] text-[#D4AF37]/85 font-black block tracking-widest">{t('register_shop.label_shop_name', '매장명')}</label>
                                            <input 
                                                type="text" 
                                                value={editData.name || ''}
                                                onChange={e => setEditData({ ...editData, name: e.target.value })}
                                                className="w-full bg-espresso-955 border border-espresso-800 rounded-xl px-3 py-2 text-espresso-50 font-medium outline-none focus:border-[#D4AF37]/50"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[9px] text-[#D4AF37]/85 font-black block tracking-widest">{t('register_shop.label_address', '매장 주소')}</label>
                                            <input 
                                                type="text" 
                                                value={editData.address || ''}
                                                onChange={e => setEditData({ ...editData, address: e.target.value })}
                                                className="w-full bg-espresso-955 border border-espresso-800 rounded-xl px-3 py-2 text-espresso-50 font-medium outline-none focus:border-[#D4AF37]/50"
                                                required
                                            />
                                        </div>

                                        {/* 위치 지정 Map & Nominatim 지오코딩 검색 */}
                                        <div className="border border-espresso-800 rounded-xl overflow-hidden bg-espresso-950 mt-3">
                                            <div className="bg-espresso-900 px-3 py-2.5 border-b border-espresso-800">
                                                <span className="text-[11px] font-bold text-espresso-100 block">{t('register_shop.label_pin_title', '매장 위치 핀 설정')}</span>
                                                <span className="text-[9px] text-espresso-400 font-medium block mt-0.5">{t('register_shop.label_pin_desc', '주소 검색 후 지도를 터치하여 정확한 위치로 핀을 이동해주세요.')}</span>
                                                
                                                <div className="relative flex items-center gap-2 mt-2">
                                                    <div className="relative flex-1 min-w-0">
                                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-espresso-500" size={12} />
                                                        <input
                                                            type="text"
                                                            placeholder={t('register_shop.ph_map_search', '지역명, 주소, 상호명 등 지도에서 검색')}
                                                            className="w-full bg-espresso-950 border border-espresso-800 h-8 pl-8 pr-8 rounded-lg outline-none text-[10px] font-medium text-espresso-200 focus:ring-1 focus:ring-amber-500/50"
                                                            value={mapSearchQuery}
                                                            onChange={(e) => setMapSearchQuery(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    handleMapSearch(e);
                                                                }
                                                            }}
                                                        />
                                                        {isMapSearching && (
                                                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                                                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-amber-500"></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button type="button" onClick={handleMapSearch} disabled={isMapSearching} className="bg-amber-600 disabled:opacity-50 text-espresso-950 h-8 px-2.5 rounded-lg text-[10px] font-black shrink-0 cursor-pointer active:scale-95 transition-all">
                                                        {t('register_shop.btn_search', '검색')}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="h-44 w-full relative z-0">
                                                {isLoaded ? (
                                                    <GoogleMap
                                                        mapContainerStyle={{ width: '100%', height: '100%' }}
                                                        center={mapCenter ? { lat: mapCenter[0], lng: mapCenter[1] } : { lat: editData.lat, lng: editData.lng }}
                                                        zoom={15}
                                                        options={{ disableDefaultUI: true, zoomControl: true }}
                                                        onClick={(e) => {
                                                            if (e.latLng) {
                                                                setEditData({ ...editData, lat: e.latLng.lat(), lng: e.latLng.lng() });
                                                                setMapCenter([e.latLng.lat(), e.latLng.lng()]);
                                                            }
                                                        }}
                                                    >
                                                        <Marker position={{ lat: editData.lat, lng: editData.lng }} />
                                                    </GoogleMap>
                                                ) : (
                                                    <div className="w-full h-full bg-espresso-950/50 flex items-center justify-center text-espresso-400 font-mono text-[10px]">Loading Map...</div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[9px] text-[#D4AF37]/85 font-black block tracking-widest">{t('register_shop.label_phone', '매장 대표 연락처')}</label>
                                            <input 
                                                type="text" 
                                                value={editData.phone || ''}
                                                onChange={e => setEditData({ ...editData, phone: e.target.value })}
                                                className="w-full bg-espresso-955 border border-espresso-800 rounded-xl px-3 py-2 text-espresso-50 font-medium outline-none focus:border-[#D4AF37]/50 font-mono"
                                            />
                                        </div>

                                        {/* 영업시간 요일별 세부 적용 기능 */}
                                        <div className="space-y-2.5">
                                            <div className="flex justify-between items-end">
                                                <label className="text-[9px] text-[#D4AF37]/85 font-black block tracking-widest">⏰ {t('register_shop.label_hours', '영업시간 세분화')}</label>
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        const mon = dailyHours[0];
                                                        setDailyHours(dailyHours.map(h => ({ ...h, open: mon.open, close: mon.close, isClosed: mon.isClosed, comment: mon.comment })));
                                                    }}
                                                    className="text-[9px] font-black bg-espresso-850 hover:bg-espresso-800 text-[#D4AF37] hover:text-amber-400 px-2 py-1 rounded-md transition-all active:scale-95 cursor-pointer border border-espresso-800"
                                                >
                                                    월요일 기준 전체 적용
                                                </button>
                                            </div>
                                            <div className="space-y-1.5 border border-espresso-800 bg-espresso-950/40 p-2.5 rounded-xl">
                                                {dailyHours.map((dayHour, idx) => (
                                                    <div key={idx} className="flex flex-col gap-1.5 bg-espresso-950 p-2 rounded-lg border border-espresso-800/80">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-6 h-6 rounded flex items-center justify-center font-black text-[10px] shrink-0 ${['토','일'].includes(dayHour.day) ? 'bg-orange-950/60 border border-orange-500/20 text-orange-400' : 'bg-espresso-850 border border-espresso-800 text-espresso-300'}`}>
                                                                {dayHour.day}
                                                            </div>
                                                            
                                                            {!dayHour.isClosed ? (
                                                                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                                                                    <input type="time" value={dayHour.open} onChange={e => setDailyHours(prev => prev.map((h, i) => i === idx ? { ...h, open: e.target.value } : h))} className="flex-1 min-w-0 bg-espresso-900 border border-espresso-800 rounded h-7 px-1.5 outline-none text-[10px] font-mono text-espresso-50 font-medium focus:border-amber-500/40" />
                                                                    <span className="text-espresso-400 font-bold shrink-0">-</span>
                                                                    <input type="time" value={dayHour.close} onChange={e => setDailyHours(prev => prev.map((h, i) => i === idx ? { ...h, close: e.target.value } : h))} className="flex-1 min-w-0 bg-espresso-900 border border-espresso-800 rounded h-7 px-1.5 outline-none text-[10px] font-mono text-espresso-50 font-medium focus:border-amber-500/40" />
                                                                </div>
                                                            ) : (
                                                                <div className="flex-1 flex items-center justify-center bg-espresso-900/20 rounded h-7 border border-espresso-900/50">
                                                                    <span className="text-[9px] font-black text-red-500/80">정기 휴무일</span>
                                                                </div>
                                                            )}
                                                            
                                                            <label className="flex items-center gap-1.5 ml-1 shrink-0 cursor-pointer">
                                                                <input type="checkbox" checked={dayHour.isClosed} onChange={e => setDailyHours(prev => prev.map((h, i) => i === idx ? { ...h, isClosed: e.target.checked } : h))} className="w-3.5 h-3.5 accent-[#D4AF37] rounded border-espresso-800" />
                                                                <span className="text-[9px] font-black text-[#D4AF37]/80">휴무</span>
                                                            </label>
                                                        </div>
                                                        <div className="flex items-center pl-[2rem]">
                                                            <input 
                                                                type="text" 
                                                                placeholder="특이사항 (예: 브레이크타임, 공휴일 휴무 등)" 
                                                                value={dayHour.comment || ''} 
                                                                onChange={e => setDailyHours(prev => prev.map((h, i) => i === idx ? { ...h, comment: e.target.value } : h))}
                                                                className="w-full bg-espresso-900 border border-espresso-800 rounded h-6 px-2 outline-none text-[9px] font-medium text-espresso-50 focus:border-amber-500/30 placeholder:text-espresso-600" 
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[9px] text-[#D4AF37]/85 font-black block tracking-widest">{t('register_shop.label_website', '홈페이지 / SNS 링크')}</label>
                                            <input 
                                                type="url" 
                                                value={editData.websiteUrl || ''}
                                                onChange={e => setEditData({ ...editData, websiteUrl: e.target.value })}
                                                placeholder="https://instagram.com/..."
                                                className="w-full bg-espresso-955 border border-espresso-800 rounded-xl px-3 py-2 text-espresso-50 font-medium outline-none focus:border-[#D4AF37]/50"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[9px] text-[#D4AF37]/85 font-black block tracking-widest">{t('register_shop.label_short_desc', '한 줄 소개')}</label>
                                            <input 
                                                type="text" 
                                                value={editData.shortDesc || ''}
                                                onChange={e => setEditData({ ...editData, shortDesc: e.target.value })}
                                                className="w-full bg-espresso-955 border border-espresso-800 rounded-xl px-3 py-2 text-espresso-50 font-medium outline-none focus:border-[#D4AF37]/50"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[9px] text-[#D4AF37]/85 font-black block tracking-widest">{t('host_dashboard.lbl_store_desc', '브랜드 감성 상세 소개')}</label>
                                            <textarea 
                                                value={editData.longDesc || ''}
                                                onChange={e => setEditData({ ...editData, longDesc: e.target.value })}
                                                rows={3}
                                                className="w-full bg-espresso-955 border border-espresso-800 rounded-xl px-3 py-2 text-espresso-50 font-medium outline-none focus:border-[#D4AF37]/50 resize-none leading-relaxed"
                                            />
                                        </div>
                                    </div>

                                    {/* 2. 메뉴 & 브랜드 감성 시그니처 */}
                                    <div className="space-y-3.5 bg-espresso-950/40 p-4 rounded-2xl border border-espresso-850/50">
                                        <span className="text-[11px] font-black text-espresso-200 block border-b border-espresso-900 pb-1">✨ {t('register_shop.title_sensory_details', '메뉴 및 브랜드 감성')}</span>
                                        
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] text-[#D4AF37]/85 font-black block tracking-widest">{t('register_shop.label_sig_bean', '대표 시그니처 원두')}</label>
                                            <input 
                                                type="text" 
                                                value={editData.signatureBean || ''}
                                                onChange={e => setEditData({ ...editData, signatureBean: e.target.value })}
                                                placeholder="예: 싱글오리진 에티오피아 게샤"
                                                className="w-full bg-espresso-955 border border-espresso-800 rounded-xl px-3 py-2 text-espresso-50 font-medium outline-none focus:border-[#D4AF37]/50"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[9px] text-[#D4AF37]/85 font-black block tracking-widest">{t('register_shop.label_sig_menu', '대표 시그니처 음료 메뉴')}</label>
                                            <input 
                                                type="text" 
                                                value={editData.signatureMenu || ''}
                                                onChange={e => setEditData({ ...editData, signatureMenu: e.target.value })}
                                                className="w-full bg-espresso-955 border border-espresso-800 rounded-xl px-3 py-2 text-espresso-50 font-medium outline-none focus:border-[#D4AF37]/50"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[9px] text-[#D4AF37]/85 font-black block tracking-widest">{t('register_shop.label_dessert_pairing', '페어링 디저트 추천')}</label>
                                            <input 
                                                type="text" 
                                                value={editData.dessertPairing || ''}
                                                onChange={e => setEditData({ ...editData, dessertPairing: e.target.value })}
                                                className="w-full bg-espresso-955 border border-espresso-800 rounded-xl px-3 py-2 text-espresso-50 font-medium outline-none focus:border-[#D4AF37]/50"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[9px] text-[#D4AF37]/85 font-black block tracking-widest">{t('register_shop.label_equipment', '브루잉 추출 머신 / 도구')}</label>
                                            <input 
                                                type="text" 
                                                value={editData.equipment || ''}
                                                onChange={e => setEditData({ ...editData, equipment: e.target.value })}
                                                placeholder="예: La Marzocco Linea PB, Hario V60"
                                                className="w-full bg-espresso-955 border border-espresso-800 rounded-xl px-3 py-2 text-espresso-50 font-medium outline-none focus:border-[#D4AF37]/50"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[9px] text-[#D4AF37]/85 font-black block tracking-widest">{t('register_shop.label_coffee_type', '주요 에스프레소/커피 방식')}</label>
                                            <select 
                                                value={editData.primaryCoffeeType || 'GENERAL'}
                                                onChange={e => setEditData({ ...editData, primaryCoffeeType: e.target.value })}
                                                className="w-full bg-espresso-955 border border-espresso-800 rounded-xl px-3 py-2.5 text-espresso-50 font-medium cursor-pointer outline-none focus:border-[#D4AF37]/50"
                                            >
                                                <option value="SINGLE_ORIGIN" className="bg-espresso-950">{t('register_shop.type_single', '✨ 싱글오리진 스페셜티 중심')}</option>
                                                <option value="BLENDED" className="bg-espresso-950">{t('register_shop.type_blended', '🎨 독자적인 로스터리 블렌딩')}</option>
                                                <option value="SPECIALTY_ROASTERY" className="bg-espresso-950">{t('register_shop.type_specialty', '🏆 스페셜티 로스터리 (모두 취급)')}</option>
                                                <option value="GENERAL" className="bg-espresso-950">{t('register_shop.type_general', '🏬 대중적인 프랜차이즈 / 일반')}</option>
                                            </select>
                                        </div>

                                        {/* 상세 개별 메뉴 동적 등록 빌더 (상세 메뉴 등록) */}
                                        <div className="border border-espresso-800 bg-espresso-950 rounded-xl p-3.5 space-y-3 mt-3">
                                            <div className="flex justify-between items-center border-b border-espresso-900 pb-2">
                                                <span className="font-bold text-[11px] text-espresso-100">{t('register_shop.label_menu_builder', '상세 메뉴 등록')}</span>
                                                <span className="text-[9px] text-espresso-400 font-medium">{t('register_shop.label_menu_builder_desc', '개별 메뉴 사진과 가격을 등록합니다.')}</span>
                                            </div>
                                            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                                                {menuItems.map((item, idx) => (
                                                    <div key={idx} className="bg-espresso-900/40 p-2.5 rounded-xl border border-espresso-800 flex gap-2.5 relative">
                                                        <button 
                                                            type="button"
                                                            onClick={() => setMenuItems(prev => prev.filter((_, i) => i !== idx))} 
                                                            className="absolute top-1.5 right-1.5 w-4 h-4 flex items-center justify-center bg-espresso-855 hover:bg-espresso-750 text-espresso-300 hover:text-espresso-100 rounded-full active:scale-95 text-[8px] z-10 border border-espresso-800 cursor-pointer"
                                                        >
                                                            ✕
                                                        </button>
                                                        <div 
                                                            className="w-14 h-14 shrink-0 bg-espresso-950 rounded-lg border border-espresso-800 overflow-hidden cursor-pointer flex flex-col items-center justify-center relative hover:border-amber-500/40 transition-colors"
                                                            onClick={() => menuItemImageRefs.current[idx]?.click()}
                                                        >
                                                            {item.imageUrl ? (
                                                                <img src={item.imageUrl.startsWith('data:') || item.imageUrl.startsWith('http') || item.imageUrl.startsWith('/uploads') ? item.imageUrl : `/api${item.imageUrl}`} className="w-full h-full object-cover" alt="" />
                                                            ) : (
                                                                <React.Fragment>
                                                                    <Camera size={14} className="text-espresso-500 mb-0.5" />
                                                                    <span className="text-[8px] text-espresso-500 font-bold">사진</span>
                                                                </React.Fragment>
                                                            )}
                                                            <input 
                                                                type="file" 
                                                                className="hidden" 
                                                                ref={el => { menuItemImageRefs.current[idx] = el; }}
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
                                                        <div className="flex-1 min-w-0 space-y-1.5 pt-0.5">
                                                            <input type="text" placeholder={t('register_shop.ph_item_name', '메뉴명 (예: 아메리카노)')} value={item.name} onChange={e => setMenuItems(prev => prev.map((m, i) => i === idx ? { ...m, name: e.target.value } : m))} className="w-full bg-transparent border-b border-espresso-800 focus:border-amber-500/40 outline-none text-[12px] font-bold text-espresso-50 pb-0.5" />
                                                            <div className="flex gap-2">
                                                                <select value={item.category} onChange={e => setMenuItems(prev => prev.map((m, i) => i === idx ? { ...m, category: e.target.value } : m))} className="bg-espresso-950 border border-espresso-800 text-[9px] font-bold text-espresso-50 rounded px-1.5 h-6 outline-none cursor-pointer">
                                                                    <option value="COFFEE" className="bg-espresso-950">Coffee</option>
                                                                    <option value="DESSERT" className="bg-espresso-950">Dessert</option>
                                                                    <option value="BEVERAGE" className="bg-espresso-950">Beverage</option>
                                                                    <option value="TEA" className="bg-espresso-950">Tea</option>
                                                                    <option value="BREAD" className="bg-espresso-950">Bread</option>
                                                                    <option value="FOOD" className="bg-espresso-950">Food</option>
                                                                    <option value="ETC" className="bg-espresso-950">Etc</option>
                                                                </select>
                                                                <input type="text" placeholder={t('register_shop.ph_item_price', '가격 (예: 5,000원)')} value={item.price} onChange={e => setMenuItems(prev => prev.map((m, i) => i === idx ? { ...m, price: e.target.value } : m))} className="flex-1 min-w-0 bg-transparent border-b border-espresso-800 focus:border-amber-500/40 outline-none text-[10px] text-espresso-50 pb-0.5 h-6" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <button type="button" onClick={() => setMenuItems(prev => [...prev, { name: '', price: '', category: 'COFFEE', imageUrl: null }])} className="w-full py-2.5 rounded-xl border border-dashed border-espresso-700 bg-espresso-950 hover:bg-espresso-900 text-espresso-400 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all">
                                                + {t('register_shop.btn_add_menu_item', '상세 메뉴 추가')}
                                            </button>
                                        </div>
                                    </div>

                                    {/* 3. 상세 원두 프로필 */}
                                    <div className="space-y-3 bg-espresso-950/40 p-3.5 rounded-2xl border border-espresso-850/50">
                                        <span className="text-[11px] font-black text-espresso-200 block border-b border-espresso-900 pb-1">🌱 {t('register_shop.title_bean_profile', '원두 프로필 상세')}</span>

                                        <div className="space-y-1.5">
                                            <label className="text-[9px] text-[#D4AF37]/85 font-black block tracking-widest">{t('register_shop.label_bean_origin', '원두 원산지 생산지')}</label>
                                            <input 
                                                type="text" 
                                                value={editData.beanOrigin || ''}
                                                onChange={e => setEditData({ ...editData, beanOrigin: e.target.value })}
                                                placeholder="예: Colombia Sidra, Ethiopia Yirgacheffe"
                                                className="w-full bg-espresso-955 border border-espresso-800 rounded-xl px-3 py-2 text-espresso-50 font-medium outline-none focus:border-[#D4AF37]/50"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[9px] text-[#D4AF37]/85 font-black block tracking-widest">{t('register_shop.label_bean_roast', '로스팅 포인트 단계')}</label>
                                            <input 
                                                type="text" 
                                                value={editData.beanRoastLevel || ''}
                                                onChange={e => setEditData({ ...editData, beanRoastLevel: e.target.value })}
                                                placeholder="예: 미디엄 로스트, 라이트 로스트"
                                                className="w-full bg-espresso-955 border border-espresso-800 rounded-xl px-3 py-2 text-espresso-50 font-medium outline-none focus:border-[#D4AF37]/50"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[9px] text-[#D4AF37]/85 font-black block tracking-widest">{t('register_shop.label_bean_notes', '원두 컵 노트 컵 테이스팅 감성')}</label>
                                            <input 
                                                type="text" 
                                                value={editData.beanNotes || ''}
                                                onChange={e => setEditData({ ...editData, beanNotes: e.target.value })}
                                                placeholder="예: 자스민, 레몬그라스, 메이플시럽"
                                                className="w-full bg-espresso-955 border border-espresso-800 rounded-xl px-3 py-2 text-espresso-50 font-medium outline-none focus:border-[#D4AF37]/50"
                                            />
                                        </div>
                                    </div>

                                    {/* 4. 취향 매트릭스 4대 맛 강도 */}
                                    <div className="space-y-3.5 bg-espresso-950/40 p-3.5 rounded-2xl border border-espresso-850/50">
                                        <span className="text-[11px] font-black text-espresso-200 block border-b border-espresso-900 pb-1">📊 {t('register_shop.title_taste_profile', '원두 4대 맛 매커니즘 조율')}</span>
                                        
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-center text-[9px]">
                                                <span className="text-[#D4AF37]/85 font-black tracking-widest">{t('profile.radar_acidity', '산미 (Acidity)')}</span>
                                                <span className="font-mono text-espresso-50 font-black">{editData.acidity || 3} / 5</span>
                                            </div>
                                            <input 
                                                type="range" min="1" max="5" step="0.5"
                                                value={editData.acidity || 3} 
                                                onChange={e => setEditData({ ...editData, acidity: parseFloat(e.target.value) })}
                                                className="w-full accent-amber-500 bg-espresso-950 h-1 rounded-lg outline-none cursor-pointer"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-center text-[9px]">
                                                <span className="text-[#D4AF37]/85 font-black tracking-widest">{t('profile.radar_sweetness', '단맛 (Sweetness)')}</span>
                                                <span className="font-mono text-espresso-50 font-black">{editData.sweetness || 3} / 5</span>
                                            </div>
                                            <input 
                                                type="range" min="1" max="5" step="0.5"
                                                value={editData.sweetness || 3} 
                                                onChange={e => setEditData({ ...editData, sweetness: parseFloat(e.target.value) })}
                                                className="w-full accent-amber-500 bg-espresso-950 h-1 rounded-lg outline-none cursor-pointer"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-center text-[9px]">
                                                <span className="text-[#D4AF37]/85 font-black tracking-widest">{t('profile.radar_bitterness', '쓴맛 (Bitterness)')}</span>
                                                <span className="font-mono text-espresso-50 font-black">{editData.bitterness || 3} / 5</span>
                                            </div>
                                            <input 
                                                type="range" min="1" max="5" step="0.5"
                                                value={editData.bitterness || 3} 
                                                onChange={e => setEditData({ ...editData, bitterness: parseFloat(e.target.value) })}
                                                className="w-full accent-amber-500 bg-espresso-950 h-1 rounded-lg outline-none cursor-pointer"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-center text-[9px]">
                                                <span className="text-[#D4AF37]/85 font-black tracking-widest">{t('profile.radar_body', '바디감 (Body)')}</span>
                                                <span className="font-mono text-espresso-50 font-black">{editData.body || 3} / 5</span>
                                            </div>
                                            <input 
                                                type="range" min="1" max="5" step="0.5"
                                                value={editData.body || 3} 
                                                onChange={e => setEditData({ ...editData, body: parseFloat(e.target.value) })}
                                                className="w-full accent-amber-500 bg-espresso-950 h-1 rounded-lg outline-none cursor-pointer"
                                            />
                                        </div>
                                    </div>

                                    {/* 5. 편의 옵션 & 제공 혜택 체크박스 */}
                                    <div className="space-y-3 bg-espresso-950/40 p-3.5 rounded-2xl border border-espresso-850/50">
                                        <span className="text-[11px] font-black text-espresso-200 block border-b border-espresso-900 pb-1">⚡ {t('register_shop.title_features', '매장 제공 혜택 및 편의 정보')}</span>

                                        <div className="grid grid-cols-2 gap-2.5">
                                            <label className="flex items-center gap-2 bg-espresso-950 border border-espresso-850 hover:border-amber-500/20 px-2.5 py-2 rounded-xl transition-all cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={Boolean(editData.hasDecaf)}
                                                    onChange={e => setEditData({ ...editData, hasDecaf: e.target.checked })}
                                                    className="w-4 h-4 accent-[#D4AF37] border-espresso-800 rounded bg-espresso-950"
                                                />
                                                <span className="text-[10px] text-espresso-50 font-bold">{t('register_shop.opt_decaf', '디카페인 변경')}</span>
                                            </label>

                                            <label className="flex items-center gap-2 bg-espresso-950 border border-espresso-850 hover:border-amber-500/20 px-2.5 py-2 rounded-xl transition-all cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={Boolean(editData.hasOatMilk)}
                                                    onChange={e => setEditData({ ...editData, hasOatMilk: e.target.checked })}
                                                    className="w-4 h-4 accent-[#D4AF37] border-espresso-800 rounded bg-espresso-950"
                                                />
                                                <span className="text-[10px] text-espresso-50 font-bold">{t('register_shop.opt_oat', '오트밀크 변경')}</span>
                                            </label>

                                            <label className="flex items-center gap-2 bg-espresso-950 border border-espresso-850 hover:border-amber-500/20 px-2.5 py-2 rounded-xl transition-all cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={Boolean(editData.hasParking)}
                                                    onChange={e => setEditData({ ...editData, hasParking: e.target.checked })}
                                                    className="w-4 h-4 accent-[#D4AF37] border-espresso-800 rounded bg-espresso-950"
                                                />
                                                <span className="text-[10px] text-espresso-50 font-bold">{t('register_shop.opt_parking', '주차 지원')}</span>
                                            </label>

                                            <label className="flex items-center gap-2 bg-espresso-950 border border-espresso-850 hover:border-amber-500/20 px-2.5 py-2 rounded-xl transition-all cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={Boolean(editData.hasWifi)}
                                                    onChange={e => setEditData({ ...editData, hasWifi: e.target.checked })}
                                                    className="w-4 h-4 accent-[#D4AF37] border-espresso-800 rounded bg-espresso-950"
                                                />
                                                <span className="text-[10px] text-espresso-50 font-bold">{t('register_shop.opt_wifi', '무선 인터넷')}</span>
                                            </label>

                                            <label className="flex items-center gap-2 bg-espresso-950 border border-espresso-850 hover:border-amber-500/20 px-2.5 py-2 rounded-xl transition-all cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={Boolean(editData.hasPetFriendly)}
                                                    onChange={e => setEditData({ ...editData, hasPetFriendly: e.target.checked })}
                                                    className="w-4 h-4 accent-[#D4AF37] border-espresso-800 rounded bg-espresso-950"
                                                />
                                                <span className="text-[10px] text-espresso-50 font-bold">{t('register_shop.opt_pet', '반려동물 동반')}</span>
                                            </label>

                                            <label className="flex items-center gap-2 bg-espresso-950 border border-espresso-850 hover:border-amber-500/20 px-2.5 py-2 rounded-xl transition-all cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={Boolean(editData.hasPowerOutlets)}
                                                    onChange={e => setEditData({ ...editData, hasPowerOutlets: e.target.checked })}
                                                    className="w-4 h-4 accent-[#D4AF37] border-espresso-800 rounded bg-espresso-950"
                                                />
                                                <span className="text-[10px] text-espresso-50 font-bold">{t('register_shop.opt_outlets', '콘센트 다수')}</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* 6. 3대 갤러리 업로더 (매장 갤러리, 커피 메뉴판, 디저트/인기메뉴) */}
                                    <div className="space-y-5 bg-espresso-950/40 p-4 rounded-2xl border border-espresso-850/50">
                                        <span className="text-[11px] font-black text-espresso-200 block border-b border-espresso-900 pb-1">📸 {t('manage_shop.title_media', '매장 미디어 갤러리')}</span>
                                        
                                        {/* A. 매장 전경 대표 사진 (mediaFiles) */}
                                        <div>
                                            <div className="flex justify-between items-center mb-1.5">
                                                <label className="text-[9px] text-[#D4AF37]/85 font-black block tracking-widest">{t('manage_shop.title_media', '매장 대표 분위기 사진')}</label>
                                                <span className="text-[9px] text-espresso-500 font-bold font-mono">{mediaFiles.length}/5</span>
                                            </div>
                                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-espresso-800 scrollbar-track-transparent">
                                                {mediaFiles.length < 5 && (
                                                    <button type="button" onClick={() => fileInputRef.current?.click()} className="w-16 h-16 shrink-0 rounded-xl border border-dashed border-espresso-800 bg-espresso-950 flex flex-col items-center justify-center text-espresso-500 hover:text-espresso-300 transition-colors cursor-pointer">
                                                        <Camera size={16} className="mb-0.5" />
                                                        <span className="text-[8px] font-bold">추가</span>
                                                    </button>
                                                )}
                                                {mediaFiles.map((media, idx) => (
                                                    <div key={idx} className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden border border-espresso-800">
                                                        <img src={media.url.startsWith('data:') || media.url.startsWith('http') || media.url.startsWith('/uploads') ? media.url : `/api${media.url}`} alt="" className="w-full h-full object-cover" />
                                                        <button type="button" onClick={() => removeFile(idx)} className="absolute top-1 right-1 w-4 h-4 bg-espresso-955/60 text-espresso-50 rounded-full flex items-center justify-center active:scale-90 border border-espresso-800 cursor-pointer">
                                                            <Trash2 size={10} />
                                                        </button>
                                                    </div>
                                                ))}
                                                <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept="image/*" className="hidden" />
                                            </div>
                                        </div>

                                        {/* B. 커피 메뉴판 이미지 (coffeeMenuImages) */}
                                        <div>
                                            <div className="flex justify-between items-center mb-1.5">
                                                <label className="text-[9px] text-[#D4AF37]/85 font-black block tracking-widest">{t('manage_shop.label_menu_image', '커피 메뉴판 이미지')}</label>
                                                <span className="text-[9px] text-espresso-500 font-bold font-mono">{coffeeMenuImages.length}/5</span>
                                            </div>
                                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-espresso-800 scrollbar-track-transparent">
                                                {coffeeMenuImages.length < 5 && (
                                                    <button type="button" onClick={() => coffeeMenuInputRef.current?.click()} className="w-16 h-16 shrink-0 rounded-xl border border-dashed border-espresso-800 bg-espresso-950 flex flex-col items-center justify-center text-espresso-500 hover:text-espresso-300 transition-colors cursor-pointer">
                                                        <Camera size={16} className="mb-0.5" />
                                                        <span className="text-[8px] font-bold">추가</span>
                                                    </button>
                                                )}
                                                {coffeeMenuImages.map((media, idx) => (
                                                    <div key={idx} className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden border border-espresso-800">
                                                        <img src={media.url.startsWith('data:') || media.url.startsWith('http') || media.url.startsWith('/uploads') ? media.url : `/api${media.url}`} alt="" className="w-full h-full object-cover" />
                                                        <button type="button" onClick={() => removeMenuFile(idx, setCoffeeMenuImages)} className="absolute top-1 right-1 w-4 h-4 bg-espresso-955/60 text-espresso-50 rounded-full flex items-center justify-center active:scale-90 border border-espresso-800 cursor-pointer">
                                                            <Trash2 size={10} />
                                                        </button>
                                                    </div>
                                                ))}
                                                <input type="file" ref={coffeeMenuInputRef} onChange={(e) => handleMenuFileChange(e, setCoffeeMenuImages)} multiple accept="image/*" className="hidden" />
                                            </div>
                                        </div>

                                        {/* C. 인기 디저트/메뉴 이미지 (popularMenuImages) */}
                                        <div>
                                            <div className="flex justify-between items-center mb-1.5">
                                                <label className="text-[9px] text-[#D4AF37]/85 font-black block tracking-widest">{t('manage_shop.label_popular_image', '인기 디저트/메뉴 이미지')}</label>
                                                <span className="text-[9px] text-espresso-500 font-bold font-mono">{popularMenuImages.length}/5</span>
                                            </div>
                                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-espresso-800 scrollbar-track-transparent">
                                                {popularMenuImages.length < 5 && (
                                                    <button type="button" onClick={() => popularMenuInputRef.current?.click()} className="w-16 h-16 shrink-0 rounded-xl border border-dashed border-espresso-800 bg-espresso-950 flex flex-col items-center justify-center text-espresso-500 hover:text-espresso-300 transition-colors cursor-pointer">
                                                        <Camera size={16} className="mb-0.5" />
                                                        <span className="text-[8px] font-bold">추가</span>
                                                    </button>
                                                )}
                                                {popularMenuImages.map((media, idx) => (
                                                    <div key={idx} className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden border border-espresso-800">
                                                        <img src={media.url.startsWith('data:') || media.url.startsWith('http') || media.url.startsWith('/uploads') ? media.url : `/api${media.url}`} alt="" className="w-full h-full object-cover" />
                                                        <button type="button" onClick={() => removeMenuFile(idx, setPopularMenuImages)} className="absolute top-1 right-1 w-4 h-4 bg-espresso-950/60 text-espresso-50 rounded-full flex items-center justify-center active:scale-90 border border-espresso-800 cursor-pointer">
                                                            <Trash2 size={10} />
                                                        </button>
                                                    </div>
                                                ))}
                                                <input type="file" ref={popularMenuInputRef} onChange={(e) => handleMenuFileChange(e, setPopularMenuImages)} multiple accept="image/*" className="hidden" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 변경사항 저장하기 단추 */}
                                    <button 
                                        type="submit" 
                                        disabled={isSaving}
                                        className="w-full py-3.5 bg-[#D4AF37] hover:bg-amber-500 text-espresso-950 font-black rounded-xl transition-all shadow-md active:scale-98 cursor-pointer mt-3 text-xs flex items-center justify-center gap-1.5"
                                    >
                                        <Save size={14} />
                                        {isSaving ? t('manage_shop.status_saving', '저장 중...') : t('manage_shop.btn_save_all', '변경사항 완벽하게 저장하기')}
                                    </button>
                                </form>
                            ) : (
                                /* 3단계: 단골 고객 소식/공지 발행 폼 */
                                <form onSubmit={handlePublishStory} className="space-y-5 text-xs">
                                    <div className="flex justify-between items-center pb-2 border-b border-espresso-850">
                                        <div>
                                            <h4 className="font-serif font-black text-sm text-orange-400">
                                                {t('manage_shop.btn_publish_story', '📣 단골 고객 소식/공지 발행')}
                                            </h4>
                                            <p className="text-[10px] text-espresso-400 mt-0.5">{storeInfo?.name}</p>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => setStoreSubView('MAIN')}
                                            className="px-2.5 py-1.5 bg-espresso-950 border border-espresso-800 text-espresso-300 rounded-lg hover:text-espresso-50 font-bold active:scale-95 transition-all cursor-pointer"
                                        >
                                            {t('common.cancel', '뒤로가기')}
                                        </button>
                                    </div>

                                    <div className="space-y-4 bg-espresso-950/40 p-4 rounded-2xl border border-espresso-850/50">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] text-espresso-300 font-bold block">📣 {t('manage_shop.label_story_content', '단골 전달 소식 / 공지 내용')}</label>
                                            <textarea 
                                                value={storyContent}
                                                onChange={e => setStoryContent(e.target.value)}
                                                rows={6}
                                                placeholder={t('manage_shop.ph_story_content', '단골 고객님들께 전달할 브랜드 공지나 깜짝 이벤트를 작성해주세요!')}
                                                className="w-full bg-espresso-950 border border-espresso-800 rounded-xl px-3 py-2 text-espresso-100 outline-none focus:border-orange-500/50 resize-none leading-relaxed"
                                                required
                                            />
                                        </div>

                                        <label className="flex items-center gap-2.5 bg-espresso-950 border border-espresso-850 hover:border-orange-500/20 px-3 py-2.5 rounded-xl transition-all cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={sendEmail}
                                                onChange={e => setSendEmail(e.target.checked)}
                                                className="w-4 h-4 accent-orange-500 border-espresso-800 rounded bg-espresso-950"
                                            />
                                            <div>
                                                <span className="text-[10px] text-espresso-100 font-black block">📧 {t('manage_shop.send_email_notification', '단골 고객들에게 이메일 동시 전송')}</span>
                                                <span className="text-[8px] text-espresso-400 font-medium block mt-0.5">{t('manage_shop.send_email_notification_desc', '작성한 내용이 단골 고객들의 가입 이메일로 즉각 동시 발송됩니다.')}</span>
                                            </div>
                                        </label>
                                    </div>

                                    <button 
                                        type="submit" 
                                        disabled={isSubmittingStory}
                                        className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-espresso-950 font-black rounded-xl transition-all shadow-md active:scale-98 cursor-pointer mt-3 text-xs"
                                    >
                                        {isSubmittingStory ? t('common.saving', '소식 발행 중...') : t('manage_shop.btn_publish_story_submit', '소식 및 공지 즉시 발행하기')}
                                    </button>
                                </form>
                            )
                        )}
                    </div>
                </div>

            </div>

            {/* 실시간 QR 코드 스캐너 모달 */}
            <HostQRScannerModal 
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onScanSuccess={(scannedUserId) => {
                    setTargetUserId(scannedUserId);
                    setIsScannerOpen(false);
                    setSuccessMessage(t('host_dashboard.scan_success_msg', 'QR 코드가 성공적으로 스캔되어 ID가 자동으로 인입되었습니다!'));
                }}
            />

            {/* 무료 쿠폰 발급/사용 현황 스튜디오 모달 */}
            <HostCouponListModal
                isOpen={isCouponModalOpen}
                onClose={() => setIsCouponModalOpen(false)}
                storeId={storeInfo?.id || ''}
                initialFilter={couponFilter}
                onRefreshStats={fetchDashboardData}
            />

            {/* 적립/취소 상세 영수증 보기 모달 */}
            <HostTransactionDetailModal
                isOpen={isTxnDetailModalOpen}
                onClose={() => setIsTxnDetailModalOpen(false)}
                transaction={selectedTxn}
            />

            {/* 스탬프 적립/취소 거래 상세 이력 스튜디오 모달 */}
            <HostTransactionListModal
                isOpen={isTxnListModalOpen}
                onClose={() => setIsTxnListModalOpen(false)}
                storeId={storeInfo?.id || ''}
                onRefreshStats={fetchDashboardData}
            />
        </div>
    );
}
