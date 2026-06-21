import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { MessageSquare, Coffee, Image as ImageIcon, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_BASE, getApiUrl } from '../utils/apiConfig';
import { useNavigate } from 'react-router-dom';

interface StoreCoffeeTalkSectionProps {
    storeId: string;
    onCloseModal: () => void;
}

export default function StoreCoffeeTalkSection({ storeId, onCloseModal }: StoreCoffeeTalkSectionProps) {
    const { t } = useTranslation(['translation']);
    const navigate = useNavigate();
    const [posts, setPosts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const res = await fetch(getApiUrl(`/api/community/posts?storeId=${storeId}`));
                if (res.ok) {
                    const data = await res.json();
                    setPosts(data);
                }
            } catch (error) {
                console.error("Failed to fetch coffee talk posts for store", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (storeId) {
            fetchPosts();
        }
    }, [storeId]);

    if (isLoading || posts.length === 0) return null;

    return (
        <section className="pt-6 border-t border-coffee-100 mt-2">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Coffee size={20} className="text-coffee-600" />
                    <h4 className="text-[17px] font-serif font-bold text-espresso-50">
                        {t('store_detail.title_coffee_talk', '이 매장을 이야기한 커피톡')}
                        <span className="text-coffee-400 text-[15px] ml-1">({posts.length})</span>
                    </h4>
                </div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar -mx-2 px-2">
                {posts.map(post => {
                    const images = post.imageUrls ? JSON.parse(post.imageUrls) : [];
                    const hasImage = images.length > 0;
                    const isTastingNote = post.category === 'TASTING';
                    
                    return (
                        <div 
                            key={post.id}
                            onClick={() => {
                                onCloseModal();
                                navigate(`/community#${post.id}`);
                            }}
                            className="w-[220px] shrink-0 bg-espresso-900 border border-coffee-100 rounded-2xl overflow-hidden shadow-sm flex flex-col active:scale-95 transition-transform"
                            style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                            {/* Image Thumbnail or Text Fallback */}
                            <div className="h-[120px] w-full bg-espresso-950 relative">
                                {hasImage ? (
                                    <img src={images[0]} alt="Post" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-coffee-300 p-4 text-center">
                                        <MessageSquare size={24} className="mb-2 opacity-50" />
                                        <p className="text-[11px] font-medium line-clamp-2 italic">
                                            "{post.content}"
                                        </p>
                                    </div>
                                )}
                                {isTastingNote && (
                                    <div className="absolute top-2 left-2 bg-espresso-950/60 backdrop-blur-md px-2 py-1 rounded border border-white/20 flex items-center gap-1">
                                        <span className="text-[10px] font-bold text-espresso-50 tracking-widest uppercase">Tasting Note</span>
                                    </div>
                                )}
                                {hasImage && images.length > 1 && (
                                    <div className="absolute top-2 right-2 bg-espresso-950/60 backdrop-blur-md px-1.5 py-0.5 rounded flex items-center gap-1 text-espresso-50">
                                        <ImageIcon size={10} />
                                        <span className="text-[10px] font-bold">+{images.length - 1}</span>
                                    </div>
                                )}
                            </div>

                            {/* Post Info */}
                            <div className="p-3 flex flex-col flex-1">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <img 
                                        src={post.author?.profileImageUrl ? (post.author.profileImageUrl.startsWith('http') ? post.author.profileImageUrl : `${API_BASE}${post.author.profileImageUrl}`) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author?.nickname}`} 
                                        alt="Author" 
                                        className="w-4 h-4 rounded-full border border-espresso-700"
                                    />
                                    <span className="text-[11px] font-bold text-espresso-200 truncate">{post.author?.nickname}</span>
                                </div>
                                <p className="text-[12px] text-espresso-50 font-medium line-clamp-2 leading-snug flex-1">
                                    {hasImage ? post.content : (isTastingNote ? t('store_detail.fallback_tasting', '원두에 대한 상세한 테이스팅 노트가 작성되었습니다.') : t('store_detail.fallback_free', '매장에 대한 자유로운 이야기가 있습니다.'))}
                                </p>
                                <div className="mt-2 text-[10px] text-coffee-400 font-medium flex items-center justify-between">
                                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                                    <div className="flex items-center gap-1 text-coffee-300">
                                        <span>{t('store_detail.btn_more', '더보기')}</span>
                                        <ChevronRight size={12} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
