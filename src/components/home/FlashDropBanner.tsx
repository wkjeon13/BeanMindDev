import React, { useState, useEffect } from 'react';
import { Timer, Zap } from 'lucide-react';
import { API_BASE } from '../../utils/apiConfig';
import { useTranslation } from 'react-i18next';

const FlashDropBanner = () => {
    const { t, i18n } = useTranslation();
    const [drops, setDrops] = useState<any[]>([]);
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const countryCode = localStorage.getItem('region') || 'KR';
        fetch(`${API_BASE}/api/retention/flash-drops?countryCode=${countryCode}`)
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
                setTimeLeft(`${t('home.flash_drop_open', '오픈까지')} ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
            } else if (now >= start && now < end) {
                const diff = end - now;
                const h = Math.floor(diff / (1000 * 60 * 60));
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((diff % (1000 * 60)) / 1000);
                setTimeLeft(`${t('home.flash_drop_end', '종료까지')} ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
            } else {
                setTimeLeft(t('home.flash_drop_ended', '종료됨'));
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [drops]);

    if (!drops.length) return null;

    const activeDrop = drops[0];
    const isLive = new Date() >= new Date(activeDrop.startTime) && new Date() < new Date(activeDrop.endTime);

    const isEn = i18n.language === 'en';
    const displayTitle = isEn && activeDrop.titleEn ? activeDrop.titleEn : activeDrop.title;
    const displayDesc = isEn && activeDrop.descriptionEn ? activeDrop.descriptionEn : activeDrop.description;
    const displayBadge = isEn && activeDrop.badgeTextEn ? activeDrop.badgeTextEn : (activeDrop.badgeText || t('home.flash_drop_badge', 'Flash Drop : 게릴라 특가'));

    let formattedUrl = activeDrop.linkUrl || '';
    if (formattedUrl && formattedUrl !== '#' && !formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = `https://${formattedUrl}`;
    }

    let formattedImageUrl = activeDrop.imageUrl || 'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?auto=format&fit=crop&w=800&q=80';
    if (activeDrop.imageUrl && activeDrop.imageUrl.startsWith('/')) {
        formattedImageUrl = `${API_BASE}${activeDrop.imageUrl}`;
    }

    const handleBannerClick = () => {
        if (formattedUrl && formattedUrl !== '#') {
            window.open(formattedUrl, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <div className="w-full px-4 py-1">
            <div 
                className="relative w-full h-[110px] rounded-2xl overflow-hidden group cursor-pointer shadow-lg border border-espresso-800/60"
                onClick={handleBannerClick}
            >
                <img src={formattedImageUrl} alt={displayTitle} className="w-full h-full object-cover transition-transform duration-[15s] group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
                <div className="absolute inset-0 px-5 py-3 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className={`flex items-center gap-1 text-[8px] font-bold tracking-widest uppercase px-2 py-0.5 border border-white/20 backdrop-blur-md rounded-full ${isLive ? 'text-red-400 bg-red-500/10' : 'text-white bg-black/40'}`}>
                            {isLive ? <Zap size={8} className="animate-pulse" /> : <Timer size={8} />}
                            {isLive ? 'Live Now' : 'Upcoming'}
                        </span>
                        <span className="text-[10px] font-serif tracking-widest text-amber-500">{displayBadge}</span>
                    </div>
                    
                    <h4 className="text-[16px] font-serif leading-[1.1] text-white mb-1 truncate">{displayTitle}</h4>
                    <div className="flex items-center justify-between">
                        <p className="text-[11px] text-white/70 font-light max-w-[70%] truncate">{displayDesc}</p>
                        <span className="text-[12px] font-serif tracking-widest text-white">{timeLeft}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FlashDropBanner;
