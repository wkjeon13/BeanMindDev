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
        <section className="px-4 py-2 bg-espresso-950">
            {/* 7-Day Streak Progress Bar */}
            <div className="mb-4 bg-[#18110c] rounded-2xl p-4 border border-espresso-800/80 shadow-md">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-white font-bold text-[14px] flex items-center gap-1.5">
                        <Flame className="text-amber-500 fill-amber-500/20" size={16}/> 7일 출석 챌린지
                    </h3>
                    <span className="text-amber-500 text-[12px] font-bold bg-amber-500/10 px-2 py-0.5 rounded-md">
                        {status.streak} / 7일
                    </span>
                </div>
                <div className="flex justify-between gap-1">
                    {[1,2,3,4,5,6,7].map(day => (
                        <div key={day} className="flex flex-col items-center gap-1.5 flex-1 relative group cursor-default">
                            <div className={`w-full h-2 rounded-full transition-all duration-500 ${day <= status.streak ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 'bg-espresso-800'}`} />
                            <span className={`text-[10px] font-bold ${day <= status.streak ? 'text-amber-500' : 'text-espresso-500'}`}>
                                {day === 7 ? <Star size={12} className={`inline ${day <= status.streak ? 'fill-amber-500 text-amber-500' : 'fill-espresso-800 text-espresso-800'}`} /> : day}
                            </span>
                            
                            {/* Tooltip for Day 7 */}
                            {day === 7 && (
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-amber-500 text-espresso-950 text-[10px] font-bold px-2 py-1 rounded-md shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    500 콩 잭팟!
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* 3-Cup Game Area */}
            <div className="bg-gradient-to-br from-[#1a130e] to-[#120c08] rounded-3xl p-6 border border-amber-500/20 text-center relative overflow-hidden shadow-xl">

                {!status.todayPlayed || (status.todayPlayed && selectedCup !== null && isShuffling) ? (
                    <>
                        <h4 className="text-amber-500 font-bold text-[16px] mb-10 flex items-center justify-center gap-2">
                            <Gift size={16} /> 행운의 커피 컵을 골라보세요!
                        </h4>
                        <div className="flex justify-center gap-6">
                            {[0, 1, 2].map((i) => (
                                <motion.div 
                                    key={i}
                                    whileHover={!isShuffling ? { y: -4, scale: 1.05 } : {}}
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
                                    className={`w-[65px] h-[90px] cursor-pointer relative flex flex-col items-center justify-end ${selectedCup === i ? 'scale-110 z-10' : 'opacity-100'}`}
                                >
                                    <div className={`w-[60px] h-[80px] rounded-2xl border flex items-center justify-center relative shadow-lg transition-all ${selectedCup === i ? 'bg-amber-500 border-amber-400' : 'bg-[#241a13] border-espresso-700/80'}`}>
                                        <div className="absolute top-0 w-full h-3 border-b border-espresso-950/30" />
                                        <Coffee className={`${selectedCup === i ? 'text-espresso-950' : 'text-espresso-500'} z-10 mt-2`} size={24} />
                                    </div>
                                    
                                    {selectedCup === i && <span className="absolute -top-6 text-[12px] font-bold text-amber-500 bg-espresso-900 border border-amber-500/50 rounded-full px-2 py-0.5 shadow-md z-20">PICK!</span>}
                                </motion.div>
                            ))}
                        </div>
                    </>
                ) : (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center">
                        <div className="flex justify-center gap-5 mb-8 mt-2">
                             {[0, 1, 2].map((i) => (
                                <div key={i} className={`w-[70px] flex flex-col items-center justify-end relative ${selectedCup === i ? 'scale-110 z-10' : 'opacity-50 scale-90'}`}>
                                    {selectedCup === i && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: -20 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 15 }}
                                            className="absolute -top-8 text-amber-500"
                                        >
                                            <Sparkles size={24} className="fill-amber-500" />
                                        </motion.div>
                                    )}

                                    <motion.div 
                                        initial={{ y: 30, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: i * 0.1 }}
                                        className={`w-[60px] h-[60px] rounded-full flex flex-col items-center justify-center mb-3 shadow-lg border ${selectedCup === i ? 'bg-amber-500 border-amber-400 text-espresso-950' : 'bg-[#241a13] border-espresso-700/80 text-espresso-400'}`}
                                    >
                                        <span className={`font-black ${selectedCup === i ? 'text-[22px]' : 'text-[16px]'}`}>
                                            {rewards ? rewards[i] : '?'}
                                        </span>
                                        <span className="text-[9px] font-bold opacity-80 -mt-1">BEANS</span>
                                    </motion.div>
                                    <span className={`text-[11px] font-bold rounded-full px-2 py-0.5 ${selectedCup === i ? 'bg-amber-500/20 text-amber-500' : 'bg-transparent text-espresso-500'}`}>
                                        {selectedCup === i ? '내 보상' : '아차상'}
                                    </span>
                                </div>
                            ))}
                        </div>
                        
                        <div className="bg-[#18110c] px-6 py-3 border border-espresso-800/80 rounded-2xl w-full shadow-md">
                            <h4 className="text-[16px] font-bold text-amber-500 mb-1">
                                {rewards && selectedCup !== null ? `축하합니다! +${rewards[selectedCup]} 콩` : '내일 다시 도전하세요!'}
                            </h4>
                            <p className="text-[12px] text-espresso-300">{message || '오늘의 챌린지를 완료했습니다.'}</p>
                        </div>
                    </motion.div>
                )}
            </div>
        </section>
    );
};

export default DailyRoulette;
