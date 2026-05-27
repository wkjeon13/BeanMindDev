import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
    Store, Database, Settings, BarChart3, Clock, UserCheck, 
    Plus, Minus, Coffee, ChevronLeft, Save, Sparkles, RefreshCw, Undo, Trash2 
} from 'lucide-react';
import { API_BASE } from '../utils/apiConfig';

export default function HostWebDashboard() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'POS' | 'CONFIG' | 'STORE' | 'ANALYTICS'>('POS');
    const [storeId, setStoreId] = useState('');
    const [storeInfo, setStoreInfo] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
    
    // POS Earning States
    const [targetUserId, setTargetUserId] = useState('');
    const [selectedConfigId, setSelectedConfigId] = useState('');
    const [earnAmount, setEarnAmount] = useState(1);
    const [storeConfigs, setStoreConfigs] = useState<any[]>([]);
    const [earnItems, setEarnItems] = useState<Record<string, number>>({});

    // 💡 지능형 정책 명칭 파서: PROMOTION인데 itemsConfig가 DB 상에 비어있는(NULL) 상태여도,
    // 정책 명칭(아메리카노10+시즌음료5+페어링케익2 등)을 지능적으로 분해/파싱하여 복합 카운터를 동적 생성하는 파서
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
        
        // itemsConfig가 정상 배열 형태이면 그대로 반환
        if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
        }
        
        // 만약 cardType이 PROMOTION이고 itemsConfig가 비어있다면 정책 명칭에서 파싱을 시도
        if (cfg.cardType === 'PROMOTION' && cfg.cardTitle) {
            const tokens = cfg.cardTitle.split(/[+,]/);
            const items: { key: string; label: string; target: number }[] = [];
            let index = 0;
            for (const token of tokens) {
                const trimmed = token.trim();
                if (!trimmed) continue;
                
                // 한글/영문/숫자 혼합에서 텍스트 부분과 숫자 부분을 추출
                // 예: "아메리카노10" -> label: "아메리카노", target: 10
                // 예: "시즌음료 5잔" -> label: "시즌음료", target: 5
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
    
    // Config Builder States
    const [cardType, setCardType] = useState('REGULAR');
    const [cardTitle, setCardTitle] = useState('');
    const [maxStamps, setMaxStamps] = useState(10);
    const [targetMenu, setTargetMenu] = useState('');
    const [rewardDesc, setRewardDesc] = useState('');
    const [validDays, setValidDays] = useState(90);
    const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
    
    // Store Info States
    const [storeName, setStoreName] = useState('');
    const [storeAddress, setStoreAddress] = useState('');
    const [storePhone, setStorePhone] = useState('');
    const [storeDescription, setStoreDescription] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const token = localStorage.getItem('token');

    // 1. 초기 점주 매장 정보 & 설정 로드
    const fetchDashboardData = async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            // 내 매장 정보 찾기
            const shopsRes = await fetch(`${API_BASE}/api/shops/my`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (shopsRes.ok) {
                const stores = await shopsRes.json();
                if (stores && stores.length > 0) {
                    const myStore = stores[0];
                    setStoreId(myStore.id);
                    setStoreInfo(myStore);
                    
                    // 점점 폼 바인딩
                    setStoreName(myStore.name || '');
                    setStoreAddress(myStore.address || '');
                    setStorePhone(myStore.phone || '');
                    setStoreDescription(myStore.description || '');

                    // 스탬프 configs 및 통계 가져오기
                    const statsRes = await fetch(`${API_BASE}/api/stamps/owner/stats/${myStore.id}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (statsRes.ok) {
                        const data = await statsRes.json();
                        setStats(data.stats);
                        setRecentTransactions(data.recentTransactions);
                    }

                    const configRes = await fetch(`${API_BASE}/api/stamps/configs/${myStore.id}`);
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
                    setErrorMessage("등록된 내 매장을 찾을 수 없습니다. 마이페이지에서 매장 추가를 먼저 진행해주세요.");
                }
            }
        } catch (err) {
            console.error("Dashboard error:", err);
            setErrorMessage("데이터를 불러오는 중 오류가 발생했습니다.");
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
            setErrorMessage("고객 식별코드와 스탬프 종류를 선택해 주세요.");
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
                setErrorMessage("최소 1개 이상의 품목 수량을 선택하여 적립을 진행해 주세요.");
                return;
            }
        }

        setIsLoading(true);
        setErrorMessage('');
        setSuccessMessage('');
        try {
            const res = await fetch(`${API_BASE}/api/stamps/earn`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: targetUserId,
                    storeId,
                    configId: selectedConfigId,
                    amount: finalAmount,
                    items: finalItems
                })
            });

            if (res.ok) {
                setSuccessMessage("스탬프 적립이 완벽하게 완료되었습니다! 🎉");
                setTargetUserId('');
                setEarnAmount(1);
                if (isPromotion) {
                    const resetItems: Record<string, number> = {};
                    parsedItemsConfig.forEach((item: any) => {
                        resetItems[item.key] = 0;
                    });
                    setEarnItems(resetItems);
                }
                fetchDashboardData(); // 데이터 리프레시
            } else {
                const err = await res.json();
                setErrorMessage(err.message || "적립 처리에 실패했습니다.");
            }
        } catch (err) {
            setErrorMessage("네트워크 연결에 문제가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    // 3. 최근 트랜잭션 롤백
    const handleRollback = async (txn: any) => {
        if (!window.confirm(`[${txn.userNickname}] 고객님의 최근 적립(${txn.amount}개)을 취소하고 롤백하시겠습니까?`)) return;
        setIsLoading(true);
        setErrorMessage('');
        setSuccessMessage('');
        try {
            const res = await fetch(`${API_BASE}/api/stamps/rollback`, {
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
                setSuccessMessage("스탬프 적립이 정상적으로 취소(롤백)되었습니다. ↩");
                fetchDashboardData();
            } else {
                const err = await res.json();
                setErrorMessage(err.message || "롤백 취소에 실패했습니다.");
            }
        } catch (err) {
            setErrorMessage("네트워크 에러가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    // 4. 스탬프/프로모션 정책 등록 및 수정
    const handleCreateConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cardTitle || !rewardDesc) {
            setErrorMessage("정책명과 리워드 보상 설명은 필수입니다.");
            return;
        }
        setIsLoading(true);
        setErrorMessage('');
        setSuccessMessage('');
        try {
            const isEditing = !!editingConfigId;
            const url = isEditing 
                ? `${API_BASE}/api/stamps/configs/${editingConfigId}` 
                : `${API_BASE}/api/stamps/configs`;
            const method = isEditing ? 'PUT' : 'POST';

            // 복합 프로모션 도장판 구성 분석
            let finalItemsConfig = null;
            if (cardType === 'PROMOTION') {
                // 지능형 파서 헬퍼를 빌려서 임시 빌드
                const tempConfig = { cardType: 'PROMOTION', cardTitle };
                finalItemsConfig = getItemsConfig(tempConfig);
            }

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    storeId,
                    cardType,
                    cardTitle,
                    maxStamps,
                    targetMenu: targetMenu || null,
                    rewardDesc,
                    validDays,
                    itemsConfig: finalItemsConfig
                })
            });

            if (res.ok) {
                setSuccessMessage(isEditing 
                    ? "스탬프 정책이 성공적으로 수정 업데이트되었습니다! ✨"
                    : "새로운 스탬프 정책이 생성되어 활성화되었습니다! ✨"
                );
                // 폼 초기화
                setCardTitle('');
                setTargetMenu('');
                setRewardDesc('');
                setEditingConfigId(null);
                setCardType('REGULAR');
                setMaxStamps(10);
                setValidDays(90);
                fetchDashboardData();
            } else {
                const err = await res.json();
                setErrorMessage(err.message || "정책 저장 실패");
            }
        } catch (err) {
            setErrorMessage("네트워크 전송 오류가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    // 4-2. 정책 삭제 (소프트 딜리트)
    const handleDeleteConfig = async (id: string, title: string) => {
        if (!window.confirm(`[${title}] 스탬프 정책을 정말 삭제하시겠습니까? (이전 적립 고객 카드는 안전하게 보존되며 신규 적립/노출에서 제외됩니다.)`)) return;
        setIsLoading(true);
        setErrorMessage('');
        setSuccessMessage('');
        try {
            const res = await fetch(`${API_BASE}/api/stamps/configs/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                setSuccessMessage("스탬프 정책이 성공적으로 삭제(비활성화)되었습니다. 🗑️");
                if (editingConfigId === id) {
                    setEditingConfigId(null);
                    setCardTitle('');
                    setTargetMenu('');
                    setRewardDesc('');
                    setCardType('REGULAR');
                    setMaxStamps(10);
                    setValidDays(90);
                }
                fetchDashboardData();
            } else {
                const err = await res.json();
                setErrorMessage(err.message || "정책 삭제에 실패했습니다.");
            }
        } catch (err) {
            setErrorMessage("네트워크 통신 에러가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    // 4-3. 정책 수정 모드 바인딩 시작
    const startEditConfig = (cfg: any) => {
        setEditingConfigId(cfg.id);
        setCardType(cfg.cardType || 'REGULAR');
        setCardTitle(cfg.cardTitle || '');
        setMaxStamps(cfg.maxStamps || 10);
        setTargetMenu(cfg.targetMenu || '');
        setRewardDesc(cfg.rewardDesc || '');
        setValidDays(cfg.validDays || 90);
        
        // 상단으로 부드러운 스크롤 이동
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // 4-4. 정책 수정 모드 취소
    const cancelEditConfig = () => {
        setEditingConfigId(null);
        setCardType('REGULAR');
        setCardTitle('');
        setMaxStamps(10);
        setTargetMenu('');
        setRewardDesc('');
        setValidDays(90);
    };

    // 5. 매장 프로필 저장
    const handleUpdateStore = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMessage('');
        setSuccessMessage('');
        try {
            const res = await fetch(`${API_BASE}/api/stamps/owner/store-profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    storeId,
                    name: storeName,
                    address: storeAddress,
                    phone: storePhone,
                    description: storeDescription
                })
            });

            if (res.ok) {
                setSuccessMessage("매장 프로필 정보가 안전하게 업데이트되었습니다! 💾");
                fetchDashboardData();
            } else {
                const err = await res.json();
                setErrorMessage(err.message || "프로필 변경 실패");
            }
        } catch (err) {
            setErrorMessage("통신 에러가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-espresso-950 text-espresso-50 flex flex-col font-sans select-none antialiased">
            {/* 상단 네비게이션 헤더 */}
            <header 
                className="bg-espresso-900 border-b border-espresso-800/80 px-6 pb-4 flex items-center justify-between shadow-md shrink-0"
                style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
            >
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate('/profile')}
                        className="p-2 hover:bg-espresso-800 rounded-xl transition-colors active:scale-95 text-espresso-300 hover:text-espresso-50 cursor-pointer"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <h1 className="font-serif font-black text-lg text-amber-500">
                                {storeInfo?.name || "BeanMind Store POS"}
                            </h1>
                            <span className="bg-amber-600/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded">B2B</span>
                        </div>
                        <p className="text-[11px] text-espresso-300 mt-0.5">매장 전용 디지털 스탬프 관리 파트너 대시보드</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button 
                        onClick={fetchDashboardData}
                        className="p-2 bg-espresso-850 hover:bg-espresso-800 border border-espresso-750 text-espresso-300 rounded-xl transition-all cursor-pointer active:rotate-180 duration-500"
                    >
                        <RefreshCw size={16} />
                    </button>
                    <span className="text-xs text-espresso-300 hidden md:block">로그인 세션: <span className="font-bold text-amber-400">점주</span></span>
                </div>
            </header>

            {/* 메인 통계 그리드 */}
            {stats && (
                <section className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-4 bg-espresso-900/30 border-b border-espresso-850">
                    <div className="bg-espresso-900/50 p-4 rounded-2xl border border-espresso-800/60 shadow-sm flex flex-col justify-between">
                        <span className="text-[11px] text-espresso-300 font-bold uppercase tracking-wider">누적 적립 건수</span>
                        <div className="flex items-baseline gap-1 mt-2">
                            <span className="font-mono text-2xl font-black text-espresso-50">{stats.totalEarnCount}</span>
                            <span className="text-xs text-espresso-300">건</span>
                        </div>
                    </div>
                    <div className="bg-espresso-900/50 p-4 rounded-2xl border border-espresso-800/60 shadow-sm flex flex-col justify-between">
                        <span className="text-[11px] text-amber-500 font-bold uppercase tracking-wider">오늘 신규 적립</span>
                        <div className="flex items-baseline gap-1 mt-2">
                            <span className="font-mono text-2xl font-black text-amber-400">{stats.todayEarnCount}</span>
                            <span className="text-xs text-amber-500/80">건</span>
                        </div>
                    </div>
                    <div className="bg-espresso-900/50 p-4 rounded-2xl border border-espresso-800/60 shadow-sm flex flex-col justify-between">
                        <span className="text-[11px] text-espresso-300 font-bold uppercase tracking-wider">발행된 무료 쿠폰</span>
                        <div className="flex items-baseline gap-1 mt-2">
                            <span className="font-mono text-2xl font-black text-espresso-50">{stats.totalIssuedCoupons}</span>
                            <span className="text-xs text-espresso-300">장</span>
                        </div>
                    </div>
                    <div className="bg-espresso-900/50 p-4 rounded-2xl border border-espresso-800/60 shadow-sm flex flex-col justify-between">
                        <span className="text-[11px] text-green-400 font-bold uppercase tracking-wider">사용된 무료 쿠폰</span>
                        <div className="flex items-baseline gap-1 mt-2">
                            <span className="font-mono text-2xl font-black text-green-400">{stats.totalUsedCoupons}</span>
                            <span className="text-xs text-green-400/80">장</span>
                        </div>
                    </div>
                </section>
            )}

            {/* 레이아웃 바디 */}
            <div className="flex-1 flex flex-col lg:flex-row min-h-0">
                {/* 사이드바 메뉴 탭 */}
                <aside className="w-full lg:w-60 bg-espresso-900/50 border-r border-espresso-800/60 p-4 space-y-2 shrink-0 flex lg:flex-col flex-row gap-2 lg:gap-0 lg:space-x-0 overflow-x-auto lg:overflow-x-visible">
                    <button 
                        onClick={() => setActiveTab('POS')}
                        className={`flex-1 lg:flex-none flex items-center justify-center lg:justify-start gap-2.5 px-4 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap cursor-pointer ${activeTab === 'POS' ? 'bg-amber-600 text-espresso-950 shadow-md' : 'text-espresso-200 hover:bg-espresso-800/40'}`}
                    >
                        <Coffee size={18} /> POS 실시간 적립
                    </button>
                    <button 
                        onClick={() => setActiveTab('CONFIG')}
                        className={`flex-1 lg:flex-none flex items-center justify-center lg:justify-start gap-2.5 px-4 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap cursor-pointer ${activeTab === 'CONFIG' ? 'bg-amber-600 text-espresso-950 shadow-md' : 'text-espresso-200 hover:bg-espresso-800/40'}`}
                    >
                        <Settings size={18} /> 스탬프/시즌 정책 빌더
                    </button>
                    <button 
                        onClick={() => setActiveTab('STORE')}
                        className={`flex-1 lg:flex-none flex items-center justify-center lg:justify-start gap-2.5 px-4 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap cursor-pointer ${activeTab === 'STORE' ? 'bg-amber-600 text-espresso-950 shadow-md' : 'text-espresso-200 hover:bg-espresso-800/40'}`}
                    >
                        <Store size={18} /> 매장 정보 수정
                    </button>
                </aside>

                {/* 콘텐츠 영역 */}
                <main className="flex-1 p-6 overflow-y-auto max-h-[calc(100vh-180px)] space-y-6">
                    {errorMessage && (
                        <div className="bg-red-950/40 border border-red-500/30 text-red-400 p-4 rounded-2xl text-xs">
                            {errorMessage}
                        </div>
                    )}
                    {successMessage && (
                        <div className="bg-green-950/40 border border-green-500/30 text-green-400 p-4 rounded-2xl text-xs">
                            {successMessage}
                        </div>
                    )}

                    {/* 탭 1: POS 실시간 적립 화면 */}
                    {activeTab === 'POS' && (
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            {/* 적립 폼 */}
                            <div className="xl:col-span-2 bg-[#17171c] p-6 rounded-3xl border border-espresso-850 space-y-5">
                                <h3 className="font-serif font-black text-lg text-amber-500">원터치 수동 적립 패널 (POS 대응)</h3>
                                
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs text-espresso-200 font-bold block">고객 고유식별 QR코드 문자열 (또는 ID)</label>
                                        <input 
                                            type="text" 
                                            value={targetUserId}
                                            onChange={e => setTargetUserId(e.target.value)}
                                            placeholder="예: d7e6b0a1-c9f2-45e0-..."
                                            className="w-full bg-espresso-900 border border-espresso-700 rounded-xl px-4 py-3 font-mono text-sm text-espresso-50 outline-none focus:border-amber-500/50"
                                        />
                                    </div>

                                    {/* 스탬프 종류 */}
                                    <div className="space-y-2">
                                        <label className="text-xs text-espresso-200 font-bold block">적립 대상 도장판 설정</label>
                                        <select 
                                            value={selectedConfigId}
                                            onChange={e => setSelectedConfigId(e.target.value)}
                                            className="w-full bg-espresso-900 border border-espresso-700 rounded-xl px-4 py-3 text-xs text-espresso-100 outline-none focus:border-amber-500/50 cursor-pointer"
                                        >
                                            <option value="">적립 판을 선택하세요.</option>
                                            {storeConfigs.map(cfg => (
                                                <option key={cfg.id} value={cfg.id}>
                                                    {cfg.cardTitle} ({cfg.cardType === 'REGULAR' ? '일반 스탬프' : '시즌 프로모션'})
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
                                                <div className="bg-espresso-950 p-4 rounded-2xl border border-espresso-800 space-y-4">
                                                    <span className="text-xs text-espresso-200 block text-center font-bold">품목별 적립 수량 조절</span>
                                                    <div className="space-y-2">
                                                        {parsedItemsConfig.map((item: any) => {
                                                            const currentQty = earnItems[item.key] || 0;
                                                            return (
                                                                <div key={item.key} className="flex justify-between items-center bg-espresso-900/40 p-3 rounded-xl border border-espresso-800/60">
                                                                    <div className="text-left">
                                                                        <span className="font-bold text-xs text-espresso-50">{item.label}</span>
                                                                        <p className="text-[9px] text-espresso-300">목표 수량: {item.target}개</p>
                                                                    </div>
                                                                    <div className="flex items-center gap-3">
                                                                        <button 
                                                                            onClick={() => setEarnItems(prev => ({ ...prev, [item.key]: Math.max(0, currentQty - 1) }))}
                                                                            className="w-8 h-8 rounded-lg bg-espresso-900 border border-espresso-750 text-espresso-200 flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                                                                        >
                                                                            <Minus size={12} />
                                                                        </button>
                                                                        <span className="font-mono text-sm font-black text-amber-500 w-6 text-center">{currentQty}</span>
                                                                        <button 
                                                                            onClick={() => setEarnItems(prev => ({ ...prev, [item.key]: Math.min(10, currentQty + 1) }))}
                                                                            className="w-8 h-8 rounded-lg bg-[#D4AF37] text-espresso-950 flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                                                                        >
                                                                            <Plus size={12} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    <div className="text-right text-[10px] text-espresso-300">
                                                        총 적립 예정: <span className="text-amber-500 font-bold">{Object.values(earnItems).reduce((a, b) => a + b, 0)}개</span> 스탬프
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // 기존 단일 카운터
                                        return (
                                            <div className="bg-espresso-950 p-4 rounded-2xl border border-espresso-800 text-center space-y-3">
                                                <span className="text-xs text-espresso-200 block">스탬프 적립 수량 조절</span>
                                                <div className="flex justify-center items-center gap-6">
                                                    <button 
                                                        onClick={() => setEarnAmount(prev => Math.max(1, prev - 1))}
                                                        className="w-10 h-10 rounded-xl bg-espresso-900 hover:bg-espresso-800 border border-espresso-700 text-espresso-50 flex items-center justify-center cursor-pointer"
                                                    >
                                                        <Minus size={16} />
                                                    </button>
                                                    <span className="font-mono text-2xl font-black text-amber-500 w-12">{earnAmount}</span>
                                                    <button 
                                                        onClick={() => setEarnAmount(prev => Math.min(10, prev + 1))}
                                                        className="w-10 h-10 rounded-xl bg-amber-600 hover:bg-amber-700 text-espresso-950 flex items-center justify-center cursor-pointer"
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    <button 
                                        onClick={handlePosEarn}
                                        disabled={isLoading}
                                        className="w-full py-4 bg-amber-600 hover:bg-amber-700 text-espresso-950 font-black text-sm rounded-xl transition-all shadow-md active:scale-98 cursor-pointer flex justify-center items-center gap-1.5"
                                    >
                                        <Coffee size={16} /> {(() => {
                                            if (isLoading) return "적립 처리 중...";
                                            const cfg = storeConfigs.find(c => c.id === selectedConfigId);
                                            const parsedItemsConfig = getItemsConfig(cfg);
                                            const isPromotion = cfg && parsedItemsConfig && Array.isArray(parsedItemsConfig);
                                            if (isPromotion) {
                                                const totalQty = Object.values(earnItems).reduce((sum, val) => sum + val, 0);
                                                return `${totalQty}개 스탬프 적립 전송 및 완료`;
                                            }
                                            return `${earnAmount}개 스탬프 적립 전송 및 완료`;
                                        })()}
                                    </button>
                                </div>
                            </div>

                            {/* 실시간 적립/취소 타임라인 */}
                            <div className="bg-[#17171c] p-6 rounded-3xl border border-espresso-850 space-y-4 max-h-[500px] overflow-y-auto hide-scrollbar">
                                <h3 className="font-serif font-black text-lg text-espresso-100">최근 적립 타임라인</h3>
                                <div className="space-y-3">
                                    {recentTransactions.length > 0 ? (
                                        recentTransactions.map((txn) => (
                                            <div key={txn.id} className="bg-espresso-950/50 p-3.5 rounded-xl border border-espresso-800 flex justify-between items-center text-xs">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-bold text-espresso-50">{txn.userNickname}</span>
                                                        <span className={`text-[8px] font-bold px-1.5 py-0.25 rounded ${txn.amount > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
                                                            {txn.txnType}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-espresso-300">{txn.cardTitle}</p>
                                                    <span className="text-[9px] text-espresso-400 block font-mono">{new Date(txn.createdAt).toLocaleString()}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-mono font-black text-sm ${txn.amount > 0 ? 'text-amber-500' : 'text-red-500'}`}>
                                                        {txn.amount > 0 ? `+${txn.amount}` : txn.amount}
                                                    </span>
                                                    {txn.txnType === 'EARN' && (
                                                        <button 
                                                            onClick={() => handleRollback(txn)}
                                                            className="p-1.5 bg-espresso-900 border border-espresso-750 text-espresso-300 hover:text-red-400 rounded-lg active:scale-95 transition-all cursor-pointer"
                                                            title="적립 취소(롤백)"
                                                        >
                                                            <Undo size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-12 text-espresso-400 opacity-60 text-xs">
                                            최근 적립 이력이 없습니다.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 탭 2: 스탬프 및 프로모션 정책 빌더 */}
                    {activeTab === 'CONFIG' && (
                        <div className="bg-[#17171c] p-6 rounded-3xl border border-espresso-850 space-y-6">
                            <div className="flex justify-between items-center pb-4 border-b border-espresso-850">
                                <div>
                                    <h3 className="font-serif font-black text-lg text-amber-500">
                                        {editingConfigId ? "📝 스탬프 정책 수정하기" : "스탬프 & 시즌 정책 빌더"}
                                    </h3>
                                    <p className="text-xs text-espresso-300 mt-1">
                                        {editingConfigId 
                                            ? "선택한 도장판 정책 정보를 안전하게 편집하여 저장합니다." 
                                            : "매장의 리워드 정책 및 프로모션 이벤트를 자유롭게 분기하고 설정합니다."
                                        }
                                    </p>
                                </div>
                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-all ${editingConfigId ? 'bg-amber-600 text-espresso-950 animate-pulse' : 'bg-[#D4AF37] text-espresso-950'}`}>
                                    <Sparkles size={12} /> {editingConfigId ? "EDITING MODE ACTIVE" : "MULTI-CONFIG ACTIVE"}
                                </span>
                            </div>

                            <form onSubmit={handleCreateConfig} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* 카드 종류 */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs text-espresso-200 font-bold block">정책 종류</label>
                                        <select 
                                            value={cardType}
                                            onChange={e => setCardType(e.target.value)}
                                            className="w-full bg-espresso-900 border border-espresso-750 rounded-xl px-4 py-3 text-xs text-espresso-100 cursor-pointer"
                                        >
                                            <option value="REGULAR">일반 스탬프 (기본 아메리카노 등)</option>
                                            <option value="PROMOTION">시즌 프로모션 (기획/페어링 세트 등)</option>
                                        </select>
                                    </div>

                                    {/* 완성 목표 도장수 */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs text-espresso-200 font-bold block">완성 목표 도장수 (기본 10개)</label>
                                        <input 
                                            type="number" 
                                            min="5" 
                                            max="20"
                                            value={maxStamps}
                                            onChange={e => setMaxStamps(parseInt(e.target.value, 10))}
                                            className="w-full bg-espresso-900 border border-espresso-750 rounded-xl px-4 py-3 text-xs text-espresso-100 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs text-espresso-200 font-bold block">도장판 정책 명칭</label>
                                    <input 
                                        type="text" 
                                        value={cardTitle}
                                        onChange={e => setCardTitle(e.target.value)}
                                        placeholder="예: 아메리카노10+시즌음료5+페어링케익2 또는 [아메리카노 10잔 적립판]"
                                        className="w-full bg-espresso-900 border border-espresso-750 rounded-xl px-4 py-3 text-xs text-espresso-100 outline-none focus:border-amber-500/50"
                                    />
                                    {cardType === 'PROMOTION' && (
                                        <p className="text-[10px] text-amber-400 leading-relaxed mt-1 bg-amber-950/20 border border-amber-900/30 p-2.5 rounded-lg flex items-start gap-1">
                                            <span>💡</span>
                                            <span>
                                                <strong>복합 프로모션 구성 가이드</strong>: 명칭을 <strong>`[메뉴명][목표숫자]`</strong> 형태로 기재하고 <strong>`+`</strong> 기호로 연결해 주시면(예: <code className="bg-espresso-950 px-1 py-0.5 rounded font-mono text-[9px] text-[#D4AF37]">아메리카노10+시즌음료5+페어링케익2</code>), POS 수동 적립 화면에서 메뉴별 <strong>개별 수량 카운터가 자동으로 완벽하게 구성</strong>됩니다!
                                            </span>
                                        </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* 보상 설명 */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs text-espresso-200 font-bold block">도장판 완성 시 무료 리워드</label>
                                        <input 
                                            type="text" 
                                            value={rewardDesc}
                                            onChange={e => setRewardDesc(e.target.value)}
                                            placeholder="예: 무료 아메리카노 1잔 무료 교환 쿠폰"
                                            className="w-full bg-espresso-900 border border-espresso-750 rounded-xl px-4 py-3 text-xs text-espresso-100 outline-none focus:border-amber-500/50"
                                        />
                                    </div>

                                    {/* 유효 기간 */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs text-espresso-200 font-bold block">쿠폰 유효 기간 (기본 90일)</label>
                                        <input 
                                            type="number" 
                                            min="30" 
                                            max="365"
                                            value={validDays}
                                            onChange={e => setValidDays(parseInt(e.target.value, 10))}
                                            className="w-full bg-espresso-900 border border-espresso-750 rounded-xl px-4 py-3 text-xs text-espresso-100 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs text-espresso-200 font-bold block">적립 제외/특정 타겟 메뉴 범위 (선택사항)</label>
                                    <input 
                                        type="text" 
                                        value={targetMenu}
                                        onChange={e => setTargetMenu(e.target.value)}
                                        placeholder="예: 특정 시그니처 멜론 소다, 초코 딸기 크레이프 페어링 세트 한정"
                                        className="w-full bg-espresso-900 border border-espresso-750 rounded-xl px-4 py-3 text-xs text-espresso-100 outline-none"
                                    />
                                </div>

                                <div className="flex gap-3 mt-3">
                                    {editingConfigId && (
                                        <button 
                                            type="button"
                                            onClick={cancelEditConfig}
                                            className="flex-1 py-3.5 bg-espresso-900 border border-espresso-750 text-espresso-100 font-bold text-xs rounded-xl active:scale-95 transition-all cursor-pointer"
                                        >
                                            수정 취소
                                        </button>
                                    )}
                                    <button 
                                        type="submit" 
                                        disabled={isLoading}
                                        className="flex-[2] py-3.5 bg-amber-600 hover:bg-amber-700 text-espresso-950 font-black text-xs rounded-xl active:scale-95 transition-all shadow-md cursor-pointer flex justify-center items-center gap-1.5"
                                    >
                                        <Save size={14} /> 
                                        {isLoading 
                                            ? "정책 저장 중..." 
                                            : editingConfigId 
                                                ? "스탬프 정책 수정 완료 및 저장" 
                                                : "새로운 정책 활성화 및 적용"
                                        }
                                    </button>
                                </div>
                            </form>

                            {/* 💡 정책 리스팅 및 수정/삭제 제어반 */}
                            <div className="pt-6 border-t border-espresso-850 space-y-4">
                                <h4 className="font-serif font-black text-base text-espresso-100">현재 운영 중인 도장판 정책 목록</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {storeConfigs.length > 0 ? (
                                        storeConfigs.map(cfg => (
                                            <div key={cfg.id} className="bg-espresso-950/60 p-4 rounded-2xl border border-espresso-800 flex flex-col justify-between space-y-3.5">
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between items-start">
                                                        <span className="font-bold text-xs text-espresso-50 leading-snug">{cfg.cardTitle}</span>
                                                        <span className={`text-[8.5px] font-black px-2 py-0.5 rounded-full ${cfg.cardType === 'REGULAR' ? 'bg-amber-500/10 text-amber-400' : 'bg-[#D4AF37]/15 text-[#D4AF37]'}`}>
                                                            {cfg.cardType === 'REGULAR' ? '일반' : '시즌 프로모션'}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-espresso-300">🎁 보상 리워드: <span className="text-espresso-100 font-bold">{cfg.rewardDesc}</span></p>
                                                    <p className="text-[9.5px] text-espresso-400 font-mono">
                                                        목표 도장: {cfg.maxStamps}개 | 유효기간: {cfg.validDays}일
                                                        {cfg.targetMenu && ` | 타겟 메뉴: ${cfg.targetMenu}`}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2 border-t border-espresso-850/50 pt-3">
                                                    <button 
                                                        onClick={() => startEditConfig(cfg)}
                                                        className="flex-1 py-2 bg-espresso-900 border border-espresso-750 text-espresso-200 hover:text-amber-400 font-bold text-[10.5px] rounded-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1"
                                                    >
                                                        수정하기
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteConfig(cfg.id, cfg.cardTitle)}
                                                        className="flex-1 py-2 bg-red-950/15 border border-red-900/20 text-red-400 hover:bg-red-950/30 font-bold text-[10.5px] rounded-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1"
                                                    >
                                                        <Trash2 size={12} /> 삭제하기
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-span-full text-center py-12 text-espresso-400 opacity-60 text-xs">
                                            현재 활성화된 도장판 정책이 존재하지 않습니다.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 탭 3: 매장 프로필 관리 수정 */}
                    {activeTab === 'STORE' && (
                        <div className="bg-[#17171c] p-6 rounded-3xl border border-espresso-850 space-y-6">
                            <div>
                                <h3 className="font-serif font-black text-lg text-amber-500">매장 정보 및 프로필 관리</h3>
                                <p className="text-xs text-espresso-300 mt-1">고객들이 빈마인드 지도 상세에서 확인하는 매장의 프로필을 편집합니다.</p>
                            </div>

                            <form onSubmit={handleUpdateStore} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs text-espresso-200 font-bold block">매장명</label>
                                        <input 
                                            type="text" 
                                            value={storeName}
                                            onChange={e => setStoreName(e.target.value)}
                                            className="w-full bg-espresso-900 border border-espresso-750 rounded-xl px-4 py-3 text-xs text-espresso-100 outline-none focus:border-amber-500/50"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs text-espresso-200 font-bold block">전화번호</label>
                                        <input 
                                            type="text" 
                                            value={storePhone}
                                            onChange={e => setStorePhone(e.target.value)}
                                            className="w-full bg-espresso-900 border border-espresso-750 rounded-xl px-4 py-3 text-xs text-espresso-100 outline-none focus:border-amber-500/50"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs text-espresso-200 font-bold block">도로명 주소</label>
                                    <input 
                                        type="text" 
                                        value={storeAddress}
                                        onChange={e => setStoreAddress(e.target.value)}
                                        className="w-full bg-espresso-900 border border-espresso-750 rounded-xl px-4 py-3 text-xs text-espresso-100 outline-none focus:border-amber-500/50"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs text-espresso-200 font-bold block">매장 상세 설명</label>
                                    <textarea 
                                        rows={4}
                                        value={storeDescription}
                                        onChange={e => setStoreDescription(e.target.value)}
                                        className="w-full bg-espresso-900 border border-espresso-750 rounded-xl px-4 py-3 text-xs text-espresso-100 outline-none focus:border-amber-500/50 resize-none"
                                    />
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={isLoading}
                                    className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-espresso-950 font-black text-xs rounded-xl active:scale-95 transition-all shadow-md cursor-pointer flex justify-center items-center gap-1.5 mt-2"
                                >
                                    <Save size={14} /> {isLoading ? "프로필 수정 중..." : "매장 정보 업데이트 저장"}
                                </button>
                            </form>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
