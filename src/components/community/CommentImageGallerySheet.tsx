import React, { useState, useEffect, useMemo } from 'react';
import { X, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { API_BASE } from '../../utils/apiConfig';
import MediaRenderer from './MediaRenderer';
import { useTranslation } from 'react-i18next';

interface GalleryProps {
    postId: string;
    isOpen: boolean;
    onClose: () => void;
}

interface GroupedImages {
    author: {
        id: string;
        nickname: string;
        profileImageUrl: string | null;
    };
    items: {
        commentId: string;
        content: string;
        createdAt: string;
        urls: string[];
    }[];
}

export default function CommentImageGallerySheet({ postId, isOpen, onClose }: GalleryProps) {
  const { t } = useTranslation(['translation']);
    const [groupedData, setGroupedData] = useState<GroupedImages[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    const allImages = useMemo(() => {
        return groupedData.flatMap(group => group.items.flatMap(item => item.urls))
            .map(url => url.startsWith('/') ? `${API_BASE}${url}` : url);
    }, [groupedData]);

    useEffect(() => {
        if (!isOpen) return;
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const url = `${API_BASE}/api/community/posts/${postId}/comment-images`;
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    setGroupedData(data);
                }
            } catch (error) {
                console.error("Failed to fetch comment images", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [postId, isOpen]);

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-[250] flex flex-col justify-end">
                <div className="absolute inset-0 bg-espresso-950/60 backdrop-blur-sm" onClick={onClose} />
                <div className="relative bg-espresso-900 rounded-t-3xl w-full max-h-[85vh] flex flex-col border-t border-espresso-700 shadow-2xl pb-safe animation-slide-up">
                    {/* Drag Handle & Header */}
                    <div className="flex items-center justify-center pt-3 pb-2 sticky top-0 bg-espresso-900 rounded-t-3xl z-10">
                        <div className="w-12 h-1.5 bg-espresso-700 rounded-full mb-3" />
                    </div>
                    
                    <div className="flex items-center justify-between px-5 pb-3 border-b border-espresso-700 sticky top-[28px] bg-espresso-900 z-10">
                        <h3 className="text-espresso-50 font-bold text-lg flex items-center gap-2">
                            <ImageIcon size={20} className="text-amber-500" />{t('community_gallery.title', '댓글 사진/영상 모아보기')}</h3>
                        <button onClick={onClose} className="p-2 -mr-2 text-espresso-200 hover:text-espresso-50 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="overflow-y-auto px-5 py-4 space-y-6 min-h-[50vh]">
                        {isLoading ? (
                            <p className="text-center text-espresso-300 py-10 animate-pulse">{t('community_gallery.loading', '사진을 불러오는 중...')}</p>
                        ) : groupedData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-espresso-300">
                                <ImageIcon size={40} className="mb-3 opacity-20" />
                                <p>{t('community_gallery.no_media', '댓글에 첨부된 미디어가 없습니다.')}</p>
                            </div>
                        ) : (
                            groupedData.map((group, groupIdx) => (
                                <div key={group.author.id || groupIdx} className="bg-espresso-900 border border-espresso-700 rounded-2xl p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-espresso-800 shrink-0 border border-espresso-600">
                                            <img 
                                                src={group.author.profileImageUrl || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&q=80'} 
                                                alt="avatar" 
                                                className="w-full h-full object-cover" 
                                            />
                                        </div>
                                        <span className="font-bold text-espresso-50">{group.author.nickname}</span>
                                        <span className="text-xs text-espresso-300 ml-auto">
                                            {t('community_gallery.total_count', '총 {{count}}장', {count: group.items.reduce((acc, curr) => acc + curr.urls.length, 0)})}
                                        </span>
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-2">
                                        {group.items.flatMap(item => item.urls).map((url, imgIdx) => {
                                            const globalUrl = url.startsWith('/') ? `${API_BASE}${url}` : url;
                                            const globalIndex = allImages.indexOf(globalUrl);
                                            return (
                                                <div 
                                                    key={imgIdx} 
                                                    className="aspect-[4/5] bg-espresso-800 rounded-lg overflow-hidden cursor-pointer active:scale-95 transition-transform"
                                                    onClick={() => setSelectedIndex(globalIndex)}
                                                >
                                                    <MediaRenderer src={url} className="w-full h-full object-cover" />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Fullscreen Image Modal - Independent Layer */}
            {selectedIndex !== null && allImages[selectedIndex] && (
                <div 
                    className="fixed inset-0 z-[300] bg-espresso-950/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setSelectedIndex(null)}
                >
                    <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedIndex(null); }}
                        className="absolute top-6 right-6 p-3 bg-espresso-900/10 text-espresso-50 rounded-full hover:bg-espresso-900/20 transition-colors z-10"
                    >
                        <X size={24} />
                    </button>

                    {/* Previous Button */}
                    {selectedIndex > 0 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedIndex(selectedIndex - 1);
                            }}
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-espresso-950/50 hover:bg-espresso-950/70 rounded-full text-espresso-50 z-20 backdrop-blur-sm transition-colors shadow-2xl"
                        >
                            <ChevronLeft size={32} />
                        </button>
                    )}

                    {/* Next Button */}
                    {selectedIndex < allImages.length - 1 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedIndex(selectedIndex + 1);
                            }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-espresso-950/50 hover:bg-espresso-950/70 rounded-full text-espresso-50 z-20 backdrop-blur-sm transition-colors shadow-2xl"
                        >
                            <ChevronRight size={32} />
                        </button>
                    )}

                    <MediaRenderer 
                        src={allImages[selectedIndex]} 
                        className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-lg shadow-2xl" 
                    />

                    {/* Image Counter Indicator */}
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-espresso-950/60 backdrop-blur-md px-4 py-1.5 rounded-full text-espresso-50 font-medium text-sm tracking-widest shadow-xl">
                        {selectedIndex + 1} / {allImages.length}
                    </div>
                </div>
            )}
        </>
    );
}
