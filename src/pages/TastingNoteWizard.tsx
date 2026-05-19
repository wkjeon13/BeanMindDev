import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Upload, ArrowRight, Wand2, CheckCircle, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../utils/apiConfig';
import { useTranslation } from 'react-i18next';

export default function TastingNoteWizard() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    
    // Form States
    const [coffeeName, setCoffeeName] = useState('');
    const [brand, setBrand] = useState('');
    const [rawNote, setRawNote] = useState('');
    const [photo, setPhoto] = useState<string | null>(null);
    
    // AI Result State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiResult, setAiResult] = useState<any>(null);

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhoto(reader.result as string);
                setStep(2);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAnalyze = async () => {
        if (!coffeeName || !rawNote) {
            alert('커피 이름과 감상 평을 입력해주세요.');
            return;
        }

        setIsAnalyzing(true);
        setStep(3);

        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE}/api/ai-features/tasting-note/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ coffeeName, brand, rawNote })
            });

            if (res.ok) {
                const data = await res.json();
                setAiResult(data);
                setStep(4);
            } else if (res.status === 401 || res.status === 403) {
                alert('로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.dispatchEvent(new Event('authStateChanged'));
                navigate('/register'); // or root depending on app flow
            } else {
                alert('AI 분석에 실패했습니다.');
                setStep(2);
            }
        } catch (error) {
            alert('오류가 발생했습니다.');
            setStep(2);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSave = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE}/api/ai-features/tasting-note`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    coffeeName,
                    brand,
                    rawUserNote: rawNote,
                    aiTranslatedNote: aiResult.aiTranslatedNote,
                    acidity: aiResult.acidity,
                    sweetness: aiResult.sweetness,
                    bitterness: aiResult.bitterness,
                    body: aiResult.body,
                    aroma: aiResult.aroma || 3,
                    flavorTags: aiResult.flavorTags
                })
            });

            if (res.ok) {
                alert('테이스팅 노트가 저장되었습니다!');
                navigate('/profile');
            } else if (res.status === 401 || res.status === 403) {
                alert('로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.dispatchEvent(new Event('authStateChanged'));
                navigate('/');
            } else {
                alert('저장에 실패했습니다.');
            }
        } catch (error) {
            alert('오류가 발생했습니다.');
        }
    };

    return (
        <div 
            className="min-h-[100dvh] bg-black text-white p-4 pb-[50vh] md:pb-8"
            style={{ paddingTop: 'max(env(safe-area-inset-top, 20px), 20px)' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <button onClick={() => navigate(-1)} className="p-2 bg-zinc-900 rounded-full hover:bg-zinc-800 transition">
                    <X className="w-5 h-5 text-gray-400" />
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-transparent">
                        AI 테이스팅 노트
                    </h1>
                    <div className="text-xs text-gray-500 font-medium tracking-widest mt-1">
                        STEP {step} OF 4
                    </div>
                </div>
                <div className="w-9" />
            </div>

            <AnimatePresence mode="wait">
                {step === 1 && (
                    <motion.div
                        key="step1"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="flex flex-col items-center justify-center h-[70vh]"
                    >
                        <div className="w-24 h-24 bg-gradient-to-br from-amber-400/20 to-yellow-600/20 rounded-full flex items-center justify-center mb-6">
                            <Camera className="w-10 h-10 text-amber-400" />
                        </div>
                        <h2 className="text-2xl font-bold mb-3 text-center">방금 마신 커피,<br/>어떻게 기억하고 싶나요?</h2>
                        <p className="text-gray-400 text-center mb-8 max-w-xs">
                            커피의 사진을 찍거나 갤러리에서 선택해주세요. 사진 없이 기록할 수도 있습니다.
                        </p>
                        
                        <div className="flex gap-4 w-full max-w-sm">
                            <label className="flex-1 py-4 px-4 bg-amber-500 text-black font-bold rounded-2xl cursor-pointer text-center hover:bg-amber-400 transition flex items-center justify-center gap-2">
                                <Upload className="w-5 h-5" />
                                <span>사진 업로드</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                            </label>
                            <button onClick={() => setStep(2)} className="flex-1 py-4 px-4 bg-zinc-800 text-white font-medium rounded-2xl hover:bg-zinc-700 transition">
                                사진 없이 넘기기
                            </button>
                        </div>
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div
                        key="step2"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="flex flex-col max-w-md mx-auto"
                    >
                        <h2 className="text-2xl font-bold mb-6">커피에 대해 편하게 적어주세요</h2>
                        
                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">원두 또는 메뉴 이름*</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50"
                                    placeholder="ex) 에티오피아 예가체프 G1"
                                    value={coffeeName}
                                    onChange={e => setCoffeeName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">카페 또는 브랜드 (선택)</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50"
                                    placeholder="ex) 블루보틀 성수"
                                    value={brand}
                                    onChange={e => setBrand(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">자유로운 감상 평*</label>
                                <textarea 
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 min-h-[120px] resize-none"
                                    placeholder="ex) 처음엔 레몬처럼 찌르는 신맛이 났는데 마시다보니 초콜릿 달달한 맛이 남아서 좋았어. 바디감이 무겁지 않아서 식후에 딱임!"
                                    value={rawNote}
                                    onChange={e => setRawNote(e.target.value)}
                                    onFocus={(e) => {
                                        // Scroll the element into view slightly above the bottom with a delay
                                        setTimeout(() => {
                                            e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }, 300);
                                    }}
                                />
                            </div>
                        </div>

                        <button 
                            onClick={handleAnalyze}
                            className="w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-bold rounded-2xl hover:opacity-90 transition flex items-center justify-center gap-2"
                        >
                            <Wand2 className="w-5 h-5" />
                            <span>AI 분석 시작하기</span>
                        </button>
                    </motion.div>
                )}

                {step === 3 && (
                    <motion.div
                        key="step3"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        className="flex flex-col items-center justify-center h-[60vh] text-center"
                    >
                        <div className="relative mb-8">
                            <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full animate-pulse" />
                            <Wand2 className="w-16 h-16 text-amber-400 animate-bounce relative z-10" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">리뷰를 커핑 노트로 변환 중...</h2>
                        <p className="text-gray-400">당신의 표현을 전문적인 큐그레이더의 언어로 다듬고 있습니다.</p>
                    </motion.div>
                )}

                {step === 4 && aiResult && (
                    <motion.div
                        key="step4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col max-w-md mx-auto"
                    >
                        <div className="bg-zinc-900/80 border border-amber-500/30 rounded-3xl p-6 mb-6 backdrop-blur-sm">
                            <div className="flex items-center gap-3 justify-center mb-6">
                                <CheckCircle className="w-6 h-6 text-emerald-400" />
                                <h2 className="text-xl font-bold text-white">분석 완료</h2>
                            </div>
                            
                            <div className="mb-6">
                                <h3 className="text-amber-400 font-semibold text-sm mb-2 uppercase tracking-wider">AI Tasting Note</h3>
                                <p className="text-gray-200 leading-relaxed italic border-l-2 border-amber-500/50 pl-4 py-1">
                                    "{aiResult.aiTranslatedNote}"
                                </p>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-amber-400 font-semibold text-sm mb-3 uppercase tracking-wider">Taste Profile</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { label: '산미', value: aiResult.acidity },
                                        { label: '단맛', value: aiResult.sweetness },
                                        { label: '쓴맛', value: aiResult.bitterness },
                                        { label: '바디감', value: aiResult.body },
                                    ].map(item => (
                                        <div key={item.label} className="bg-black/50 p-3 rounded-xl border border-white/5">
                                            <div className="text-sm text-gray-400 mb-1">{item.label}</div>
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4, 5].map(n => (
                                                    <div 
                                                        key={n} 
                                                        className={`h-1.5 flex-1 rounded-full ${n <= Math.round(item.value) ? 'bg-amber-500' : 'bg-white/10'}`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {aiResult.flavorTags && (
                                <div>
                                    <h3 className="text-amber-400 font-semibold text-sm mb-3 uppercase tracking-wider">Flavor Tags</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {aiResult.flavorTags.split(',').map((tag: string, i: number) => (
                                            <span key={i} className="px-3 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-full text-sm">
                                                {tag.trim()}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={handleSave}
                            className="w-full py-4 bg-amber-500 text-black font-bold rounded-2xl hover:bg-amber-400 transition"
                        >
                            로스팅 다이어리에 추가하기
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
