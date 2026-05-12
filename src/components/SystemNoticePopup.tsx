import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell } from 'lucide-react';
import { API_BASE } from '../utils/apiConfig';
import { useTranslation } from 'react-i18next';

export default function SystemNoticePopup() {
    const { i18n } = useTranslation();
    const [notices, setNotices] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const fetchNotices = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/community/system-notices`);
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

    return (
        <AnimatePresence>
            {notices.length > 0 && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
                >
                    <motion.div 
                        key={notices[currentIndex].id}
                        initial={{ scale: 0.98, opacity: 0, y: 15 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.98, opacity: 0, y: -15 }}
                        transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
                        className="w-full max-w-[320px] bg-[#1a1a1a] border border-white/10 rounded-2xl p-5 flex flex-col shadow-2xl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-center gap-2 mb-4 shrink-0 select-none">
                            <Bell className="w-5 h-5 text-white stroke-[1.5]" />
                            <h3 className="font-semibold text-white text-[16px] tracking-tight">Notice</h3>
                        </div>

                        {/* Content Body */}
                        <div className="flex-1 overflow-y-auto no-scrollbar pb-6 flex flex-col items-center">
                            {((i18n.language === 'en' && notices[currentIndex].imageEn) ? notices[currentIndex].imageEn : notices[currentIndex].image) && (
                                <div className="w-full rounded-lg overflow-hidden bg-[#2a2a2a] flex justify-center mb-5">
                                    <img 
                                        src={getImageUrl((i18n.language === 'en' && notices[currentIndex].imageEn) ? notices[currentIndex].imageEn : notices[currentIndex].image)} 
                                        alt="notice" 
                                        className="w-full h-auto object-cover max-h-[160px]" 
                                    />
                                </div>
                            )}
                            <div className="text-center w-full px-2">
                                <p className="text-white whitespace-pre-wrap text-[15px] font-semibold leading-relaxed mb-2">
                                    {((i18n.language === 'en' && notices[currentIndex].contentEn) ? notices[currentIndex].contentEn : notices[currentIndex].content).split('\n')[0]}
                                </p>
                                <p className="text-[#a1a1aa] whitespace-pre-wrap text-[13px] leading-relaxed font-normal">
                                    {((i18n.language === 'en' && notices[currentIndex].contentEn) ? notices[currentIndex].contentEn : notices[currentIndex].content).split('\n').length > 1 ? ((i18n.language === 'en' && notices[currentIndex].contentEn) ? notices[currentIndex].contentEn : notices[currentIndex].content).split('\n').slice(1).join('\n') : ''}
                                </p>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="flex items-center gap-3 shrink-0 mt-auto">
                            <button 
                                onClick={handleHideToday}
                                className="flex-1 py-3 text-[14px] font-medium text-white border border-white/20 rounded-lg hover:bg-white/5 transition-colors focus:outline-none"
                            >
                                다시 보지 않기
                            </button>
                            <button 
                                onClick={handleClose}
                                className="flex-1 py-3 text-[14px] font-bold text-black bg-white rounded-lg hover:bg-zinc-200 transition-colors focus:outline-none"
                            >
                                닫기
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
