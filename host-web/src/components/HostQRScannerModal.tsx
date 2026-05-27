import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Camera, Plus, Minus, CheckCircle, AlertTriangle, UserCheck, Coffee, RotateCcw, Undo } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface HostQRScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScanSuccess?: (userId: string) => void;
}

export default function HostQRScannerModal({ isOpen, onClose, onScanSuccess }: HostQRScannerModalProps) {
    const { t } = useTranslation();
    const [scanStep, setScanStep] = useState<'SCANNING' | 'EARNING' | 'COUPON_USE' | 'SUCCESS'>('SCANNING');
    const [scannedUserId, setScannedUserId] = useState('');
    const [scannedUser, setScannedUser] = useState<any>(null);
    const [scannedCoupon, setScannedCoupon] = useState<any>(null);
    const [storeId, setStoreId] = useState('');
    const [stampConfigs, setStampConfigs] = useState<any[]>([]);
    const [selectedConfigId, setSelectedConfigId] = useState('');
    const [earnAmount, setEarnAmount] = useState(1);
    const [earnItems, setEarnItems] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successData, setSuccessData] = useState<any>(null);
    const [isStoreLoading, setIsStoreLoading] = useState(true);
    const [isJsQrLoaded, setIsJsQrLoaded] = useState(false);

    // selectedConfigId가 바뀔 때 earnItems 초기화
    useEffect(() => {
        if (selectedConfigId) {
            const cfg = stampConfigs.find(c => c.id === selectedConfigId);
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
    }, [selectedConfigId, stampConfigs]);

    // Camera Stream States
    const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
    const [isCameraSupported, setIsCameraSupported] = useState(true);
    const [isScanningActive, setIsScanningActive] = useState(false);

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
                
                // 숫자가 아닌 모든 문자열(한글/영어/공백/기호) 매치 보강
                const match = trimmed.match(/^([^0-9]+?)\s*(\d+)\s*(?:잔|개|병|팩|개입)?$/);
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

    // 1. 점주가 소유한 매장 정보 및 설정 동기화
    useEffect(() => {
        const fetchStoreAndConfigs = async () => {
            const token = localStorage.getItem('token');
            if (!token || !isOpen) {
                setIsStoreLoading(false);
                return;
            }
            setIsStoreLoading(true);
            try {
                const storeRes = await fetch('/api/shops/my', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (storeRes.ok) {
                    const stores = await storeRes.json();
                    let targetStore = null;
                    
                    if (stores && stores.length > 0) {
                        targetStore = stores[0];
                    }

                    if (targetStore) {
                        setStoreId(targetStore.id);
                        
                        let configRes = await fetch(`/api/stamps/configs/${targetStore.id}`);
                        if (configRes.ok) {
                            let configs = await configRes.json();
                            
                            // 자동 개설(Auto-Provisioning)
                            if (!configs || configs.length === 0) {
                                const createRes = await fetch('/api/stamps/configs', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${token}`
                                    },
                                    body: JSON.stringify({
                                        storeId: targetStore.id,
                                        cardType: "REGULAR",
                                        cardTitle: "☕ 아메리카노 단골 도장판",
                                        maxStamps: 10,
                                        rewardDesc: "아메리카노 1잔 무료 쿠폰",
                                        validDays: 90
                                    })
                                });
                                if (createRes.ok) {
                                    const newConfig = await createRes.json();
                                    configs = [newConfig];
                                }
                            }
                            
                            setStampConfigs(configs);
                            if (configs.length > 0) {
                                setSelectedConfigId(configs[0].id);
                            }
                        }
                    } else {
                        setErrorMessage("등록된 매장이 없습니다. 웹 대시보드에서 매장을 먼저 등록해주세요.");
                    }
                }
            } catch (err) {
                console.error("Host setup failed:", err);
            } finally {
                setIsStoreLoading(false);
            }
        };
        if (isOpen) {
            fetchStoreAndConfigs();
        }
    }, [isOpen]);

    // jsQR 동적 로드
    useEffect(() => {
        if ((window as any).jsQR) {
            setIsJsQrLoaded(true);
            return;
        }
        const script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
        script.async = true;
        script.onload = () => {
            setIsJsQrLoaded(true);
        };
        script.onerror = () => {
            console.error("Failed to load jsQR library");
        };
        document.head.appendChild(script);
    }, []);

    const triggerBeep = () => {
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.setValueAtTime(880, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.15);
        } catch (ae) {}
    };

    // 실시간 카메라 스캔 엔진
    useEffect(() => {
        if (!isOpen) return;
        let activeStream: MediaStream | null = null;
        let detectionInterval: any = null;

        const startCamera = async () => {
            if (isStoreLoading || !isOpen || scanStep !== 'SCANNING') return;
            setErrorMessage('');
            
            if (videoStream) {
                setIsCameraSupported(true);
                setIsScanningActive(true);
                setTimeout(() => {
                    const videoEl = document.getElementById('host-scanner-video') as HTMLVideoElement;
                    if (videoEl && videoEl.srcObject !== videoStream) {
                        videoEl.srcObject = videoStream;
                    }
                }, 100);
                return;
            }

            const constraintsList = [
                { video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
                { video: { facingMode: 'environment' }, audio: false },
                { video: true, audio: false }
            ];

            let stream: MediaStream | null = null;
            let lastError: any = null;

            for (const constraints of constraintsList) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia(constraints as any);
                    if (stream) break;
                } catch (err: any) {
                    lastError = err;
                }
            }

            if (stream) {
                activeStream = stream;
                setVideoStream(stream);
                setIsCameraSupported(true);
                setIsScanningActive(true);

                setTimeout(() => {
                    const videoEl = document.getElementById('host-scanner-video') as HTMLVideoElement;
                    if (videoEl) {
                        videoEl.srcObject = stream;
                    }
                }, 100);
            } else {
                console.error("Camera failed:", lastError);
                setIsCameraSupported(false);
                const errName = lastError?.name || '';
                
                if (window.isSecureContext === false) {
                    setErrorMessage(t('host_scanner.err_secure_context', "실시간 QR 카메라는 HTTPS 보안 연결 환경 또는 로컬호스트에서만 활성화됩니다. 아래 스캔 에뮬레이터에 고유 코드를 입력해 시뮬레이션하십시오."));
                } else if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
                    setErrorMessage(t('host_scanner.err_permission_denied', "카메라 권한이 거절되었습니다. 시스템 설정에서 카메라 접근을 승인해 주세요."));
                } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
                    setErrorMessage(t('host_scanner.err_no_camera', "사용할 수 있는 카메라 장치를 찾을 수 없습니다."));
                } else {
                    setErrorMessage(t('host_scanner.err_camera_fallback', "카메라 접근 에러가 발생했습니다. 에뮬레이터를 사용해 주세요."));
                }
            }
        };

        startCamera();

        detectionInterval = setInterval(() => {
            if (scanStep !== 'SCANNING') return;

            const videoEl = document.getElementById('host-scanner-video') as HTMLVideoElement;
            if (videoEl && videoEl.readyState >= 2) {
                const jsQRDecoder = (window as any).jsQR;
                if (jsQRDecoder) {
                    try {
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        if (context) {
                            canvas.width = videoEl.videoWidth || 640;
                            canvas.height = videoEl.videoHeight || 480;
                            context.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
                            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                            const code = jsQRDecoder(imageData.data, imageData.width, imageData.height, {
                                inversionAttempts: "dontInvert",
                            });
                            if (code && code.data && code.data.trim()) {
                                triggerBeep();
                                handleSimulateScan(code.data);
                            }
                        }
                    } catch (err) {
                        console.error("QR decode error:", err);
                    }
                }
            }
        }, 300);

        return () => {
            if (detectionInterval) clearInterval(detectionInterval);
            if (activeStream) {
                activeStream.getTracks().forEach(track => track.stop());
            }
            if (videoStream) {
                videoStream.getTracks().forEach(track => track.stop());
            }
            const videoEl = document.getElementById('host-scanner-video') as HTMLVideoElement;
            if (videoEl && videoEl.srcObject) {
                try {
                    const srcStream = videoEl.srcObject as MediaStream;
                    srcStream.getTracks().forEach(track => track.stop());
                } catch (e) {}
                videoEl.srcObject = null;
            }
            setVideoStream(null);
            setIsScanningActive(false);
        };
    }, [isOpen, scanStep, isJsQrLoaded, isStoreLoading]);

    // 사진 스캔 (업로드용)
    const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setIsLoading(true);
        setErrorMessage('');
        
        try {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });
            
            const jsQRDecoder = (window as any).jsQR;
            if (jsQRDecoder) {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                if (context) {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    context.drawImage(img, 0, 0, canvas.width, canvas.height);
                    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQRDecoder(imageData.data, imageData.width, imageData.height, {
                        inversionAttempts: "dontInvert"
                    });
                    if (code && code.data) {
                        triggerBeep();
                        handleSimulateScan(code.data);
                        return;
                    }
                }
            }
            throw new Error("스캔 실패");
        } catch (err: any) {
            triggerBeep();
            setErrorMessage(t('host_scanner.capture_fail', "QR 이미지 해독에 실패하여 단골 고객 코드로 모의 처리되었습니다!"));
            setTimeout(() => {
                handleSimulateScan("test-customer-01");
            }, 1000);
        } finally {
            setIsLoading(false);
        }
    };

    // QR 스캔 검증
    const handleSimulateScan = async (rawUserId: string) => {
        let userId = rawUserId.trim();
        try {
            if (userId.includes('data=')) {
                const urlObj = new URL(userId.startsWith('http') ? userId : `http://mock.com?${userId}`);
                const dataParam = urlObj.searchParams.get('data');
                if (dataParam) userId = dataParam;
            }
            userId = decodeURIComponent(userId);
        } catch (e) {}

        const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
        const match = userId.match(uuidRegex);
        if (match) {
            userId = match[0];
        }

        if (!userId) {
            setErrorMessage("스캔된 유저 정보가 올바르지 않습니다.");
            return;
        }

        setIsLoading(true);
        setErrorMessage('');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/stamps/user/${userId}/cards?storeId=${storeId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                
                // 💡 만약 스캔된 대상이 이용자 ID가 아니라 무료 쿠폰 QR 코드(StampCoupon ID)인 경우 감지 처리
                if (data.isCoupon) {
                    setScannedCoupon(data.coupon);
                    setScanStep('COUPON_USE');
                    setIsLoading(false);
                    return;
                }

                setScannedUser(data.user);
                setScannedUserId(userId);
                
                if (data.cards && data.cards.length > 0) {
                    const mappedConfigs = data.cards.map((c: any) => c.config).filter(Boolean);
                    if (mappedConfigs.length > 0) {
                        setStampConfigs(mappedConfigs);
                        setSelectedConfigId(mappedConfigs[0].id);
                    }
                }
                setScanStep('EARNING');
            } else {
                const errData = await res.json().catch(() => ({}));
                const errDetail = errData.message || errData.error || "서버 응답 거부(400/500)";
                setErrorMessage(`존재하지 않거나 올바르지 않은 유저 QR 코드 식별자입니다. (스캔된 값: "${userId}", 원인: ${errDetail})`);
            }
        } catch (err) {
            setErrorMessage("통신 장애가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    // 💡 쿠폰 실시간 수동 사용 완료 처리 API 호출
    const handleUseCoupon = async () => {
        if (!scannedCoupon || !scannedCoupon.id) return;
        
        setIsLoading(true);
        setErrorMessage('');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/stamps/coupons/${scannedCoupon.id}/use`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                const useData = await res.json();
                setSuccessData({
                    isCouponUse: true,
                    coupon: useData.coupon,
                    userNickname: scannedCoupon.userNickname
                });
                setScanStep('SUCCESS');
            } else {
                const err = await res.json();
                setErrorMessage(err.message || "쿠폰 사용 완료 처리 중 오류가 발생했습니다.");
            }
        } catch (err) {
            setErrorMessage("쿠폰 사용 통신 에러가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    // 스탬프 전송 적립
    const handleEarnStamps = async () => {
        if (!scannedUserId || !storeId || !selectedConfigId) return;

        const cfg = stampConfigs.find(c => c.id === selectedConfigId);
        const parsedItemsConfig = getItemsConfig(cfg);
        const isPromotion = cfg && parsedItemsConfig && Array.isArray(parsedItemsConfig);

        let finalAmount = earnAmount;
        let finalItems = null;

        if (isPromotion) {
            finalItems = earnItems;
            finalAmount = Object.values(earnItems).reduce((sum, val) => sum + val, 0);
            if (finalAmount <= 0) {
                setErrorMessage("품목을 1개 이상 골라주세요.");
                return;
            }
        }

        setIsLoading(true);
        setErrorMessage('');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/stamps/earn', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: scannedUserId,
                    storeId,
                    configId: selectedConfigId,
                    amount: finalAmount,
                    items: finalItems
                })
            });

            if (res.ok) {
                const resultData = await res.json();
                setSuccessData(resultData);
                setScanStep('SUCCESS');
            } else {
                const err = await res.json();
                setErrorMessage(err.message || "스탬프 전송 실패");
            }
        } catch (err) {
            setErrorMessage("통신 에러가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    // 롤백 취소
    const handleRollbackStamps = async () => {
        if (!scannedUserId || !storeId || !selectedConfigId) return;
        if (!window.confirm("방금 보낸 적립을 취소하시겠습니까?")) return;

        setIsLoading(true);
        setErrorMessage('');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/stamps/rollback', {
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
                setScanStep('SCANNING');
                setEarnAmount(1);
            } else {
                const err = await res.json();
                setErrorMessage(err.message || "취소 실패");
            }
        } catch (err) {
            setErrorMessage("통신 중 에러가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 antialiased">
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-espresso-950/80 backdrop-blur-sm"
                />
                
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="w-full max-w-[480px] bg-gradient-to-br from-espresso-900 to-[#1b120c] border border-espresso-800 p-6 rounded-3xl shadow-2xl relative z-10 text-xs text-espresso-100 max-h-[90vh] overflow-y-auto hide-scrollbar"
                >
                    <div className="flex justify-between items-center pb-3 border-b border-espresso-850 mb-5">
                        <h3 className="text-sm font-serif font-black text-amber-500 tracking-tight flex items-center gap-1.5">
                            <Coffee size={16} />
                            {t('host_scanner.title', '🎫 점주용 실시간 QR 스캐너')}
                        </h3>
                        <button onClick={onClose} className="p-1 hover:bg-espresso-800 text-espresso-400 hover:text-espresso-50 rounded-lg transition-colors cursor-pointer">
                            <X size={18} />
                        </button>
                    </div>

                    {errorMessage && (
                        <div className="mb-4 bg-red-950/40 border border-red-500/30 text-red-400 p-3 rounded-xl flex items-center gap-2">
                            <AlertTriangle size={14} className="shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    {isStoreLoading ? (
                        <div className="py-16 text-center space-y-3">
                            <div className="w-8 h-8 border-4 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin mx-auto" />
                            <p className="text-espresso-300 font-bold">{t('host_scanner.sync_loading', '적립 정책 동기화 중...')}</p>
                        </div>
                    ) : (
                        <>
                            {scanStep === 'SCANNING' && (
                                <div className="space-y-5">
                                    <div className="border border-espresso-800 bg-espresso-950/80 rounded-2xl p-2 relative overflow-hidden flex flex-col items-center justify-center min-h-[220px]">
                                        <div className="absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 border-amber-500 pointer-events-none" />
                                        <div className="absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 border-amber-500 pointer-events-none" />
                                        <div className="absolute bottom-3 left-3 w-3 h-3 border-b-2 border-l-2 border-amber-500 pointer-events-none" />
                                        <div className="absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 border-amber-500 pointer-events-none" />

                                        {isCameraSupported ? (
                                            <video id="host-scanner-video" autoPlay playsInline className="w-full h-52 object-cover rounded-xl bg-black" />
                                        ) : (
                                            <div className="py-8 px-4 flex flex-col items-center gap-2">
                                                <Camera size={28} className="text-amber-500" />
                                                <span className="font-bold text-amber-500">{t('host_scanner.camera_disabled', '스캔 카메라 제한됨')}</span>
                                                <p className="text-[10px] text-espresso-400 max-w-[280px] text-center leading-relaxed">
                                                    {t('host_scanner.camera_disabled_desc', '로컬 호스트 또는 HTTPS 보안 상태가 아닙니다. 하단 스캔 에뮬레이터 presets를 활용해 완벽하게 로직을 시험해 보십시오.')}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* 이미지 업로드 스캔 */}
                                    <label className="flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-500 to-[#D4AF37] hover:from-amber-600 hover:to-[#B5952F] text-espresso-950 font-black rounded-xl shadow-md cursor-pointer active:scale-98 transition-transform select-none">
                                        <Camera size={14} />
                                        <span>{t('host_scanner.btn_capture', '실제 카메라 촬영 또는 사진 스캔')}</span>
                                        <input type="file" accept="image/*" capture="environment" onChange={handleImageCapture} className="hidden" />
                                    </label>

                                    {/* 에뮬레이터 패널 */}
                                    <div className="bg-espresso-950/50 p-4 rounded-xl border border-espresso-850 space-y-3.5">
                                        <div className="flex justify-between items-center pb-1.5 border-b border-espresso-850">
                                            <span className="font-bold text-[10px] text-amber-500 uppercase tracking-widest">{t('host_scanner.emulator_title', '스캔 시뮬레이터')}</span>
                                            <span className="text-[9px] text-espresso-450">{t('host_scanner.emulator_desc', '가상 단골 퀵 적립')}</span>
                                        </div>

                                        <div className="flex gap-1.5 flex-wrap">
                                            <button onClick={() => handleSimulateScan("test-customer-01")} className="bg-amber-950/20 hover:bg-amber-950/40 text-amber-400 border border-amber-900/30 px-2 py-1.5 rounded-lg font-bold text-[10px] cursor-pointer">
                                                {t('host_scanner.emulator_customer_1', '☕ 김아메')}
                                            </button>
                                            <button onClick={() => handleSimulateScan("test-customer-02")} className="bg-amber-950/20 hover:bg-amber-950/40 text-amber-400 border border-amber-900/30 px-2 py-1.5 rounded-lg font-bold text-[10px] cursor-pointer">
                                                {t('host_scanner.emulator_customer_2', '🍮 박라떼')}
                                            </button>
                                            <button onClick={() => {
                                                const me = JSON.parse(localStorage.getItem('user') || '{}');
                                                if (me.id) handleSimulateScan(me.id);
                                            }} className="bg-espresso-900 hover:bg-espresso-800 text-espresso-200 border border-espresso-800 px-2 py-1.5 rounded-lg font-bold text-[10px] cursor-pointer">
                                                {t('host_scanner.btn_self_scan', '나 자신 스캔')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {scanStep === 'EARNING' && scannedUser && (
                                <div className="space-y-5">
                                    <div className="bg-espresso-950/40 p-3.5 rounded-xl border border-espresso-800 flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                                            <UserCheck size={16} />
                                        </div>
                                        <div>
                                            <span className="text-[9px] text-espresso-400 font-bold block">{t('host_scanner.scan_success_badge', '식별 완료')}</span>
                                            <h4 className="font-bold text-[13px] text-espresso-50">{scannedUser.nickname} 단골 고객님</h4>
                                        </div>
                                    </div>

                                    {/* 적립 대상 선택 */}
                                    <div className="space-y-1.5">
                                        <span className="text-[11px] font-bold text-espresso-200 block">{t('host_scanner.select_card_title', '적립 대상 도장판 선택')}</span>
                                        <div className="space-y-1.5">
                                            {stampConfigs.map(cfg => (
                                                <label 
                                                    key={cfg.id}
                                                    onClick={() => setSelectedConfigId(cfg.id)}
                                                    className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${selectedConfigId === cfg.id ? 'bg-amber-900/15 border-amber-500/50 text-amber-400' : 'bg-espresso-950/30 border-espresso-850 text-espresso-200 hover:bg-espresso-900'}`}
                                                >
                                                    <span className="font-bold">{t(cfg.cardTitle, cfg.cardTitle) as string}</span>
                                                    <span className="text-[9px] bg-espresso-900 px-1.5 py-0.5 rounded border border-espresso-800">
                                                        {cfg.cardType === 'REGULAR' ? '일반' : '프로모션'}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 수량 설정 */}
                                    {(() => {
                                        const cfg = stampConfigs.find(c => c.id === selectedConfigId);
                                        const parsedItemsConfig = getItemsConfig(cfg);
                                        const isPromotion = cfg && parsedItemsConfig && Array.isArray(parsedItemsConfig);

                                        if (isPromotion) {
                                            return (
                                                <div className="bg-espresso-950 p-4 rounded-xl border border-espresso-850 space-y-3">
                                                    <span className="text-[11px] text-espresso-200 block text-center font-bold">{t('host_scanner.adjust_items_qty', '품목별 적립 수량 조절')}</span>
                                                    <div className="space-y-2">
                                                        {parsedItemsConfig.map((item: any) => {
                                                            const currentQty = earnItems[item.key] || 0;
                                                            return (
                                                                <div key={item.key} className="flex justify-between items-center bg-espresso-900/40 p-2 rounded-lg border border-espresso-800">
                                                                    <div className="pl-1">
                                                                        <span className="font-bold text-xs text-espresso-50">{item.label}</span>
                                                                        <p className="text-[8.5px] text-espresso-400">{t('host_scanner.target_qty', { target: item.target })}</p>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <button onClick={() => setEarnItems(prev => ({ ...prev, [item.key]: Math.max(0, currentQty - 1) }))} className="w-7 h-7 bg-espresso-950 text-espresso-100 rounded border border-espresso-800 flex items-center justify-center cursor-pointer">
                                                                            <Minus size={10} />
                                                                        </button>
                                                                        <span className="font-mono font-bold text-amber-500 w-4 text-center">{currentQty}</span>
                                                                        <button onClick={() => setEarnItems(prev => ({ ...prev, [item.key]: Math.min(10, currentQty + 1) }))} className="w-7 h-7 bg-amber-500 text-espresso-950 rounded flex items-center justify-center cursor-pointer">
                                                                            <Plus size={10} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="bg-espresso-950 p-3.5 rounded-xl border border-espresso-850 text-center space-y-3">
                                                <span className="text-[11px] text-espresso-200 block">{t('host_scanner.adjust_stamp_qty', '적립할 스탬프 수량 조절')}</span>
                                                <div className="flex justify-center items-center gap-5">
                                                    <button onClick={() => setEarnAmount(prev => Math.max(1, prev - 1))} className="w-8 h-8 rounded bg-espresso-900 border border-espresso-800 text-espresso-200 flex items-center justify-center cursor-pointer">
                                                        <Minus size={12} />
                                                    </button>
                                                    <span className="font-mono text-lg font-black text-amber-500 w-6">{earnAmount}</span>
                                                    <button onClick={() => setEarnAmount(prev => Math.min(10, prev + 1))} className="w-8 h-8 rounded bg-[#D4AF37] text-espresso-950 flex items-center justify-center cursor-pointer">
                                                        <Plus size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    <div className="flex gap-2">
                                        <button onClick={() => setScanStep('SCANNING')} className="flex-1 py-3 bg-espresso-900 border border-espresso-850 hover:bg-espresso-850 rounded-xl font-bold transition-all cursor-pointer">
                                            {t('host_scanner.btn_back', '이전')}
                                        </button>
                                        <button onClick={handleEarnStamps} disabled={isLoading} className="flex-[2] py-3 bg-[#D4AF37] hover:bg-amber-500 text-espresso-950 font-black rounded-xl transition-all shadow-md active:scale-98 cursor-pointer flex justify-center items-center gap-1">
                                            <CheckCircle size={14} />
                                            {t('host_scanner.btn_earn', '적립 전송 완료')}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {scanStep === 'COUPON_USE' && scannedCoupon && (
                                <div className="space-y-5 text-center py-4">
                                    <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto mb-3 animate-pulse">
                                        <Coffee size={24} />
                                    </div>
                                    <div>
                                        <span className="bg-amber-500 text-espresso-950 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">FREE COUPON</span>
                                        <h4 className="font-serif font-black text-base text-espresso-50 mt-2">{t('host_scanner.coupon_confirm_title', '무료 혜택 쿠폰이 감지되었습니다!')}</h4>
                                        <p className="text-[10px] text-espresso-400 mt-1 leading-relaxed">
                                            {t('host_scanner.coupon_confirm_desc', { name: scannedCoupon.userNickname, defaultValue: `${scannedCoupon.userNickname} 단골 고객님의 무료 쿠폰입니다.` })}
                                        </p>
                                    </div>

                                    {/* 쿠폰 영수증 카드 */}
                                    <div className="bg-espresso-950/60 p-4.5 rounded-2xl border border-espresso-850 text-left space-y-2 text-[11px] leading-relaxed max-w-[340px] mx-auto font-mono relative ticket-cutout">
                                        <div className="flex justify-between">
                                            <span className="text-espresso-400">소유 고객:</span>
                                            <span className="font-bold text-espresso-50">{scannedCoupon.userNickname} ({scannedCoupon.userEmail})</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-espresso-400">혜택 리워드:</span>
                                            <span className="font-bold text-amber-400">{scannedCoupon.rewardDesc}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-espresso-400">쿠폰 코드:</span>
                                            <span className="font-bold text-espresso-50">{scannedCoupon.couponCode}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-espresso-400">유효 기간:</span>
                                            <span className="font-bold text-red-400">{new Date(scannedCoupon.expiresAt).toLocaleDateString()} 까지</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <button onClick={() => { setScanStep('SCANNING'); setScannedCoupon(null); }} className="flex-1 py-3 bg-espresso-900 border border-espresso-850 hover:bg-espresso-850 rounded-xl font-bold transition-all cursor-pointer">
                                            {t('host_scanner.btn_cancel', '취소')}
                                        </button>
                                        <button onClick={handleUseCoupon} disabled={isLoading || scannedCoupon.status !== 'UNUSED'} className="flex-[2] py-3 bg-[#D4AF37] hover:bg-amber-500 text-espresso-950 font-black rounded-xl transition-all shadow-md active:scale-98 cursor-pointer flex justify-center items-center gap-1">
                                            <CheckCircle size={14} />
                                            {t('host_scanner.btn_use_coupon_complete', '무료쿠폰 즉시 사용 처리')}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {scanStep === 'SUCCESS' && successData && (
                                <div className="space-y-5 text-center py-4">
                                    {successData.isCouponUse ? (
                                        <>
                                            <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 flex items-center justify-center mx-auto mb-3">
                                                <CheckCircle size={24} />
                                            </div>
                                            <div>
                                                <h4 className="font-serif font-black text-base text-green-400">{t('host_scanner.coupon_use_success_title', '쿠폰 사용 처리가 완료되었습니다!')}</h4>
                                                <p className="text-[10px] text-espresso-400 mt-1 leading-relaxed">
                                                    {t('host_scanner.coupon_use_success_desc', { name: successData.userNickname, defaultValue: `${successData.userNickname} 고객님의 무료 혜택 무료 쿠폰이 성공적으로 사용 완료되었습니다.` })}
                                                </p>
                                            </div>

                                            <div className="bg-espresso-950/60 p-4.5 rounded-2xl border border-espresso-850 text-left space-y-2 text-[11px] leading-relaxed max-w-[340px] mx-auto font-mono relative ticket-cutout">
                                                <div className="flex justify-between">
                                                    <span className="text-espresso-400">사용 완료 일시:</span>
                                                    <span className="font-bold text-espresso-50">{new Date().toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-espresso-400">사용된 쿠폰 코드:</span>
                                                    <span className="font-bold text-amber-500">{successData.coupon?.couponCode}</span>
                                                </div>
                                            </div>

                                            <div className="pt-2 max-w-[340px] mx-auto">
                                                <button onClick={() => { setScanStep('SCANNING'); setEarnAmount(1); setSuccessData(null); setScannedCoupon(null); }} className="w-full py-3 bg-[#D4AF37] hover:bg-amber-500 text-espresso-950 font-black rounded-xl transition-all shadow-md active:scale-98 cursor-pointer">
                                                    {t('host_scanner.btn_back_to_scan', '돌아가기')}
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 flex items-center justify-center mx-auto mb-3">
                                                <CheckCircle size={24} />
                                            </div>
                                            <div>
                                                <h4 className="font-serif font-black text-base text-green-400">{t('host_scanner.success_title', '도장 적립 전송이 완료되었습니다!')}</h4>
                                                <p className="text-[10px] text-espresso-400 mt-1 leading-relaxed">
                                                    {t('host_scanner.success_desc', '단골 고객님의 스탬프 지갑에 안전하게 적립 내역이 실시간 동기화되었습니다.')}
                                                </p>
                                            </div>

                                            {/* 영수증 카드 */}
                                            <div className="bg-espresso-950/60 p-4.5 rounded-2xl border border-espresso-850 text-left space-y-2 text-[11px] leading-relaxed max-w-[340px] mx-auto font-mono relative ticket-cutout">
                                                <div className="flex justify-between">
                                                    <span className="text-espresso-400">{t('host_scanner.receipt_customer', '적립 고객')}:</span>
                                                    <span className="font-bold text-espresso-50">{scannedUser.nickname}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-espresso-400">{t('host_scanner.receipt_card', '도장판')}:</span>
                                                    <span className="font-bold text-espresso-50 truncate max-w-[200px]">
                                                        {t(successData.configTitle, successData.configTitle) as string}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-espresso-400">{t('host_scanner.receipt_earned', '이번 적립량')}:</span>
                                                    <span className="font-bold text-amber-500">+{successData.earnedAmount}스탬프</span>
                                                </div>
                                                <div className="flex justify-between pt-1.5 border-t border-dashed border-espresso-800">
                                                    <span className="text-espresso-400">{t('host_scanner.receipt_total', '누적 스탬프')}:</span>
                                                    <span className="font-bold text-[#D4AF37]">{successData.currentStamps} / {successData.maxStamps}</span>
                                                </div>

                                                {successData.issuedCoupons && successData.issuedCoupons.length > 0 && (
                                                    <div className="mt-3.5 bg-green-950/20 border border-green-500/20 p-2.5 rounded-lg text-center text-green-400 text-[10px] animate-bounce">
                                                        🎉 {t('host_scanner.reward_coupon_issued', { count: successData.issuedCoupons.length })}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex gap-2 pt-2">
                                                <button onClick={handleRollbackStamps} className="flex-1 py-3 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-400 font-bold rounded-xl active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1">
                                                    <RotateCcw size={12} />
                                                    {t('host_scanner.btn_rollback', '적립 전면 취소')}
                                                </button>
                                                <button onClick={() => { setScanStep('SCANNING'); setEarnAmount(1); }} className="flex-1 py-3 bg-espresso-850 hover:bg-espresso-800 border border-espresso-800 font-black rounded-xl active:scale-98 transition-all cursor-pointer">
                                                    {t('host_scanner.btn_next_scan', '다음 스캔 계속하기')}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
