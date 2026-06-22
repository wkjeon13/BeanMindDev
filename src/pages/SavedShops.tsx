import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Store, MapPin, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_BASE } from '../utils/apiConfig';

export default function SavedShops() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [bookmarks, setBookmarks] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchBookmarks = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return navigate('/profile', { replace: true });

            const response = await fetch(`${API_BASE}/api/users/bookmarks`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setBookmarks(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBookmarks();
    }, [navigate]);

    const handleRemoveBookmark = async (storeId: string) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_BASE}/api/users/bookmarks/${storeId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // Update local state by filtering out
            setBookmarks(prev => prev.filter(b => b.store.id !== storeId));
        } catch (err) {
            console.error('Failed to remove bookmark', err);
        }
    };

    return (
        <div className="h-full w-full bg-espresso-950 flex flex-col font-sans">
            <header className="px-6 py-4 pt-safe flex items-center bg-espresso-900 border-b border-coffee-100 shrink-0 sticky top-0 z-10">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-espresso-100 hover:bg-espresso-800 rounded-full transition-colors active:scale-95">
                    <ChevronLeft size={28} />
                </button>
                <h1 className="font-serif font-bold text-xl text-espresso-50 ml-2">{t('saved.title')}</h1>
            </header>

            <div className="flex-1 overflow-y-auto p-4 pb-24 grid grid-cols-2 gap-3 content-start">
                {isLoading ? (
                    <div className="col-span-2 flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coffee-800"></div>
                    </div>
                ) : bookmarks.length === 0 ? (
                    <div className="col-span-2 flex flex-col items-center justify-center text-center py-20 opacity-60">
                        <Store size={48} className="text-coffee-300 mb-4" />
                        <p className="font-medium text-coffee-600" dangerouslySetInnerHTML={{ __html: t('saved.empty_message') }}></p>
                    </div>
                ) : (
                    <AnimatePresence>
                        {bookmarks.map((b, idx) => {
                            const shop = b.store;
                            const imageMedia = shop.media?.find((m: any) => m.type === 'IMAGE');
                            let imageSrc = imageMedia ? imageMedia.url : 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=800';

                            if (imageSrc && imageSrc.startsWith('/')) {
                                imageSrc = `${API_BASE}${imageSrc}`;
                            } else if (imageSrc && imageSrc.includes('/uploads/')) {
                                imageSrc = `${API_BASE}${imageSrc.substring(imageSrc.indexOf('/uploads/'))}`;
                            }

                            return (
                                <motion.div
                                    key={b.id}
                                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="bg-espresso-900 rounded-2xl overflow-hidden border border-coffee-100 shadow-sm flex flex-col relative group cursor-pointer hover:shadow-md transition-all active:scale-[0.98] h-full"
                                    onClick={() => {
                                        if (shop.websiteUrl) {
                                            // Ensure URL has http protocol
                                            const url = shop.websiteUrl.startsWith('http') ? shop.websiteUrl : `https://${shop.websiteUrl}`;
                                            window.open(url, '_blank', 'noopener,noreferrer');
                                        } else {
                                            alert(t('saved.no_url'));
                                        }
                                    }}
                                >
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveBookmark(shop.id);
                                        }}
                                        className="absolute top-2 right-2 w-8 h-8 bg-espresso-900/80 backdrop-blur border border-white rounded-full flex items-center justify-center z-10 text-rose-500 shadow-sm active:scale-90 transition-transform"
                                    >
                                        <Heart size={16} fill="currentColor" />
                                    </button>
                                    <div className="aspect-square bg-espresso-800 w-full overflow-hidden shrink-0">
                                        <img 
                                            src={imageSrc} 
                                            alt={shop.name} 
                                            className="w-full h-full object-cover" 
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=800';
                                            }}
                                        />
                                    </div>
                                    <div className="p-3 flex-1 flex flex-col justify-between">
                                        <div>
                                            <h3 className="font-bold text-espresso-50 text-sm line-clamp-1 group-hover:text-espresso-200 transition-colors">{shop.name}</h3>
                                            <p className="text-[11px] font-medium text-espresso-300 mt-1 line-clamp-2 leading-tight">{shop.shortDesc}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}
