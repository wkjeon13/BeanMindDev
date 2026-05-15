import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Coffee, CheckCircle, Flame, Star, Coins, Sparkles } from 'lucide-react';
import { API_BASE } from '../../utils/apiConfig';
import { useTranslation } from 'react-i18next';

const DailyRoulette = () => {
    const { t } = useTranslation();
    const [status, setStatus] = useState<{streak: number, todayPlayed: boolean} | null>(null);
    const [isShuffling, setIsShuffling] = useState(false);
    const [selectedCup, setSelectedCup] = useState<number | null>(null);
    const [rewards, setRewards] = useState<number[] | null>(null);
    const [message, setMessage] = useState('');
    const [isHidden, setIsHidden] = useState(false);

    useEffect(() => {
        const fetchStatus = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;
            try {
                const res = await fetch(`${API_BASE}/api/retention/daily-status`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.status === 401 || res.status === 403) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.reload();
                    return;
                }
                const data = await res.json();
                setStatus(data);
                if (data.todayPlayed) {
                    setIsHidden(true);
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchStatus();
    }, []);

    const handlePick = async (index: number) => {
        if (isShuffling || selectedCup !== null) return;
        setIsShuffling(true);
        setSelectedCup(index);
        
        // Suspense animation!
        await new Promise(r => setTimeout(r, 1200)); 

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/retention/daily-checkin`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ cupIndex: index })
            });
            const data = await res.json();
            
            if (res.ok) {
                const cupCount = status.cupCount || 3;
                const fakes = data.fakes || [];
                
                const finalRewards = Array(cupCount).fill(0);
                finalRewards[index] = data.beansWon;
                
                const cupIndexes = Array.from({ length: cupCount }, (_, i) => i);
                const emptySlots = cupIndexes.filter(i => i !== index);
                
                emptySlots.forEach((slotIndex, i) => {
                    finalRewards[slotIndex] = fakes[i] || 10;
                });
                
                setRewards(finalRewards);
                setStatus(prev => prev ? { ...prev, streak: data.streak, todayPlayed: true } : { streak: data.streak, todayPlayed: true, cupCount: 3 });
                setMessage(data.message);
                setTimeout(() => setIsHidden(true), 3500);
            } else {
                setMessage(data.error);
                setStatus({ streak: data.streak || 0, todayPlayed: true });
                setTimeout(() => setIsHidden(true), 3500);
            }
        } catch (e) {
            setMessage(t('home.roulette_error', '네트워크 오류가 발생했습니다.'));
        } finally {
            setIsShuffling(false);
        }
    };

    if (!status || isHidden || (status as any).disabled) return null;

    return (
        <section className="w-full py-4 px-4">
            <div className="bg-gradient-to-b from-espresso-800/60 to-espresso-950/80 border border-espresso-700 rounded-3xl p-4 shadow-xl relative overflow-hidden">
                {/* Subtle background glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-1 bg-amber-500/20 blur-xl" />

                {/* 7-Day Streak Progress Bar */}
                <div className="mb-6 relative z-10">
                    <div className="flex justify-between items-end mb-2">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-[2px] bg-amber-500 rounded-full" />
                            <h3 className="text-[15px] font-bold tracking-tight text-espresso-50">{t('home.roulette_title', '7일 출석 챌린지')}</h3>
                        </div>
                        <span className="text-[10px] font-black tracking-widest text-espresso-400">{status.streak} / 7 DAYS</span>
                    </div>
                    <div className="flex justify-between gap-1">
                        {[1,2,3,4,5,6,7].map(day => (
                            <div key={day} className="flex flex-col items-center gap-1.5 flex-1 relative group cursor-default">
                                <div className={`w-full h-[3px] rounded-full transition-all duration-700 ${day <= status.streak ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 'bg-espresso-800'}`} />
                                <span className={`text-[11px] font-bold ${day <= status.streak ? 'text-amber-400' : 'text-espresso-600'}`}>
                                    {day === 7 ? <Star size={10} className={`inline ${day <= status.streak ? 'fill-amber-500 text-amber-500' : 'fill-transparent text-espresso-600'}`} /> : day}
                                </span>
                                {day === 7 && (
                                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                        500 Beans
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3-Cup Game Area */}
                <div className="text-center relative z-10">
                    {!status.todayPlayed || (status.todayPlayed && selectedCup !== null && isShuffling) ? (
                        <>
                            <h4 className="text-[14px] font-medium text-espresso-200 mb-3 tracking-wide">
                                {t('home.roulette_subtitle', '행운의 커피 컵을 골라보세요.')}
                            </h4>
                            <div className="flex justify-center gap-2 sm:gap-4 md:gap-6 flex-nowrap">
                                {Array.from({ length: status.cupCount || 3 }, (_, i) => i).map((i) => (
                                    <motion.div 
                                        key={i}
                                        whileHover={!isShuffling ? { y: -3 } : {}}
                                        whileTap={!isShuffling ? { scale: 0.95 } : {}}
                                        onClick={() => handlePick(i)}
                                        animate={
                                            isShuffling 
                                            ? { 
                                                y: selectedCup === i ? -6 : [0, -3, 0], 
                                                transition: { repeat: selectedCup === i ? 0 : Infinity, duration: 0.4, delay: i * 0.1 } 
                                              } 
                                            : {}
                                        }
                                        className={`w-[80px] xs:w-[90px] md:w-[100px] h-[82px] cursor-pointer relative flex flex-col items-center justify-end ${selectedCup === i ? 'scale-110 z-10' : 'opacity-90 hover:opacity-100 transition-opacity'}`}
                                    >
                                        <div className={`w-full h-full rounded-lg flex items-center justify-center relative transition-all duration-300 shadow-inner ${selectedCup === i ? 'bg-gradient-to-b from-amber-400 to-amber-600 border border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'bg-espresso-800 border border-espresso-700 hover:border-amber-500/50 hover:bg-espresso-700/80'}`}>
                                            <div className="absolute top-0 w-full h-1 border-b border-white/5 rounded-t-lg bg-gradient-to-b from-white/10 to-transparent" />
                                            <Coffee className={`${selectedCup === i ? 'text-black' : 'text-amber-500/80'} z-10 mt-1 drop-shadow-md md:w-10 md:h-10`} size={28} strokeWidth={1.5} />
                                        </div>
                                        
                                        {selectedCup === i && <span className="absolute -top-3 text-[7px] tracking-[0.2em] font-black uppercase text-black bg-amber-400 rounded-sm px-1 py-0.5 z-20 shadow-md">Pick</span>}
                                    </motion.div>
                                ))}
                            </div>
                        </>
                ) : (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="flex flex-col items-center">
                        <div className="flex justify-center gap-2 sm:gap-4 md:gap-6 mb-4 mt-1 flex-nowrap">
                             {Array.from({ length: status.cupCount || 3 }, (_, i) => i).map((i) => (
                                <div key={i} className={`w-[80px] xs:w-[90px] md:w-[100px] flex flex-col items-center justify-end relative ${selectedCup === i ? 'scale-110 z-10' : 'opacity-40 scale-90'}`}>
                                    {selectedCup === i && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: -10 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 15 }}
                                            className="absolute -top-5 text-amber-500"
                                        >
                                            <Sparkles size={16} className="fill-amber-500" strokeWidth={1} />
                                        </motion.div>
                                    )}

                                    <motion.div 
                                        initial={{ y: 10, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: i * 0.1, duration: 0.6 }}
                                        className={`w-[45px] h-[45px] rounded-full flex flex-col items-center justify-center mb-2 border shadow-inner ${selectedCup === i ? 'bg-gradient-to-br from-amber-400 to-amber-600 border-amber-300 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'bg-espresso-800 border-espresso-700 text-espresso-400'}`}
                                    >
                                        <span className={`font-black tracking-tight ${selectedCup === i ? 'text-[18px]' : 'text-[13px]'}`}>
                                            {rewards ? rewards[i] : '?'}
                                        </span>
                                    </motion.div>
                                    <span className={`text-[8px] font-black tracking-widest uppercase ${selectedCup === i ? 'text-amber-500' : 'text-espresso-500'}`}>
                                        {selectedCup === i ? 'Reward' : 'Miss'}
                                    </span>
                                </div>
                            ))}
                        </div>
                        
                        <div className="w-full pt-4 border-t border-espresso-800">
                            <h4 className="text-[15px] font-bold text-espresso-50 mb-0.5">
                                {rewards && selectedCup !== null ? t('home.roulette_win', '축하합니다. +{{amount}} Beans', { amount: rewards[selectedCup] }) : t('home.roulette_fail', '내일 다시 도전하세요.')}
                            </h4>
                        </div>
                    </motion.div>
                )}
                </div>
            </div>
        </section>
    );
};

export default DailyRoulette;
