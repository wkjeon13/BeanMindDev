import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Coffee, CheckCircle, Flame, Star, Coins, Sparkles } from 'lucide-react';
import { API_BASE } from '../../utils/apiConfig';

const DailyRoulette = () => {
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
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (res.ok) {
                // Determine fake rewards for other cups
                const allRewards = [10, 30, 50, 80, 100];
                const fakes = allRewards.filter(r => r !== data.beansWon).sort(() => 0.5 - Math.random()).slice(0, 2);
                
                const finalRewards = [0, 0, 0];
                finalRewards[index] = data.beansWon;
                
                const emptySlots = [0, 1, 2].filter(i => i !== index);
                finalRewards[emptySlots[0]] = fakes[0];
                finalRewards[emptySlots[1]] = fakes[1];
                
                setRewards(finalRewards);
                setStatus({ streak: data.streak, todayPlayed: true });
                setMessage(data.message);
                setTimeout(() => setIsHidden(true), 3500);
            } else {
                setMessage(data.error);
                setStatus({ streak: data.streak || 0, todayPlayed: true });
                setTimeout(() => setIsHidden(true), 3500);
            }
        } catch (e) {
            setMessage('네트워크 오류가 발생했습니다.');
        } finally {
            setIsShuffling(false);
        }
    };

    if (!status || isHidden) return null;

    return (
        <section className="w-full py-8">
            {/* 7-Day Streak Progress Bar */}
            <div className="px-6 mb-12">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-[1px] bg-amber-500" />
                    <span className="text-[10px] font-bold tracking-[0.3em] text-amber-500 uppercase">Challenge</span>
                </div>
                <div className="flex justify-between items-end mb-6">
                    <h3 className="text-[24px] font-serif tracking-tight text-white">7일 출석</h3>
                    <span className="text-[14px] font-serif text-white/50">{status.streak} / 7 Days</span>
                </div>
                <div className="flex justify-between gap-1">
                    {[1,2,3,4,5,6,7].map(day => (
                        <div key={day} className="flex flex-col items-center gap-2 flex-1 relative group cursor-default">
                            <div className={`w-full h-[2px] transition-all duration-700 ${day <= status.streak ? 'bg-amber-500' : 'bg-white/10'}`} />
                            <span className={`text-[12px] font-serif ${day <= status.streak ? 'text-amber-500' : 'text-white/30'}`}>
                                {day === 7 ? <Star size={12} className={`inline ${day <= status.streak ? 'fill-amber-500 text-amber-500' : 'fill-transparent text-white/30'}`} /> : day}
                            </span>
                            {day === 7 && (
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-bold tracking-widest uppercase px-3 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    500 Beans
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* 3-Cup Game Area */}
            <div className="px-6 text-center relative">
                {!status.todayPlayed || (status.todayPlayed && selectedCup !== null && isShuffling) ? (
                    <>
                        <h4 className="text-[18px] font-serif text-white mb-12 tracking-wide font-light">
                            행운의 커피 컵을 골라보세요.
                        </h4>
                        <div className="flex justify-center gap-8">
                            {[0, 1, 2].map((i) => (
                                <motion.div 
                                    key={i}
                                    whileHover={!isShuffling ? { y: -10 } : {}}
                                    whileTap={!isShuffling ? { scale: 0.95 } : {}}
                                    onClick={() => handlePick(i)}
                                    animate={
                                        isShuffling 
                                        ? { 
                                            y: selectedCup === i ? -20 : [0, -10, 0], 
                                            transition: { repeat: selectedCup === i ? 0 : Infinity, duration: 0.4, delay: i * 0.1 } 
                                          } 
                                        : {}
                                    }
                                    className={`w-[70px] h-[100px] cursor-pointer relative flex flex-col items-center justify-end ${selectedCup === i ? 'scale-110 z-10' : 'opacity-80 hover:opacity-100 transition-opacity'}`}
                                >
                                    <div className={`w-full h-full border flex items-center justify-center relative transition-all duration-500 ${selectedCup === i ? 'bg-amber-500 border-amber-400' : 'bg-transparent border-white/20 hover:border-white/50 backdrop-blur-md'}`}>
                                        <div className="absolute top-0 w-full h-3 border-b border-white/10" />
                                        <Coffee className={`${selectedCup === i ? 'text-black' : 'text-white/60'} z-10 mt-2`} size={28} strokeWidth={1} />
                                    </div>
                                    
                                    {selectedCup === i && <span className="absolute -top-6 text-[10px] tracking-[0.2em] font-bold uppercase text-black bg-white px-3 py-1 z-20">Pick</span>}
                                </motion.div>
                            ))}
                        </div>
                    </>
                ) : (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="flex flex-col items-center">
                        <div className="flex justify-center gap-8 mb-12 mt-4">
                             {[0, 1, 2].map((i) => (
                                <div key={i} className={`w-[70px] flex flex-col items-center justify-end relative ${selectedCup === i ? 'scale-110 z-10' : 'opacity-40 scale-90'}`}>
                                    {selectedCup === i && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: -20 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 15 }}
                                            className="absolute -top-8 text-amber-500"
                                        >
                                            <Sparkles size={24} className="fill-amber-500" strokeWidth={1} />
                                        </motion.div>
                                    )}

                                    <motion.div 
                                        initial={{ y: 30, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: i * 0.1, duration: 0.6 }}
                                        className={`w-[60px] h-[60px] rounded-full flex flex-col items-center justify-center mb-4 border ${selectedCup === i ? 'bg-amber-500 border-amber-400 text-black' : 'bg-transparent border-white/20 text-white/40 backdrop-blur-md'}`}
                                    >
                                        <span className={`font-serif ${selectedCup === i ? 'text-[24px]' : 'text-[18px]'}`}>
                                            {rewards ? rewards[i] : '?'}
                                        </span>
                                    </motion.div>
                                    <span className={`text-[10px] font-bold tracking-widest uppercase ${selectedCup === i ? 'text-amber-500' : 'text-white/40'}`}>
                                        {selectedCup === i ? 'Reward' : 'Miss'}
                                    </span>
                                </div>
                            ))}
                        </div>
                        
                        <div className="w-full pt-8 border-t border-white/10">
                            <h4 className="text-[20px] font-serif text-white mb-2">
                                {rewards && selectedCup !== null ? `축하합니다. +${rewards[selectedCup]} Beans` : '내일 다시 도전하세요.'}
                            </h4>
                            <p className="text-[13px] text-white/50 font-light tracking-wide">{message || '오늘의 챌린지를 완료했습니다.'}</p>
                        </div>
                    </motion.div>
                )}
            </div>
        </section>
    );
};

export default DailyRoulette;
