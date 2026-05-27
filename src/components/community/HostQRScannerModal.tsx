import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Camera, Plus, Minus, CheckCircle, RotateCcw, AlertTriangle, UserCheck, Coffee } from 'lucide-react';
import { API_BASE } from '../../utils/apiConfig';

interface HostQRScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function HostQRScannerModal({ isOpen, onClose }: HostQRScannerModalProps) {
    const [scanStep, setScanStep] = useState<'SCANNING' | 'EARNING' | 'SUCCESS'>('SCANNING');
    const [scannedUserId, setScannedUserId] = useState('');
    const [scannedUser, setScannedUser] = useState<any>(null);
    const [storeId, setStoreId] = useState('');
    const [stampConfigs, setStampConfigs] = useState<any[]>([]);
    const [selectedConfigId, setSelectedConfigId] = useState('');
    const [earnAmount, setEarnAmount] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successData, setSuccessData] = useState<any>(null);

    // 1. 점주가 소유한 첫 번째 매장 ID를 임의로 pre-fetch
    useEffect(() => {
        const fetchStoreAndConfigs = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;
            try {
                // 내 매장 정보 가져오기
                const meRes = await fetch(`${API_BASE}/api/users/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (meRes.ok) {
                    const meData = await meRes.json();
                    
                    // 만약 점주 계정의 소유 store가 있다면, 해당 storeId 할당
                    // 데모용으로 매장 조회 혹은 생성 API 활용
                    // backend `/api/shops`에서 OWNER에 해당하는 store를 조회하거나 
                    // 로컬 스토리지 또는 DB의 첫 매장 ID를 활용
                    const storeRes = await fetch(`${API_BASE}/api/shops`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (storeRes.ok) {
                        const stores = await storeRes.json();
                        // 점주가 등록한 매장이 있으면 그 첫 번째 매장을 씁니다.
                        if (stores && stores.length > 0) {
                            const myStore = stores[0];
                            setStoreId(myStore.id);
                            
                            // 매장의 스탬프 설정 조회
                            const configRes = await fetch(`${API_BASE}/api/stamps/configs/${myStore.id}`);
                            if (configRes.ok) {
                                const configs = await configRes.json();
                                setStampConfigs(configs);
                                if (configs.length > 0) {
                                    setSelectedConfigId(configs[0].id);
                                }
                            }
                        } else {
                            // 등록된 매장이 없을 경우 임시 매장 ID 생성/바인딩
                            setStoreId("demo-store-1234");
                            setErrorMessage("등록된 매장이 없습니다. 웹 대시보드에서 매장을 먼저 등록해주세요.");
                        }
                    }
                }
            } catch (err) {
                console.error("Host setup failed:", err);
            }
        };
        fetchStoreAndConfigs();
    }, []);

    // 2. 가상의 QR 스캔 에뮬레이터 (성공 트리거)
    const handleSimulateScan = async (userIdToScan: string) => {
        if (!userIdToScan.trim()) {
            setErrorMessage("유저 ID를 입력해 주세요.");
            return;
        }
        setIsLoading(true);
        setErrorMessage('');
        try {
            const token = localStorage.getItem('token');
            // 스캔한 유저의 기존 스탬프 및 닉네임 정보 조회
            const res = await fetch(`${API_BASE}/api/stamps/user/${userIdToScan}/cards?storeId=${storeId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setScannedUser(data.user);
                setScannedUserId(userIdToScan);
                
                // 만약 이 매장의 Configs가 비어 있다면 default config를 pre-fetch하거나 
                // 가상 스탬프판 구동을 위해 configs 갱신
                if (data.cards && data.cards.length > 0) {
                    // 유저가 들고 있는 카드 목록에서 이 매장에 연결된 config 목록 자동 바인딩
                    const mappedConfigs = data.cards.map((c: any) => c.config);
                    setStampConfigs(mappedConfigs);
                    if (mappedConfigs.length > 0) {
                        setSelectedConfigId(mappedConfigs[0].id);
                    }
                }
                setScanStep('EARNING');
            } else {
                setErrorMessage("존재하지 않거나 올바르지 않은 유저 QR 코드 식별자입니다.");
            }
        } catch (err) {
            setErrorMessage("통신 에러가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    // 3. 다중 스탬프 적립 API 호출
    const handleEarnStamps = async () => {
        if (!scannedUserId || !storeId || !selectedConfigId) {
            setErrorMessage("적립 정보가 올바르지 않습니다.");
            return;
        }
        setIsLoading(true);
        setErrorMessage('');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/stamps/earn`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: scannedUserId,
                    storeId,
                    configId: selectedConfigId,
                    amount: earnAmount
                })
            });

            if (res.ok) {
                const resultData = await res.json();
                setSuccessData(resultData);
                setScanStep('SUCCESS');
            } else {
                const err = await res.json();
                setErrorMessage(err.message || "적립 처리 중 오류가 발생했습니다.");
            }
        } catch (err) {
            setErrorMessage("네트워크 에러가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    // 4. 최근 적립 내역 롤백/취소 API 호출
    const handleRollbackStamps = async () => {
        if (!scannedUserId || !storeId || !selectedConfigId) return;
        if (!window.confirm("방금 전송한 스탬프 적립 내역을 즉시 취소(롤백)하시겠습니까?")) return;

        setIsLoading(true);
        setErrorMessage('');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/stamps/rollback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: scannedUserId,
                    storeId,
                    configId: selectedConfigId
                })
            });

            if (res.ok) {
                const rollbackRes = await res.json();
                alert(`성공적으로 적립이 취소되었습니다. (롤백 수량: ${rollbackRes.transaction.amount} 스탬프)`);
                setScanStep('SCANNING');
                setEarnAmount(1);
            } else {
                const err = await res.json();
                setErrorMessage(err.message || "롤백 처리 중 오류가 발생했습니다.");
            }
        } catch (err) {
            setErrorMessage("취소 통신 에러가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* 백드롭 */}
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-espresso-950/80 backdrop-blur-sm z-[110]"
            />
            
            {/* 메인 스캐너 바텀 시트/모달 */}
            <motion.div 
                initial={{ y: "100%" }} 
                animate={{ y: 0 }} 
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-gradient-to-br from-espresso-900 to-[#1b120c] border-t border-amber-900/40 rounded-t-[2rem] z-[120] p-6 pb-safe flex flex-col max-h-[85vh] overflow-y-auto hide-scrollbar"
            >
                {/* 헤더 바 */}
                <div className="w-12 h-1 bg-espresso-700 rounded-full mx-auto mb-4 shrink-0" />
                
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-serif font-black text-amber-500 tracking-tight flex items-center gap-2">
                        🎫 점주용 실시간 QR 스캐너
                    </h3>
                    <button onClick={onClose} className="p-1 text-espresso-300 hover:text-espresso-50 active:scale-90 transition-transform">
                        <X size={20} />
                    </button>
                </div>

                {errorMessage && (
                    <div className="mb-4 bg-red-950/50 border border-red-500/30 px-4 py-3 rounded-2xl text-red-400 text-xs flex items-center gap-2 animate-pulse">
                        <AlertTriangle size={14} className="shrink-0" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* 1단계: 스캔 대기 상태 (비디오 에뮬레이터 + 수동 식별 코드 입력) */}
                {scanStep === 'SCANNING' && (
                    <div className="space-y-6">
                        <div className="border border-espresso-800 bg-espresso-950/80 rounded-3xl p-8 text-center relative overflow-hidden flex flex-col items-center justify-center space-y-4 min-h-[220px]">
                            {/* 카메라 애니메이션 프레임 */}
                            <div className="absolute inset-4 border-2 border-dashed border-amber-500/20 rounded-2xl pointer-events-none" />
                            <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-amber-500" />
                            <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-amber-500" />
                            <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-amber-500" />
                            <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-amber-500" />
                            
                            <motion.div 
                                animate={{ scale: [1, 1.05, 1] }} 
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center text-amber-400"
                            >
                                <Camera size={28} />
                            </motion.div>
                            
                            <div>
                                <span className="text-[13px] font-bold text-espresso-50">QR 스캔 대기 중...</span>
                                <p className="text-[10px] text-espresso-300 mt-1">고객의 모바일 지갑 QR 코드를 인식하세요.</p>
                            </div>
                        </div>

                        {/* 모의 카메라 에뮬레이션 테스트용 패널 */}
                        <div className="bg-espresso-950/50 p-4 rounded-2xl border border-espresso-800 space-y-3">
                            <span className="text-[11px] font-bold text-amber-500/80 uppercase tracking-widest block">스캔 에뮬레이터</span>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="유저 고유 식별코드 입력 (테스트)" 
                                    value={scannedUserId} 
                                    onChange={e => setScannedUserId(e.target.value)}
                                    className="flex-1 bg-espresso-900 border border-espresso-700 rounded-xl px-3 py-2 text-xs font-bold text-espresso-50 outline-none focus:border-amber-500/50"
                                />
                                <button 
                                    onClick={() => handleSimulateScan(scannedUserId)}
                                    disabled={isLoading}
                                    className="bg-amber-600 hover:bg-amber-700 text-espresso-950 text-xs font-black px-4 rounded-xl active:scale-95 transition-all shrink-0 cursor-pointer"
                                >
                                    스캔
                                </button>
                            </div>
                            
                            {/* 간편 테스트용 프리셋 버튼 */}
                            <div className="flex gap-1.5 flex-wrap">
                                <button 
                                    onClick={() => {
                                        // 현재 로그인된 유저 ID로 세팅해 시뮬레이션
                                        const me = JSON.parse(localStorage.getItem('user') || '{}');
                                        if (me.id) {
                                            setScannedUserId(me.id);
                                            handleSimulateScan(me.id);
                                        }
                                    }}
                                    className="text-[10px] bg-espresso-900 hover:bg-espresso-800 text-espresso-200 border border-espresso-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                                >
                                    나 자신을 스캔 (셀프 테스트)
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2단계: 다중 적립 정보 설정 & 가감 제어기 */}
                {scanStep === 'EARNING' && scannedUser && (
                    <div className="space-y-6">
                        {/* 스캔한 유저 프로필 카드 */}
                        <div className="bg-espresso-950/40 p-4 rounded-2xl border border-espresso-800 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-bold">
                                <UserCheck size={20} />
                            </div>
                            <div>
                                <span className="text-[10px] text-espresso-300 font-bold">스캔 성공 (인식 완료)</span>
                                <h4 className="font-bold text-[14px] text-espresso-50">{scannedUser.nickname} 단골 고객님</h4>
                            </div>
                        </div>

                        {/* 적립 정책(도장판 종류) 선택 */}
                        <div className="space-y-2">
                            <span className="text-xs font-bold text-espresso-100 block">적립 대상 도장판 선택</span>
                            <div className="grid grid-cols-1 gap-2">
                                {stampConfigs.map((cfg) => (
                                    <label 
                                        key={cfg.id} 
                                        onClick={() => setSelectedConfigId(cfg.id)}
                                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${selectedConfigId === cfg.id ? 'bg-amber-900/20 border-amber-500 text-amber-400' : 'bg-espresso-950/40 border-espresso-800 text-espresso-200 hover:bg-espresso-900'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="radio" 
                                                name="stampConfig" 
                                                checked={selectedConfigId === cfg.id}
                                                onChange={() => setSelectedConfigId(cfg.id)}
                                                className="accent-amber-500 hidden"
                                            />
                                            <div>
                                                <span className="font-bold text-xs">{cfg.cardTitle}</span>
                                                <p className="text-[9px] text-espresso-300 mt-0.5">목표: {cfg.maxStamps}개 | 보상: {cfg.rewardDesc}</p>
                                            </div>
                                        </div>
                                        <span className="bg-espresso-900 text-[9px] font-bold px-2 py-0.5 rounded text-espresso-300 uppercase tracking-widest">
                                            {cfg.cardType}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* 스탬프 다중 적립 제어기 (- / +) */}
                        <div className="bg-espresso-950/60 p-5 rounded-3xl border border-espresso-800 text-center space-y-4">
                            <span className="text-xs font-bold text-espresso-200 block">적립할 스탬프 수량 조절</span>
                            
                            <div className="flex justify-center items-center gap-6">
                                <button 
                                    onClick={() => setEarnAmount(prev => Math.max(1, prev - 1))}
                                    className="w-12 h-12 rounded-2xl bg-espresso-900 hover:bg-espresso-850 border border-espresso-700 text-espresso-100 flex items-center justify-center active:scale-90 transition-all shrink-0 cursor-pointer"
                                >
                                    <Minus size={18} />
                                </button>
                                <span className="font-mono text-3xl font-black text-amber-500 w-16">{earnAmount}</span>
                                <button 
                                    onClick={() => setEarnAmount(prev => Math.min(10, prev + 1))}
                                    className="w-12 h-12 rounded-2xl bg-[#D4AF37] hover:bg-[#B5952F] text-espresso-950 flex items-center justify-center active:scale-90 transition-all shrink-0 cursor-pointer"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                            
                            <span className="text-[10px] text-espresso-300 block">
                                원터치 분기적립: 일반/프로모션 수량 가감을 분할 지정하여 동시 적립
                            </span>
                        </div>

                        {/* 하단 적립 버튼 */}
                        <div className="flex gap-2.5 pt-2">
                            <button 
                                onClick={() => setScanStep('SCANNING')}
                                className="flex-1 py-3.5 bg-espresso-900 border border-espresso-750 text-espresso-100 font-bold text-xs rounded-xl active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
                            >
                                뒤로가기
                            </button>
                            <button 
                                onClick={handleEarnStamps}
                                disabled={isLoading}
                                className="flex-[2] py-3.5 bg-amber-600 hover:bg-amber-700 text-espresso-950 font-black text-xs rounded-xl active:scale-95 transition-all shadow-md cursor-pointer flex justify-center items-center gap-1.5"
                            >
                                <Coffee size={14} /> {isLoading ? "적립 진행 중..." : `${earnAmount}개 스탬프 적립 완료`}
                            </button>
                        </div>
                    </div>
                )}

                {/* 3단계: 적립 성공 및 롤백 지원 상태 */}
                {scanStep === 'SUCCESS' && successData && (
                    <div className="space-y-6 text-center py-4">
                        <motion.div 
                            initial={{ scale: 0.5, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-16 h-16 bg-green-500/10 border border-green-500/30 text-green-400 rounded-full flex items-center justify-center mx-auto mb-2"
                        >
                            <CheckCircle size={32} />
                        </motion.div>
                        
                        <div>
                            <h4 className="font-serif font-black text-xl text-espresso-50">스탬프 적립이 완료되었습니다!</h4>
                            <p className="text-xs text-espresso-200 mt-1">
                                {scannedUser?.nickname} 고객님께 <span className="text-amber-500 font-bold">{earnAmount} 스탬프</span>가 적립되었습니다.
                            </p>
                        </div>

                        {/* 상세 적립결과 요약 패널 */}
                        <div className="bg-espresso-950/40 p-4 rounded-2xl border border-espresso-800 text-left space-y-2 max-w-sm mx-auto text-xs">
                            <div className="flex justify-between">
                                <span className="text-espresso-300">현재 누적 도장 수:</span>
                                <span className="font-bold text-espresso-50 font-mono">{successData.card?.currentStamps} / 10개</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-espresso-300">총 완성 횟수:</span>
                                <span className="font-bold text-espresso-50">{successData.card?.completedCount}회</span>
                            </div>
                            {successData.coupons && successData.coupons.length > 0 && (
                                <div className="border-t border-espresso-800/80 pt-2 mt-2 space-y-1">
                                    <span className="text-amber-500 font-bold text-[10px] uppercase block tracking-wider">🎉 무료 쿠폰 신규 발행!</span>
                                    {successData.coupons.map((cp: any) => (
                                        <div key={cp.id} className="flex justify-between text-[11px] font-bold text-[#D4AF37]">
                                            <span>무료 교환권 발급:</span>
                                            <span className="font-mono">{cp.couponCode}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 에러 롤백/취소 및 재적립 버튼군 */}
                        <div className="flex flex-col gap-2.5 pt-2 max-w-sm mx-auto">
                            <button 
                                onClick={handleRollbackStamps}
                                disabled={isLoading}
                                className="w-full py-3.5 bg-red-950/30 hover:bg-red-950/50 border border-red-900/30 text-red-400 font-bold text-xs rounded-xl active:scale-95 transition-all cursor-pointer flex justify-center items-center gap-1.5"
                            >
                                <RotateCcw size={14} /> 방금 보낸 적립 전면 취소(롤백)
                            </button>
                            <button 
                                onClick={() => {
                                    setScanStep('SCANNING');
                                    setEarnAmount(1);
                                    setSuccessData(null);
                                }}
                                className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-espresso-950 font-black text-xs rounded-xl active:scale-95 transition-all shadow-md cursor-pointer"
                            >
                                다른 고객 추가 적립하기
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        </>
    );
}
