import React, { useState, useEffect } from 'react';
import { Share2, ArrowRight, RefreshCcw, Store, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { WEEKLY_MBTI_DATA } from '../../data/weeklyMbti';
import { API_BASE } from '../../utils/apiConfig';

interface OptionDto {
  id: number;
  optionLetter: string;
  contentKo: string;
  contentEn: string;
}

interface QuestionDto {
  id: number;
  questionNumber: number;
  contentKo: string;
  contentEn: string;
  options: OptionDto[];
}

interface ResultDto {
  id: string;
  resultNameKo: string;
  resultNameEn: string;
  descriptionKo: string;
  descriptionEn: string;
}

interface TasteTest {
  id: string;
  title: string;
  titleEn?: string;
  subtitle: string;
  subtitleEn?: string;
  imageUrl: string;
  isActive: boolean;
  questions: QuestionDto[];
}

interface ShopResponse {
  id: string;
  name: string;
  address: string;
  mainImageUrl?: string;
  isHostRegistered?: boolean;
  matchRate: number;
  signatureBean?: string;
}

interface SubmissionResponse {
  result: ResultDto;
  recommendedShops: ShopResponse[];
}

const WeeklyTasteTest = ({ config }: { config?: any }) => {
    const { i18n, t } = useTranslation();
    const isEn = i18n.language === 'en';

    // State Management
    const [testData, setTestData] = useState<TasteTest | null>(null);
    const [step, setStep] = useState(-1); // -1: Banner, 0~N: Questions, N+1: Result loading/showing
    const [answers, setAnswers] = useState<number[]>([]);
    const [submissionResult, setSubmissionResult] = useState<SubmissionResponse | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchActiveTest();
    }, [config]);

    const fetchActiveTest = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/taste-test/active`);
            if (res.ok) {
                const data = await res.json();
                setTestData(data);
            }
        } catch (err) {
            console.warn('DB Taste Test 로드 실패. Fallback 하드코딩 데이터를 로드합니다.', err);
        }
    };

    const handleStart = () => {
        setStep(0);
        setAnswers([]);
        setSubmissionResult(null);
    };

    const getBgImage = () => {
        const url = testData?.imageUrl || config?.imageUrl;
        if (!url) {
            return 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=800&q=80';
        }
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    const handleReset = () => {
        setStep(-1);
        setAnswers([]);
        setSubmissionResult(null);
    };

    const handleAnswer = async (optionId: number) => {
        const newAnswers = [...answers, optionId];
        setAnswers(newAnswers);

        const totalQuestions = testData ? testData.questions.length : WEEKLY_MBTI_DATA.questions.length;
        
        if (step < totalQuestions - 1) {
            setStep(step + 1);
        } else {
            // 마지막 질문 클릭 시 결과 주입 및 서버 통신
            setStep(totalQuestions);
            await submitAnswers(newAnswers);
        }
    };

    const submitAnswers = async (finalAnswers: number[]) => {
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const headers: any = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`${API_BASE}/api/taste-test/submit`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ optionIds: finalAnswers })
            });

            if (res.ok) {
                const json = await res.json();
                setSubmissionResult(json);
            }
        } catch (err) {
            console.error('취향 분석 통신 오류', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleShare = async () => {
        const resultName = submissionResult 
            ? (isEn ? submissionResult.result.resultNameEn : submissionResult.result.resultNameKo)
            : WEEKLY_MBTI_DATA.results['default'].name;

        const title = t('tastetest.share_title', '이번 주 내 커피 취향은?');
        const text = t('tastetest.share_desc', `나의 이번 주 추천 커피 성향은 '${resultName}' 입니다!`);
        if (navigator.share) {
            try {
                await navigator.share({ title, text, url: window.location.href });
            } catch (err) {
                console.log('Share failed', err);
            }
        } else {
            alert(t('tastetest.share_fallback', '링크 복사 또는 주소창의 링크를 친구에게 공유해 보세요!'));
        }
    };

    // Fallback UI helper if API fails completely
    const getFallbackResult = () => {
        return WEEKLY_MBTI_DATA.results['default'];
    };

    const bannerTitle = testData 
        ? (isEn && testData.titleEn ? testData.titleEn : testData.title) 
        : (config?.title || WEEKLY_MBTI_DATA.title);

    const bannerSubtitle = testData 
        ? (isEn && testData.subtitleEn ? testData.subtitleEn : testData.subtitle) 
        : (config?.subtitle || (isEn ? 'Find your matching coffee taste with simple questions.' : '간단한 질문으로 나의 커피 취향을 매칭해 보세요.'));
    const totalQuestionsCount = testData ? testData.questions.length : WEEKLY_MBTI_DATA.questions.length;

    return (
        <section className="w-full">
            <AnimatePresence mode="wait">
                {/* 1. 배너 화면 */}
                {step === -1 && (
                    <motion.div 
                        key="banner"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        className="relative w-full h-[140px] cursor-pointer flex flex-col justify-center px-6 group overflow-hidden rounded-xl shadow-md"
                        onClick={handleStart}
                    >
                        <div className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] group-hover:scale-110" style={{ backgroundImage: `url(${getBgImage()})` }} />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/30" />
                        
                        <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles size={12} className="text-amber-500 animate-pulse" />
                            <span className="text-[9px] font-black tracking-[0.25em] uppercase text-amber-500 block">Taste Test</span>
                          </div>
                          <h3 className="text-[18px] font-black leading-tight text-white mb-1">{bannerTitle}</h3>
                          <p className="text-[11px] text-white/70 font-light max-w-[85%] mb-4 leading-relaxed line-clamp-1">{bannerSubtitle}</p>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-white text-[9px] font-bold tracking-widest uppercase group-hover:text-amber-400 transition-colors">Start</span>
                            <div className="w-5 h-5 rounded-full border border-white/30 flex items-center justify-center group-hover:border-amber-400 transition-colors">
                              <ArrowRight className="text-white group-hover:text-amber-400" size={10} />
                            </div>
                          </div>
                        </div>
                    </motion.div>
                )}

                {/* 2. 퀴즈 진행 문항 */}
                {step >= 0 && step < totalQuestionsCount && (
                    <motion.div 
                        key={`q-${step}`}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        className="bg-espresso-900 rounded-2xl p-5 border border-espresso-800"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-amber-500 text-[12px] font-black">Q{step + 1}.</span>
                            <span className="text-espresso-400 text-[10px]">{step + 1} / {totalQuestionsCount}</span>
                        </div>
                        <h3 className="text-[16px] font-bold text-espresso-50 mb-6 leading-snug">
                            {testData ? (isEn ? testData.questions[step].contentEn : testData.questions[step].contentKo) : WEEKLY_MBTI_DATA.questions[step].text}
                        </h3>
                        <div className="flex flex-col gap-3">
                            {testData ? (
                                testData.questions[step].options.map((opt) => (
                                    <button 
                                        key={opt.id}
                                        onClick={() => handleAnswer(opt.id)}
                                        className="w-full text-left p-4 rounded-xl bg-espresso-950 border border-espresso-800 hover:border-amber-500 hover:bg-amber-500/10 transition-colors text-[13px] text-espresso-100 font-medium"
                                    >
                                        {isEn ? opt.contentEn : opt.contentKo}
                                    </button>
                                ))
                            ) : (
                                WEEKLY_MBTI_DATA.questions[step].options.map((opt, idx) => (
                                    <button 
                                        key={idx}
                                        // Fallback dummy option id
                                        onClick={() => handleAnswer(idx)}
                                        className="w-full text-left p-4 rounded-xl bg-espresso-950 border border-espresso-800 hover:border-amber-500 hover:bg-amber-500/10 transition-colors text-[13px] text-espresso-100 font-medium"
                                    >
                                        {opt.text}
                                    </button>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}

                {/* 3. 분석 대기 로딩 */}
                {step === totalQuestionsCount && isSubmitting && (
                    <motion.div 
                        key="submitting"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-espresso-900 rounded-2xl p-8 border border-espresso-800 flex flex-col items-center justify-center text-center space-y-4"
                    >
                        <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                        <p className="text-sm font-bold text-espresso-200">{t('tastetest.analyzing', '기분과 취향의 매칭율을 계산하는 중...')}</p>
                    </motion.div>
                )}

                {/* 4. 최종 취향 분석 결과 화면 및 매치 카페 추천 목록 */}
                {step === totalQuestionsCount && !isSubmitting && (
                    <motion.div 
                        key="result"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-espresso-900 rounded-2xl overflow-hidden border border-amber-500/30 shadow-lg flex flex-col space-y-4 pb-4"
                    >
                        <div className="h-36 bg-espresso-800 relative">
                            <img src={getBgImage()} alt="Result Banner" className="w-full h-full object-cover opacity-60" />
                            <div className="absolute inset-0 bg-gradient-to-t from-espresso-900 to-transparent" />
                            <div className="absolute top-4 left-4 inline-block bg-amber-500 text-espresso-950 text-[10px] font-black px-2 py-0.5 rounded-sm shadow-md">
                                {t('tastetest.result_badge', 'MY COFFEE STYLE')}
                            </div>
                        </div>

                        <div className="px-5 text-center -mt-12 relative z-10">
                            <h3 className="text-[20px] font-black text-white drop-shadow">
                                {submissionResult 
                                    ? (isEn ? submissionResult.result.resultNameEn : submissionResult.result.resultNameKo)
                                    : getFallbackResult().name}
                            </h3>
                            <p className="text-[12px] text-espresso-200 leading-relaxed mt-3 mb-5 px-1">
                                {submissionResult 
                                    ? (isEn ? submissionResult.result.descriptionEn : submissionResult.result.descriptionKo)
                                    : getFallbackResult().desc}
                            </p>

                            {/* Recommended Shops Section */}
                            {submissionResult && submissionResult.recommendedShops && submissionResult.recommendedShops.length > 0 && (
                                <div className="border-t border-espresso-800/80 pt-4 pb-2 text-left">
                                    <h4 className="text-[11px] font-black text-amber-500 tracking-wider mb-3 flex items-center gap-1.5">
                                        <Store size={12} /> {t('tastetest.recommendation_title', '취향 매칭 상위 매장 추천')}
                                    </h4>
                                    
                                    {/* Horizontal Scroll Layout for matched shops */}
                                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x">
                                        {submissionResult.recommendedShops.map((shop) => (
                                            <div 
                                                key={shop.id}
                                                onClick={() => {
                                                    // Redirect to shop detail (Home route/modal can listen or redirect)
                                                    window.location.href = `/map?shopId=${shop.id}`;
                                                }}
                                                className="w-48 bg-espresso-950 border border-espresso-800 rounded-xl overflow-hidden flex flex-col shrink-0 snap-start cursor-pointer hover:border-amber-500/40 transition-colors"
                                            >
                                                <div className="h-20 bg-espresso-900 relative">
                                                    {shop.mainImageUrl ? (
                                                        <img src={`${API_BASE}${shop.mainImageUrl}`} alt={shop.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-espresso-600 bg-espresso-900">
                                                            <Store size={18} />
                                                        </div>
                                                    )}
                                                    <div className="absolute top-2 right-2 bg-amber-500 text-espresso-950 font-black text-[9px] px-1.5 py-0.5 rounded">
                                                        {shop.matchRate}% Match
                                                    </div>
                                                </div>
                                                <div className="p-2.5 flex flex-col justify-between flex-1">
                                                    <div>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[12px] font-bold text-white truncate max-w-[85%]">{shop.name}</span>
                                                            {shop.isHostRegistered && (
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="호스트 매장" />
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-espresso-400 truncate mt-0.5">{shop.address}</p>
                                                    </div>
                                                    {shop.signatureBean && (
                                                        <p className="text-[9px] text-amber-500/80 font-medium mt-1 truncate">Bean: {shop.signatureBean}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2 mt-4 border-t border-espresso-800/80 pt-4">
                                <button onClick={handleShare} className="flex-1 py-3.5 bg-espresso-800 hover:bg-espresso-700 text-white rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 transition-colors border border-espresso-700">
                                    <Share2 size={15} /> {t('tastetest.share_btn', '공유하기')}
                                </button>
                                <button onClick={handleReset} className="w-12 h-12 bg-espresso-800 hover:bg-espresso-700 text-espresso-300 rounded-xl flex items-center justify-center transition-colors border border-espresso-700">
                                    <RefreshCcw size={16} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
};

export default WeeklyTasteTest;
