import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
    Store, Settings, BarChart3, Clock, UserCheck, 
    Plus, Minus, Coffee, LogOut, Sparkles, RefreshCw, Undo, ScanLine, Globe, Search
} from 'lucide-react';
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
    const [storeName, setStoreName] = useState('');
    const [storeAddress, setStoreAddress] = useState('');
    const [storePhone, setStorePhone] = useState('');
    const [storeDescription, setStoreDescription] = useState('');

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
                    setStoreName(myStore.name || '');
                    setStoreAddress(myStore.address || '');
                    setStorePhone(myStore.phone || '');
                    setStoreDescription(myStore.description || '');

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

        if (isPromotion) {
            finalItems = earnItems;
            finalAmount = Object.values(earnItems).reduce((sum, val) => sum + val, 0);
            if (finalAmount <= 0) {
                setErrorMessage(t('host_dashboard.err_min_item_qty', '최소 1개 이상의 품목 수량을 선택하여 적립을 진행해 주세요.'));
                return;
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
        if (!cardTitle || !rewardDesc) {
            setErrorMessage(t('host_dashboard.err_empty_fields', '정책명과 리워드 보상 설명은 필수입니다.'));
            return;
        }
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
                    storeId: storeInfo?.id,
                    cardType,
                    cardTitle,
                    maxStamps,
                    targetMenu: targetMenu || null,
                    rewardDesc,
                    validDays
                })
            });

            if (res.ok) {
                setSuccessMessage(t('host_dashboard.success_config_create', '새로운 스탬프 정책이 생성되어 활성화되었습니다! ✨'));
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

    // 5. 매장 프로필 저장
    const handleUpdateStore = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMessage('');
        setSuccessMessage('');
        try {
            const res = await fetch('/api/stamps/owner/store-profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    storeId: storeInfo?.id,
                    name: storeName,
                    address: storeAddress,
                    phone: storePhone,
                    description: storeDescription
                })
            });

            if (res.ok) {
                setSuccessMessage(t('host_dashboard.success_store_update', '매장 프로필 정보가 안전하게 업데이트되었습니다! 💾'));
                fetchDashboardData();
            } else {
                const err = await res.json();
                setErrorMessage(err.message || t('host_dashboard.err_store_update_fail', '프로필 변경 실패'));
            }
        } catch (err) {
            setErrorMessage(t('host_dashboard.err_network_store', '통신 에러가 발생했습니다.'));
        } finally {
            setIsLoading(false);
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
        <div className="min-h-screen bg-espresso-950 text-espresso-50 flex flex-col font-sans select-none antialiased relative overflow-hidden">
            {/* 백그라운드 프리미엄 골드/브라운 그라데이션 광원 */}
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#D4AF37]/3 rounded-full filter blur-[150px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#8c8c73]/3 rounded-full filter blur-[150px] pointer-events-none" />

            {/* 상단 네비게이션 헤더 */}
            <header className="bg-espresso-900/60 backdrop-blur-md border-b border-espresso-800/80 px-8 py-4 flex items-center justify-between shadow-lg relative z-20 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#D4AF37]/20 to-amber-500/10 border border-[#D4AF37]/30 flex items-center justify-center text-amber-500">
                        <Store size={20} />
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
                                        <p className="text-[10px] text-espresso-350">{t(txn.cardTitle, txn.cardTitle) as string}</p>
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

                    <div className="flex-1 overflow-y-auto pr-1 hide-scrollbar">
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
                            /* 매장 프로필 수정 스페이스 */
                            <form onSubmit={handleUpdateStore} className="space-y-4 text-xs">
                                <div className="pb-2 border-b border-espresso-850">
                                    <h4 className="font-serif font-black text-sm text-espresso-100">
                                        {t('host_dashboard.store_form_title', '매장 정보 오피스 빌더')}
                                    </h4>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-espresso-350 font-bold block">{t('host_dashboard.lbl_store_name', '가맹점 매장명')}</label>
                                    <input 
                                        type="text" 
                                        value={storeName}
                                        onChange={e => setStoreName(e.target.value)}
                                        className="w-full bg-espresso-950 border border-espresso-800 rounded-xl px-3 py-2 text-espresso-100 outline-none focus:border-[#D4AF37]/50"
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-espresso-350 font-bold block">{t('host_dashboard.lbl_store_address', '매장 도로명 주소')}</label>
                                    <input 
                                        type="text" 
                                        value={storeAddress}
                                        onChange={e => setStoreAddress(e.target.value)}
                                        className="w-full bg-espresso-950 border border-espresso-800 rounded-xl px-3 py-2 text-espresso-100 outline-none focus:border-[#D4AF37]/50"
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-espresso-350 font-bold block">{t('host_dashboard.lbl_store_phone', '매장 대표 전화번호')}</label>
                                    <input 
                                        type="text" 
                                        value={storePhone}
                                        onChange={e => setStorePhone(e.target.value)}
                                        className="w-full bg-espresso-950 border border-espresso-800 rounded-xl px-3 py-2 text-espresso-100 outline-none focus:border-[#D4AF37]/50 font-mono"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-espresso-350 font-bold block">{t('host_dashboard.lbl_store_desc', '매장 브랜드 감성 상세 소개')}</label>
                                    <textarea 
                                        value={storeDescription}
                                        onChange={e => setStoreDescription(e.target.value)}
                                        rows={4}
                                        className="w-full bg-espresso-950 border border-espresso-800 rounded-xl px-3 py-2 text-espresso-100 outline-none focus:border-[#D4AF37]/50 resize-none leading-relaxed"
                                    />
                                </div>

                                <button 
                                    type="submit" 
                                    className="w-full py-3 bg-espresso-850 hover:bg-espresso-800 border border-espresso-750 text-[#D4AF37] font-black rounded-xl transition-all shadow active:scale-98 cursor-pointer mt-2"
                                >
                                    {t('host_dashboard.btn_save_store', '매장 감성 정보 안전하게 업데이트')}
                                </button>
                            </form>
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
