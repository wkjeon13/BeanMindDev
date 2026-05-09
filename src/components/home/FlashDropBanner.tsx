import React, { useState, useEffect } from 'react';
import { Timer, Zap } from 'lucide-react';
import { API_BASE } from '../../utils/apiConfig';

const FlashDropBanner = () => {
    const [drops, setDrops] = useState<any[]>([]);
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        fetch(`${API_BASE}/api/retention/flash-drops`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    setDrops(data);
                }
            })
            .catch(console.error);
    }, []);

    useEffect(() => {
        if (!drops.length) return;

        const activeDrop = drops[0];
        const timer = setInterval(() => {
            const now = new Date().getTime();
            const start = new Date(activeDrop.startTime).getTime();
            const end = new Date(activeDrop.endTime).getTime();

            if (now < start) {
                const diff = start - now;
                const h = Math.floor(diff / (1000 * 60 * 60));
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((diff % (1000 * 60)) / 1000);
                setTimeLeft(`오픈까지 ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
            } else if (now >= start && now < end) {
                const diff = end - now;
                const h = Math.floor(diff / (1000 * 60 * 60));
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((diff % (1000 * 60)) / 1000);
                setTimeLeft(`종료까지 ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
            } else {
                setTimeLeft('종료됨');
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [drops]);

    if (!drops.length) return null;

    const activeDrop = drops[0];
    const isLive = new Date() >= new Date(activeDrop.startTime) && new Date() < new Date(activeDrop.endTime);

    return (
        <div className="px-4 py-2 bg-espresso-950">
            <div className={`relative rounded-xl overflow-hidden bg-[#111111] border-2 ${isLive ? 'border-amber-500 shadow-[4px_4px_0px_#f59e0b]' : 'border-espresso-700 shadow-[4px_4px_0px_#2a1a10]'}`}>
                <img src={activeDrop.imageUrl} alt={activeDrop.title} className="w-full h-[120px] object-cover opacity-30 grayscale mix-blend-screen" />
                <div className="absolute inset-0 p-4 flex flex-col justify-center bg-black/40">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 border-2 ${isLive ? 'bg-black text-red-500 border-red-500 animate-pulse' : 'bg-black text-espresso-400 border-espresso-700'}`}>
                            {isLive ? <Zap size={10} /> : <Timer size={10} />}
                            {isLive ? 'LIVE' : 'UPCOMING'}
                        </span>
                        <span className="text-[13px] font-black text-amber-500 font-mono tracking-wider">{timeLeft}</span>
                    </div>
                    <h4 className="text-[16px] font-black text-white mb-1 line-clamp-1">{activeDrop.title}</h4>
                    <p className="text-[11px] text-espresso-300 line-clamp-1 max-w-[70%] font-bold">{activeDrop.description}</p>
                    
                    {isLive && (
                        <button className="absolute bottom-4 right-4 bg-amber-500 text-black text-[12px] font-black px-4 py-1.5 border-2 border-amber-500 hover:bg-amber-400 transition-colors shadow-[2px_2px_0px_#000]">
                            선착순 참여
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FlashDropBanner;
