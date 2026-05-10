import React, { useState } from 'react';
import { Share2, ArrowRight, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { WEEKLY_MBTI_DATA } from '../../data/weeklyMbti';

const WeeklyTasteTest = ({ config }: { config?: any }) => {
    const [step, setStep] = useState(-1); // -1: Banner, 0~N: Questions, N+1: Result
    const [answers, setAnswers] = useState<string[]>([]);

    const handleStart = () => {
        setStep(0);
        setAnswers([]);
    };

    const handleReset = () => {
        setStep(-1);
        setAnswers([]);
    };

    const handleAnswer = (trait: string) => {
        const newAnswers = [...answers, trait];
        setAnswers(newAnswers);
        
        if (step < WEEKLY_MBTI_DATA.questions.length - 1) {
            setStep(step + 1);
        } else {
            setStep(WEEKLY_MBTI_DATA.questions.length);
        }
    };

    const handleShare = async () => {
        const title = "이번 주 내 커피 취향은?";
        const text = `나의 이번 주 추천 커피는 '${resultData.name}' 입니다!`;
        if (navigator.share) {
            try {
                await navigator.share({ title, text, url: window.location.href });
            } catch (err) {
                console.log('Share failed', err);
            }
        } else {
            alert('공유하기 기능을 지원하지 않는 브라우저입니다.');
        }
    };

    // Calculate Result
    let resultKey = 'default';
    if (step === WEEKLY_MBTI_DATA.questions.length && answers.length > 0) {
        resultKey = answers[0]; // Simplified logic: just use the first trait
    }
    const resultData = (WEEKLY_MBTI_DATA.results as any)[resultKey] || WEEKLY_MBTI_DATA.results['default'];

    return (
        <section className="w-full">
            <AnimatePresence mode="wait">
                {step === -1 && (
                    <motion.div 
                        key="banner"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        className="relative w-full h-[140px] cursor-pointer flex flex-col justify-center px-6 group overflow-hidden"
                        onClick={handleStart}
                    >
                        <div className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] group-hover:scale-110" style={{ backgroundImage: `url(${config?.imageUrl || 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=800&q=80'})` }} />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/30" />
                        
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-4 h-[1px] bg-amber-500" />
                                <span className="text-[8px] font-bold tracking-[0.2em] uppercase text-amber-500 block">{config?.badgeText || 'Taste Test'}</span>
                            </div>
                            <h3 className="text-[20px] font-serif leading-tight text-white mb-1">{config?.title || WEEKLY_MBTI_DATA.title}</h3>
                            <p className="text-[11px] text-white/70 font-light max-w-[80%] mb-4 leading-relaxed line-clamp-1">{config?.subtitle || '간단한 3가지 질문으로 어울리는 커피를 찾아요.'}</p>
                            
                            <div className="flex items-center gap-2">
                                <span className="text-white text-[9px] font-bold tracking-widest uppercase group-hover:text-amber-400 transition-colors">Start</span>
                                <div className="w-5 h-5 rounded-full border border-white/30 flex items-center justify-center group-hover:border-amber-400 transition-colors">
                                    <ArrowRight className="text-white group-hover:text-amber-400" size={10} />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {step >= 0 && step < WEEKLY_MBTI_DATA.questions.length && (
                    <motion.div 
                        key={`q-${step}`}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        className="bg-espresso-900 rounded-2xl p-5 border border-espresso-800"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-amber-500 text-[12px] font-bold">Q{step + 1}.</span>
                            <span className="text-espresso-400 text-[10px]">{step + 1} / {WEEKLY_MBTI_DATA.questions.length}</span>
                        </div>
                        <h3 className="text-[16px] font-bold text-espresso-50 mb-6 leading-snug">
                            {WEEKLY_MBTI_DATA.questions[step].text}
                        </h3>
                        <div className="flex flex-col gap-3">
                            {WEEKLY_MBTI_DATA.questions[step].options.map((opt, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => handleAnswer(opt.trait)}
                                    className="w-full text-left p-4 rounded-xl bg-espresso-950 border border-espresso-800 hover:border-amber-500 hover:bg-amber-500/10 transition-colors text-[14px] text-espresso-100 font-medium"
                                >
                                    {opt.text}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}

                {step === WEEKLY_MBTI_DATA.questions.length && (
                    <motion.div 
                        key="result"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-espresso-900 rounded-2xl overflow-hidden border border-amber-500/30 shadow-lg"
                    >
                        <div className="h-40 bg-espresso-800 relative">
                            <img src={resultData.imageUrl} alt={resultData.name} className="w-full h-full object-cover opacity-80" />
                            <div className="absolute inset-0 bg-gradient-to-t from-espresso-900 to-transparent" />
                            <div className="absolute top-3 right-3 text-white/50 text-[10px]">Your Coffee of the Week</div>
                        </div>
                        <div className="p-5 text-center -mt-8 relative z-10">
                            <div className="inline-block bg-amber-500 text-espresso-950 text-[10px] font-black px-2 py-1 rounded-sm mb-2 shadow-md">
                                {resultData.title}
                            </div>
                            <h3 className="text-[22px] font-black text-white mb-2">{resultData.name}</h3>
                            <p className="text-[13px] text-espresso-200 leading-relaxed mb-5 px-2">
                                {resultData.desc}
                            </p>
                            <div className="flex gap-2">
                                <button onClick={handleShare} className="flex-1 py-3 bg-espresso-800 hover:bg-espresso-700 text-white rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-colors border border-espresso-700">
                                    <Share2 size={16} /> 공유하기
                                </button>
                                <button onClick={handleReset} className="w-12 h-12 bg-espresso-800 hover:bg-espresso-700 text-espresso-300 rounded-xl flex items-center justify-center transition-colors border border-espresso-700">
                                    <RefreshCcw size={18} />
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
