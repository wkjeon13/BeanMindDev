import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, ExternalLink } from 'lucide-react';
import { API_BASE, getDeviceCountryCode } from '../utils/apiConfig';
import { useTranslation } from 'react-i18next';

export default function SystemNoticePopup() {
    const { t, i18n } = useTranslation();
    const [notices, setNotices] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const fetchNotices = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/community/system-notices?countryCode=${getDeviceCountryCode()}`);
                if (res.ok) {
                    const data = await res.json();
                    
                    const todayDateString = new Date().toDateString();
                    // Filter out notices that the user has opted to hide for today
                    const visibleNotices = data.filter((notice: any) => {
                        const hiddenUntil = localStorage.getItem(`hide_notice_${notice.id}`);
                        return hiddenUntil !== todayDateString;
                    });
                    
                    setNotices(visibleNotices);
                }
            } catch (err) {
                console.error("Failed to fetch system notices", err);
            }
        };
        fetchNotices();
    }, []);

    const handleClose = () => {
        if (currentIndex < notices.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            setNotices([]);
        }
    };

    const handleHideToday = () => {
        if (notices[currentIndex]) {
            localStorage.setItem(`hide_notice_${notices[currentIndex].id}`, new Date().toDateString());
            handleClose();
        }
    };

    const getImageUrl = (imageString: string) => {
        if (!imageString) return '';
        try {
            const parsed = JSON.parse(imageString);
            if (Array.isArray(parsed) && parsed.length > 0) {
                const url = parsed[0];
                return url.startsWith('http') || url.startsWith('data:') ? url : `${API_BASE}${url}`;
            }
        } catch (e) {
            // Not JSON
        }
        return imageString.startsWith('http') || imageString.startsWith('data:') ? imageString : `${API_BASE}${imageString}`;
    };

    const currentNotice = notices[currentIndex];
    const isEn = i18n.language?.startsWith('en') || getDeviceCountryCode() === 'US';
    const rawImage = currentNotice ? ((isEn && currentNotice.imageEn) ? currentNotice.imageEn : currentNotice.image) : null;
    const imageUrl = rawImage ? getImageUrl(rawImage) : null;
    const rawContent = currentNotice ? ((isEn && currentNotice.contentEn) ? currentNotice.contentEn : currentNotice.content) : '';
    const contentText = (rawContent || '').trim();
    const hasContent = contentText.length > 0;
    const linkUrl = currentNotice ? (currentNotice.recipeData || currentNotice.linkUrl || null) : null;

    const handleImageClick = () => {
        if (!linkUrl) return;
        if (linkUrl.startsWith('http://') || linkUrl.startsWith('https://')) {
            window.open(linkUrl, '_blank');
        } else {
            window.location.href = linkUrl;
        }
    };

    return (
        <AnimatePresence>
            {notices.length > 0 && currentNotice && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6"
                >
                    <motion.div 
                        key={currentNotice.id}
                        initial={{ scale: 0.98, opacity: 0, y: 15 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.98, opacity: 0, y: -15 }}
                        transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
                        className="relative w-full max-w-[340px] max-h-[85dvh] bg-[#1a1a1a] border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col shadow-2xl overflow-hidden"
                    >
                        {/* X 닫기 버튼 */}
                        <button 
                            onClick={handleClose}
                            className="absolute top-3.5 right-3.5 text-zinc-300 hover:text-white transition-colors p-1.5 bg-black/40 hover:bg-black/60 rounded-full z-20 backdrop-blur-md border border-white/10"
                            title={t('system_notice.btn_close', '닫기')}
                        >
                            <X size={16} />
                        </button>

                        {/* Header (텍스트가 없어도 깔끔한 헤더 표출) */}
                        <div className="flex items-center justify-center gap-2 mb-3 shrink-0 select-none">
                            <Bell className="w-4 h-4 text-white stroke-[1.5]" />
                            <h3 className="font-semibold text-white text-[15px] tracking-tight">Notice</h3>
                        </div>

                        {/* Content Body */}
                        <div className="flex-1 overflow-y-auto no-scrollbar pb-3 flex flex-col items-center justify-center">
                            {imageUrl && (
                                <div 
                                    onClick={handleImageClick}
                                    className={`w-full rounded-xl overflow-hidden bg-black/50 flex justify-center relative ${hasContent ? 'mb-4 max-h-[220px]' : 'max-h-[60vh]'} ${linkUrl ? 'cursor-pointer group' : ''}`}
                                >
                                    <img 
                                        src={imageUrl} 
                                        alt="notice" 
                                        className={`w-full h-auto ${hasContent ? 'object-cover max-h-[220px]' : 'object-contain max-h-[60vh]'} transition-transform duration-200 ${linkUrl ? 'group-hover:scale-[1.02]' : ''}`} 
                                    />
                                    {linkUrl && (
                                        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm border border-white/20 opacity-80 group-hover:opacity-100 transition-opacity">
                                            <span>자세히 보기</span>
                                            <ExternalLink size={10} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 텍스트 내용이 있을 경우에만 렌더링 */}
                            {hasContent && (
                                <div className="text-center w-full px-1">
                                    <p className="text-white whitespace-pre-wrap text-[14px] font-semibold leading-relaxed mb-1.5">
                                        {contentText.split('\n')[0]}
                                    </p>
                                    {contentText.split('\n').length > 1 && (
                                        <p className="text-[#a1a1aa] whitespace-pre-wrap text-[12.5px] leading-relaxed font-normal">
                                            {contentText.split('\n').slice(1).join('\n')}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="flex items-center gap-2.5 shrink-0 mt-auto pt-2 border-t border-white/10">
                            <button 
                                onClick={handleHideToday}
                                className="flex-1 py-2.5 text-[13px] font-medium text-zinc-300 border border-white/20 rounded-lg hover:bg-white/5 transition-colors focus:outline-none"
                            >
                                {t('system_notice.btn_hide_today', '다시 보지 않기')}
                            </button>
                            <button 
                                onClick={handleClose}
                                className="flex-1 py-2.5 text-[13px] font-bold text-black bg-white rounded-lg hover:bg-zinc-200 transition-colors focus:outline-none"
                            >
                                {t('system_notice.btn_close', '닫기')}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
