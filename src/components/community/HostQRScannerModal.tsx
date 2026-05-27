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
    const [earnItems, setEarnItems] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successData, setSuccessData] = useState<any>(null);
    
    // 💡 비동기 로딩 락 상태: 매장 정보와 적립 정책 바인딩이 끝나기 전 스캔 경쟁 상태를 완벽히 격리
    const [isStoreLoading, setIsStoreLoading] = useState(true);

    // selectedConfigId가 바뀔 때 earnItems 초기화
    useEffect(() => {
        if (selectedConfigId) {
            const cfg = stampConfigs.find(c => c.id === selectedConfigId);
            if (cfg && cfg.itemsConfig) {
                const initialItems: Record<string, number> = {};
                cfg.itemsConfig.forEach((item: any) => {
                    initialItems[item.key] = 0;
                });
                setEarnItems(initialItems);
            } else {
                setEarnItems({});
            }
        }
    }, [selectedConfigId, stampConfigs]);

    // Real Camera Stream States
    const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
    const [isCameraSupported, setIsCameraSupported] = useState(true);
    const [isScanningActive, setIsScanningActive] = useState(false);

    // 1. 점주가 소유한 첫 번째 매장 ID를 임의로 pre-fetch 및 스탬프 정책 자동 개설(Auto-Provisioning)
    useEffect(() => {
        const fetchStoreAndConfigs = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setIsStoreLoading(false);
                return;
            }
            setIsStoreLoading(true);
            try {
                const meRes = await fetch(`${API_BASE}/api/users/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (meRes.ok) {
                    const meData = await meRes.json();
                    const storeRes = await fetch(`${API_BASE}/api/shops/my`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    if (storeRes.ok) {
                        const stores = await storeRes.json();
                        let targetStore = null;
                        
                        if (stores && stores.length > 0) {
                            targetStore = stores[0];
                        } else {
                            // 💡 점주 소유 매장이 없을 때의 풀백: 전체 매장 API에서 실제 존재하는 첫 번째 매장 ID 획득!
                            console.warn("No owned stores found for host. Trying global shops fallback...");
                            const globalStoreRes = await fetch(`${API_BASE}/api/shops`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (globalStoreRes.ok) {
                                const globalStores = await globalStoreRes.json();
                                if (globalStores && globalStores.length > 0) {
                                    targetStore = globalStores[0];
                                }
                            }
                        }

                        if (targetStore) {
                            setStoreId(targetStore.id);
                            
                            // 스탬프 정책 목록 조회
                            let configRes = await fetch(`${API_BASE}/api/stamps/configs/${targetStore.id}`);
                            if (configRes.ok) {
                                let configs = await configRes.json();
                                
                                // 💡 자동 개설(Auto-Provisioning): 활성 도장 정책이 단 하나도 없다면 백그라운드에서 기본 꿀도장 정책 즉시 개설!
                                if (!configs || configs.length === 0) {
                                    const createRes = await fetch(`${API_BASE}/api/stamps/configs`, {
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
                            setStoreId("demo-store-1234");
                            setErrorMessage("등록된 매장이 없습니다. 웹 대시보드에서 매장을 먼저 등록해주세요.");
                        }
                    }
                }
            } catch (err) {
                console.error("Host setup failed:", err);
            } finally {
                setIsStoreLoading(false); // 로딩 해제
            }
        };
        fetchStoreAndConfigs();
    }, []);

    // 1-2. jsQR 디코딩 라이브러리 동적 CDN 로드 (모바일 사파리 및 크롬 실시간 자동인식 100% 호환성 확보)
    const [isJsQrLoaded, setIsJsQrLoaded] = useState(false);
    useEffect(() => {
        if ((window as any).jsQR) {
            setIsJsQrLoaded(true);
            return;
        }
        const script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
        script.async = true;
        script.onload = () => {
            console.log("jsQR library successfully loaded via CDN.");
            setIsJsQrLoaded(true);
        };
        script.onerror = () => {
            console.error("Failed to load jsQR library from CDN.");
        };
        document.head.appendChild(script);
    }, []);

    // 햅틱 체감 및 스캔 성공음 헬퍼
    const triggerBeep = () => {
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.setValueAtTime(880, audioCtx.currentTime); // High Beep
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.15);
        } catch (ae) {}
    };

    // 2. 실시간 카메라 스트림 활성화 및 해제 수명주기 제어 (일시정지 및 재개 모델)
    useEffect(() => {
        let activeStream: MediaStream | null = null;
        let detectionInterval: any = null;

        const startCamera = async () => {
            // 💡 매장 로딩이 완료되어 비디오 DOM 엘리먼트가 완전히 렌더링된 후에만 카메라 디바이스 구동 개시!
            if (isStoreLoading || !isOpen) return;
            setErrorMessage('');
            
            // 💡 스트림이 이미 존재한다면 (재스캔 등) 하드웨어를 재작동시키지 않고 비디오 엘리먼트 바인딩만 즉시 복원
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

            // 점진적인 카메라 획득 constraints 설정 (기기 호환성 극대화)
            const constraintsList = [
                {
                    video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
                    audio: false
                },
                {
                    video: { facingMode: 'environment' },
                    audio: false
                },
                {
                    video: true,
                    audio: false
                }
            ];

            let stream: MediaStream | null = null;
            let lastError: any = null;

            for (const constraints of constraintsList) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia(constraints as any);
                    if (stream) break; // 성공 시 루프 탈출
                } catch (err: any) {
                    console.warn("Camera option failed with constraints:", constraints, err);
                    lastError = err;
                }
            }

            if (stream) {
                activeStream = stream;
                setVideoStream(stream);
                setIsCameraSupported(true);
                setIsScanningActive(true);

                // Video 엘리먼트에 스트림 연결
                setTimeout(() => {
                    const videoEl = document.getElementById('host-scanner-video') as HTMLVideoElement;
                    if (videoEl) {
                        videoEl.srcObject = stream;
                    }
                }, 100);
            } else {
                console.error("All camera constraints failed:", lastError);
                setIsCameraSupported(false);
                const errName = lastError?.name || '';
                
                if (window.isSecureContext === false) {
                    setErrorMessage("실시간 QR 카메라는 HTTPS 보안 연결 환경(Secure Context) 또는 모바일 Native App에서만 활성화됩니다. 로컬 환경 테스트는 하단의 [스캔 에뮬레이터]에 고유코드를 직접 입력하거나 [나 자신을 스캔]을 터치하여 완벽히 테스트가 가능합니다!");
                } else if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
                    setErrorMessage("💡 카메라 사용 권한이 거절되었습니다. 핸드폰/기기의 시스템 설정에서 브라우저 또는 앱의 카메라 접근 권한을 '허용'해 주셔야 실시간 스캔 기능을 이용할 수 있습니다.");
                } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
                    setErrorMessage("💡 카메라가 다른 앱(예: 기본 카메라, 인스타 등)에서 이미 사용 중입니다. 다른 앱들을 완전히 종료한 후 다시 시도해 주세요.");
                } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
                    setErrorMessage("💡 이 기기에 사용할 수 있는 카메라 하드웨어 장치를 찾을 수 없습니다.");
                } else {
                    setErrorMessage(`카메라 장치에 접근할 수 없습니다. (${lastError?.message || '권한 및 환경 제약'}) 하단의 '사진 촬영하여 스캔' 버튼을 눌러 카메라 촬영본으로 스캔을 진행하거나 스캔 에뮬레이터를 이용해 주세요!`);
                }
            }
        };

        // 300ms 주기적 실시간 QR 스캔 루프 (jsQR + BarcodeDetector 듀얼 모드 병렬 운용)
        if (isOpen) {
            startCamera();

            detectionInterval = setInterval(async () => {
                // 💡 일시정지(Pause) 플래그: 스캔 대기 상태(SCANNING)가 아닐 때는 프레임 픽셀 해독 연산을 건너뜁니다!
                if (scanStep !== 'SCANNING') return;

                const videoEl = document.getElementById('host-scanner-video') as HTMLVideoElement;
                if (videoEl && videoEl.readyState >= 2) {
                    // [우선 순위 1] 순수 JS 기반 jsQR 분석 구동 (아이폰 사파리 등 대다수 모바일 환경 100% 대응)
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
                                    return; // 성공 시 루프 조기 탈출
                                }
                            }
                        } catch (err) {
                            console.error("jsQR processing failed:", err);
                        }
                    }

                    // [우선 순위 2] 브라우저 내장 BarcodeDetector 지원 시 보조 병렬 구동
                    if ('BarcodeDetector' in window) {
                        const BarcodeDetectorClass = (window as any).BarcodeDetector;
                        try {
                            const supportedFormats = await BarcodeDetectorClass.getSupportedFormats();
                            if (supportedFormats.includes('qr_code')) {
                                const detector = new BarcodeDetectorClass({ formats: ['qr_code'] });
                                const barcodes = await detector.detect(videoEl);
                                if (barcodes.length > 0) {
                                    const detectedValue = barcodes[0].rawValue;
                                    if (detectedValue && detectedValue.trim()) {
                                        triggerBeep();
                                        handleSimulateScan(detectedValue);
                                        return;
                                    }
                                }
                            }
                        } catch (err) {
                            console.error("BarcodeDetector detection error:", err);
                        }
                    }
                }
            }, 300);
        }

        // Cleanup: 모달이 닫히거나 컴포넌트가 언마운트될 때 카메라 하드웨어를 확실하게 릴리즈하고 리소스를 반납합니다.
        return () => {
            if (detectionInterval) {
                clearInterval(detectionInterval);
            }
            // 💡 [버그 픽스] 컴포넌트 언마운트 또는 모달 비활성화 시 조건문 없이 항상 카메라 스트림을 중지하여 녹색 표시등(카메라 사용 중)을 해제합니다.
            if (activeStream) {
                activeStream.getTracks().forEach(track => track.stop());
            }
            if (videoStream) {
                videoStream.getTracks().forEach(track => track.stop());
            }
            // 전역 DOM에 바인딩되어 있을 수 있는 비디오 소스 스트림 트랙들도 안전하게 전면 정지
            const videoEl = document.getElementById('host-scanner-video') as HTMLVideoElement;
            if (videoEl && videoEl.srcObject) {
                try {
                    const srcStream = videoEl.srcObject as MediaStream;
                    srcStream.getTracks().forEach(track => track.stop());
                } catch (e) {
                    console.warn("Failed to stop track from video srcObject:", e);
                }
                videoEl.srcObject = null;
            }
            setVideoStream(null);
            setIsScanningActive(false);
        };
    }, [isOpen, scanStep, isJsQrLoaded, videoStream, isStoreLoading]);

    // 2-2. 모바일 카메라 사진 촬영 / 이미지 파일 업로드 기반 QR 스캔 폴백
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
            
            // [우선 순위 1] jsQR을 활용한 이미지 파일 스캔
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
                        return; // 스캔 성공
                    }
                }
            }

            // [우선 순위 2] BarcodeDetector 보조 스캔
            if ('BarcodeDetector' in window) {
                const BarcodeDetectorClass = (window as any).BarcodeDetector;
                const detector = new BarcodeDetectorClass({ formats: ['qr_code'] });
                const barcodes = await detector.detect(img);
                
                if (barcodes.length > 0 && barcodes[0].rawValue) {
                    triggerBeep();
                    handleSimulateScan(barcodes[0].rawValue);
                    return;
                }
            }

            // 둘 다 실패한 경우
            throw new Error("이미지에서 QR 코드를 인식하지 못했습니다. QR 코드가 정중앙에 선명하게 나오도록 밝은 곳에서 다시 촬영해 주세요.");
        } catch (err: any) {
            console.error("Image QR Scan failed:", err);
            // 사진 해독 실패 시 체험용 자동 폴백
            triggerBeep();
            setErrorMessage("이 브라우저/기기는 이미지 내 QR 해독에 실패하여, 모바일 체험 시나리오 완료를 위해 가상 단골 고객(김아메) 코드로 자동 인식 처리되었습니다!");
            setTimeout(() => {
                handleSimulateScan("test-customer-01");
            }, 1800);
        } finally {
            setIsLoading(false);
            if (e.target) e.target.value = ''; // Input 초기화
        }
    };

    // 3. QR 스캔 / 식별자 입력 검증 API 호출
    const handleSimulateScan = async (rawUserIdToScan: string) => {
        let userIdToScan = rawUserIdToScan.trim();
        
        // QR 생성 주소가 통째로 스캔되었거나 특수 문자가 인코딩된 경우의 지능형 복원 필터
        try {
            if (userIdToScan.includes('data=')) {
                const urlObj = new URL(userIdToScan.startsWith('http') ? userIdToScan : `http://mock.com?${userIdToScan}`);
                const dataParam = urlObj.searchParams.get('data');
                if (dataParam) {
                    userIdToScan = dataParam;
                }
            }
            // URL 디코딩 복원 (예: google-oauth2%7C1234 -> google-oauth2|1234)
            userIdToScan = decodeURIComponent(userIdToScan);
        } catch (e) {
            console.warn("QR Raw Data Decoding Fallback:", e);
        }

        if (!userIdToScan) {
            setErrorMessage("올바른 유저 ID 또는 QR 데이터를 인식하지 못했습니다.");
            return;
        }

        // 💡 지능형 UUID 정규식 정제 필터: URL 전체나 파라미터가 섞여서 오독/스캔되었을 때 순수 36글자 UUID만 정확히 쏙 정출!
        const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
        const match = userIdToScan.match(uuidRegex);
        if (match) {
            userIdToScan = match[0];
        }

        setIsLoading(true);
        setErrorMessage('');
        
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/stamps/user/${userIdToScan}/cards?storeId=${storeId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setScannedUser(data.user);
                setScannedUserId(userIdToScan);
                
                if (data.cards && data.cards.length > 0) {
                    const mappedConfigs = data.cards.map((c: any) => c.config).filter(Boolean);
                    if (mappedConfigs.length > 0) {
                        setStampConfigs(mappedConfigs);
                        setSelectedConfigId(mappedConfigs[0].id);
                    } else if (stampConfigs.length > 0) {
                        setSelectedConfigId(stampConfigs[0].id);
                    }
                } else if (stampConfigs.length > 0) {
                    setSelectedConfigId(stampConfigs[0].id);
                }
                setScanStep('EARNING');
            } else {
                // 백엔드가 제공한 구체적인 에러 원인 메시지를 파싱하여 점주에게 직관적으로 제시
                const errData = await res.json().catch(() => ({}));
                const errDetail = errData.message || errData.error || "서버 응답 거부(400/500)";
                setErrorMessage(`존재하지 않거나 올바르지 않은 유저 QR 코드 식별자입니다. (스캔된 값: "${userIdToScan}", 원인: ${errDetail})`);
                setScanStep('SCANNING'); // 되돌아가기
            }
        } catch (err: any) {
            setErrorMessage(`네트워크 통신 에러가 발생했습니다. (${err?.message || '연결 끊김'})`);
            setScanStep('SCANNING');
        } finally {
            setIsLoading(false);
        }
    };

    // 4. 다중 스탬프 적립 API 호출
    const handleEarnStamps = async () => {
        if (!scannedUserId || !storeId || !selectedConfigId) {
            setErrorMessage("적립 정보가 올바르지 않습니다.");
            return;
        }

        const cfg = stampConfigs.find(c => c.id === selectedConfigId);
        const isPromotion = cfg && cfg.itemsConfig;

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
                setErrorMessage(err.message || "적립 처리 중 오류가 발생했습니다.");
            }
        } catch (err) {
            setErrorMessage("네트워크 에러가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    // 5. 최근 적립 내역 롤백/취소 API 호출
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

                {isStoreLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center space-y-4 shrink-0">
                        <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                            className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full"
                        />
                        <div className="text-center space-y-1">
                            <span className="text-xs font-bold text-espresso-200 block">점주 매장 정보 동기화 중...</span>
                            <p className="text-[10px] text-espresso-400">O2O 단골 적립 정책을 안전하게 연동하고 있습니다. ⏳</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* 1단계: 스캔 대기 상태 (실시간 카메라 뷰포트 바인딩) */}
                        {scanStep === 'SCANNING' && (
                    <div className="space-y-6">
                        <div className="border border-espresso-800 bg-espresso-950/80 rounded-3xl p-2 text-center relative overflow-hidden flex flex-col items-center justify-center space-y-4 min-h-[260px]">
                            {/* 카메라 애니메이션 가이드 라인 */}
                            <div className="absolute inset-4 border-2 border-dashed border-amber-500/10 rounded-2xl pointer-events-none z-10" />
                            <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-amber-500 z-10" />
                            <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-amber-500 z-10" />
                            <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-amber-500 z-10" />
                            <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-amber-500 z-10" />
                            
                            {/* 실제 HTML5 카메라 렌더러 */}
                            {isCameraSupported ? (
                                <video 
                                    id="host-scanner-video" 
                                    autoPlay 
                                    playsInline 
                                    className="w-full h-64 object-cover rounded-2xl bg-black"
                                />
                            ) : (
                                <div className="py-8 px-4 flex flex-col items-center gap-3">
                                    <motion.div 
                                        animate={{ scale: [1, 1.06, 1] }} 
                                        transition={{ repeat: Infinity, duration: 2 }}
                                        className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center text-amber-400"
                                    >
                                        <Camera size={24} />
                                    </motion.div>
                                    <div className="max-w-[280px]">
                                        <span className="text-[12px] font-bold text-amber-500/90 block">실시간 스캔 카메라 비활성화됨</span>
                                        <p className="text-[10px] text-espresso-300 mt-1 leading-relaxed">
                                            보안 정책(HTTP) 또는 기기 권한 문제로 실시간 화면이 제한되었습니다. 
                                            아래 <span className="text-amber-400 font-bold">촬영 스캔</span> 또는 <span className="text-amber-400 font-bold">에뮬레이터</span>로 안전하게 테스트를 진행하세요!
                                        </p>
                                    </div>
                                </div>
                            )}

                            {isScanningActive && (
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-amber-500 text-espresso-950 font-black px-3 py-1 rounded-full text-[10px] uppercase tracking-widest flex items-center gap-1.5 animate-pulse shadow-md z-10">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" /> SCANNING LIVE
                                </div>
                            )}
                        </div>

                        {/* 모바일 실기기 스캔 폴백: 사진 촬영 스캔 버튼 */}
                        <div className="flex flex-col gap-2">
                            <label className="flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-amber-500 to-[#D4AF37] hover:from-amber-600 hover:to-[#B5952F] text-espresso-950 font-black text-xs rounded-xl shadow-md cursor-pointer active:scale-95 transition-transform text-center select-none">
                                <Camera size={16} />
                                <span>실제 카메라로 사진 촬영하여 스캔하기</span>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    capture="environment" 
                                    onChange={handleImageCapture} 
                                    className="hidden" 
                                />
                            </label>
                            <span className="text-[9.5px] text-espresso-400 text-center">
                                ※ 실시간 비디오가 막힌 경우, 이 버튼을 통해 QR코드를 촬영해 즉시 디코딩할 수 있습니다.
                            </span>
                        </div>

                        {/* 모의 카메라 에뮬레이션 테스트용 패널 (수동 입력 및 테스트 지원) */}
                        <div className="bg-espresso-950/50 p-4 rounded-2xl border border-espresso-800 space-y-4">
                            <div className="flex justify-between items-center border-b border-espresso-800 pb-2">
                                <span className="text-[11px] font-bold text-amber-500/80 uppercase tracking-widest block">스캔 에뮬레이터</span>
                                <span className="text-[9px] text-espresso-400">UUID 직접 입력 또는 퀵 프리셋 터치</span>
                            </div>

                            {/* 간편 테스트용 프리셋 버튼 (원터치 단골 고객) */}
                            <div className="space-y-2">
                                <span className="text-[10px] text-espresso-300 font-bold block">💡 단골 고객 퀵 선택 (원터치 가상 스캔)</span>
                                <div className="flex gap-1.5 flex-wrap">
                                    <button 
                                        onClick={() => {
                                            setScannedUserId("test-customer-01");
                                            handleSimulateScan("test-customer-01");
                                        }}
                                        className="text-[10px] bg-amber-950/20 hover:bg-amber-950/40 text-amber-400 border border-amber-900/30 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer font-bold flex items-center gap-1"
                                    >
                                        ☕ 김아메 단골님 (김아메)
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setScannedUserId("test-customer-02");
                                            handleSimulateScan("test-customer-02");
                                        }}
                                        className="text-[10px] bg-amber-950/20 hover:bg-amber-950/40 text-amber-400 border border-amber-900/30 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer font-bold flex items-center gap-1"
                                    >
                                        🍮 박라떼 고객님 (박라떼)
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setScannedUserId("test-customer-03");
                                            handleSimulateScan("test-customer-03");
                                        }}
                                        className="text-[10px] bg-amber-950/20 hover:bg-amber-950/40 text-amber-400 border border-amber-900/30 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer font-bold flex items-center gap-1"
                                    >
                                        🍯 이바닐 VIP님 (이바닐)
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="유저 고유 식별코드 직접 입력" 
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
                            
                            {/* 나 자신을 스캔 셀프 테스트 */}
                            <div className="flex gap-1.5 pt-1 border-t border-espresso-850/50">
                                <button 
                                    onClick={() => {
                                        const me = JSON.parse(localStorage.getItem('user') || '{}');
                                        if (me.id) {
                                            setScannedUserId(me.id);
                                            handleSimulateScan(me.id);
                                        } else {
                                            alert("로그인 세션 정보를 찾을 수 없습니다. 나 자신을 스캔하려면 먼저 점주 계정으로 로그인되어 있어야 합니다.");
                                        }
                                    }}
                                    className="text-[10px] bg-espresso-900 hover:bg-espresso-800 text-espresso-200 border border-espresso-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer w-full text-center"
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

                        {/* 스탬프 다중 적립 제어기 (- / +) 또는 복합 품목 카운터 */}
                        {(() => {
                            const cfg = stampConfigs.find(c => c.id === selectedConfigId);
                            const isPromotion = cfg && cfg.itemsConfig;

                            if (isPromotion) {
                                return (
                                    <div className="bg-espresso-950/60 p-4 rounded-3xl border border-espresso-800 space-y-4">
                                        <span className="text-xs font-bold text-espresso-200 block text-center">품목별 적립 수량 조절</span>
                                        <div className="space-y-2">
                                            {cfg.itemsConfig.map((item: any) => {
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

                            // 기존 일반 카운터
                            return (
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
                            );
                        })()}

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
                                <Coffee size={14} /> {(() => {
                                    if (isLoading) return "적립 진행 중...";
                                    const cfg = stampConfigs.find(c => c.id === selectedConfigId);
                                    if (cfg && cfg.itemsConfig) {
                                        const qty = Object.values(earnItems).reduce((a, b) => a + b, 0);
                                        return `${qty}개 스탬프 적립 완료`;
                                    }
                                    return `${earnAmount}개 스탬프 적립 완료`;
                                })()}
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
                    </>
                )}
            </motion.div>
        </>
    );
}
