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
        <div className="w-full py-4">
            <div className="px-6 mb-4">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-[1px] bg-amber-500" />
                    <span className="text-[9px] font-bold tracking-[0.3em] text-amber-500 uppercase">Flash Drop</span>
                </div>
                <h3 className="text-[20px] font-serif tracking-tight text-white">게릴라 특가</h3>
            </div>
            
            <div className="relative w-full h-[220px] overflow-hidden group cursor-pointer">
                <img src={activeDrop.imageUrl} alt={activeDrop.title} className="w-full h-full object-cover transition-transform duration-[15s] group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute inset-0 p-5 flex flex-col justify-end">
                    <div className="flex items-center gap-3 mb-3">
                        <span className={`flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase px-3 py-1 border border-white/20 backdrop-blur-md rounded-full ${isLive ? 'text-red-400 bg-red-500/10' : 'text-white bg-black/40'}`}>
                            {isLive ? <Zap size={10} className="animate-pulse" /> : <Timer size={10} />}
                            {isLive ? 'Live Now' : 'Upcoming'}
                        </span>
                        <span className="text-[12px] font-serif tracking-widest text-white">{timeLeft}</span>
                    </div>
                    <h4 className="text-[22px] font-serif leading-[1.1] text-white mb-2">{activeDrop.title}</h4>
                    <p className="text-[12px] text-white/70 font-light leading-relaxed max-w-[85%] mb-4 line-clamp-2">{activeDrop.description}</p>
                    
                    {isLive && (
                        <button className="self-start text-[10px] font-bold tracking-[0.2em] uppercase text-black bg-white px-5 py-2.5 hover:bg-amber-400 transition-colors">
                            Participate
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FlashDropBanner;
