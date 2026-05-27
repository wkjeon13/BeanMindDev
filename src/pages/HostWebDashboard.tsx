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
                    amount: earnAmount
                })
            });

            if (res.ok) {
                setSuccessMessage("스탬프 적립이 완벽하게 완료되었습니다! 🎉");
                setTargetUserId('');
                setEarnAmount(1);
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

    // 4. 새로운 스탬프/프로모션 정책 등록
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
            const res = await fetch(`${API_BASE}/api/stamps/configs`, {
                method: 'POST',
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
                    validDays
                })
            });

            if (res.ok) {
                setSuccessMessage("새로운 스탬프 정책이 생성되어 활성화되었습니다! ✨");
                // 폼 초기화
                setCardTitle('');
                setTargetMenu('');
                setRewardDesc('');
                fetchDashboardData();
            } else {
                const err = await res.json();
                setErrorMessage(err.message || "정책 생성 실패");
            }
        } catch (err) {
            setErrorMessage("네트워크 전송 오류가 발생했습니다.");
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

                                    {/* 스탬프 개수 가감제어 */}
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

                                    <button 
                                        onClick={handlePosEarn}
                                        disabled={isLoading}
                                        className="w-full py-4 bg-amber-600 hover:bg-amber-700 text-espresso-950 font-black text-sm rounded-xl transition-all shadow-md active:scale-98 cursor-pointer flex justify-center items-center gap-1.5"
                                    >
                                        <Coffee size={16} /> {isLoading ? "적립 처리 중..." : "스탬프 적립 전송 및 완료"}
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
                                    <h3 className="font-serif font-black text-lg text-amber-500">스탬프 & 시즌 프로모션 정책 빌더</h3>
                                    <p className="text-xs text-espresso-300 mt-1">매장의 리워드 정책 및 프로모션 이벤트를 자유롭게 분기하고 설정합니다.</p>
                                </div>
                                <span className="bg-[#D4AF37] text-espresso-950 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1.5">
                                    <Sparkles size={12} /> MULTI-CONFIG ACTIVE
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
                                        placeholder="예: [아메리카노 10잔 적립판] 또는 [여름 시즌 신메뉴 & 디저트 도장판]"
                                        className="w-full bg-espresso-900 border border-espresso-750 rounded-xl px-4 py-3 text-xs text-espresso-100 outline-none focus:border-amber-500/50"
                                    />
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

                                <button 
                                    type="submit" 
                                    disabled={isLoading}
                                    className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-espresso-950 font-black text-xs rounded-xl active:scale-95 transition-all shadow-md cursor-pointer flex justify-center items-center gap-1.5 mt-2"
                                >
                                    <Save size={14} /> {isLoading ? "정책 저장 중..." : "새로운 정책 활성화 및 적용"}
                                </button>
                            </form>
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
