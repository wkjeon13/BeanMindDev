import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, MessageSquare, Coffee, Star, Heart, FileText, ChevronRight, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '../utils/apiConfig';
import CommentSheet from '../components/community/CommentSheet';
import ShopDetailModal from '../components/ShopDetailModal';
import MediaRenderer from '../components/community/MediaRenderer';

interface ActivityItem {
    id: string;
    type: 'post' | 'comment' | 'review' | 'like' | 'follow';
    createdAt: string;
    content: string;
    imageUrl?: string | null;
    targetId: string;
    extra?: {
        earnedBeans?: number;
        storeName?: string;
        lat?: number;
        lng?: number;
        parentContent?: string;
        rating?: number;
        authorName?: string;
    };
}

const ActivityHistory: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'post' | 'comment' | 'review' | 'like' | 'follow'>('all');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    // Inline Post Viewing State
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
    const [selectedPostData, setSelectedPostData] = useState<any>(null);
    const [isFetchingPost, setIsFetchingPost] = useState(false);

    // Inline Shop Viewing State
    const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
    const [selectedShopData, setSelectedShopData] = useState<any>(null);
    const [isFetchingShop, setIsFetchingShop] = useState(false);

    const tabs = [
        { id: 'all', label: t('activity.tab_all', '전체') },
        { id: 'post', label: t('activity.tab_post', '게시글') },
        { id: 'comment', label: t('activity.tab_comment', '댓글') },
        { id: 'review', label: t('activity.tab_review', '리뷰') },
        { id: 'like', label: t('activity.tab_like', '좋아요') },
        { id: 'follow', label: t('activity.tab_follow', '팔로우') },
    ] as const;

    const fetchActivities = async (currentPage: number, currentFilter: string, isLoadMore = false) => {
        try {
            if (!isLoadMore) setIsLoading(true);
            const token = localStorage.getItem('token') || localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/users/me/activity?type=${currentFilter}&page=${currentPage}&limit=20`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                if (isLoadMore) {
                    setActivities(prev => [...prev, ...data.activities]);
                } else {
                    setActivities(data.activities);
                }
                setHasMore(data.pagination.page < data.pagination.totalPages);
            }
        } catch (error) {
            console.error("Fetch activities error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setPage(1);
        fetchActivities(1, filter, false);
    }, [filter]);

    const handleLoadMore = () => {
        if (hasMore && !isLoading) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchActivities(nextPage, filter, true);
        }
    };

    const formatDate = (dateString: string) => {
        const d = new Date(dateString);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    };

    const renderActivityIcon = (type: string) => {
        switch (type) {
            case 'post': return <FileText size={16} className="text-amber-500" />;
            case 'comment': return <MessageSquare size={16} className="text-blue-400" />;
            case 'review': return <Star size={16} className="text-yellow-400" />;
            case 'like': return <Heart size={16} className="text-pink-500" />;
            case 'follow': return <UserPlus size={16} className="text-indigo-400" />;
            default: return <Coffee size={16} className="text-espresso-300" />;
        }
    };

    const renderActivityTitle = (type: string) => {
        switch (type) {
            case 'post': return t('activity.type_post', '피드 작성');
            case 'comment': return t('activity.type_comment', '댓글 작성');
            case 'review': return t('activity.type_review', '카페 리뷰');
            case 'like': return t('activity.type_like', '좋아요');
            case 'follow': return t('activity.type_follow', '팔로우');
            default: return 'Activity';
        }
    };

    const fetchSinglePost = async (postId: string) => {
        setIsFetchingPost(true);
        try {
            const res = await fetch(`${API_BASE}/api/community/posts/${postId}`);
            if (res.ok) {
                const data = await res.json();
                setSelectedPostData(data);
                setSelectedPostId(postId);
            } else {
                alert(t('activity.post_not_found', '게시글을 찾을 수 없거나 삭제되었습니다.'));
            }
        } catch (e) {
            console.error("Failed to fetch single post", e);
            alert(t('activity.error_fetch', '게시글 정보를 불러오는 데 실패했습니다.'));
        } finally {
            setIsFetchingPost(false);
        }
    };

    const fetchSingleShop = async (storeId: string) => {
        setIsFetchingShop(true);
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('token');
            const headers: any = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`${API_BASE}/api/shops/${storeId}`, { headers });
            if (res.ok) {
                const data = await res.json();
                setSelectedShopData(data);
                setSelectedShopId(storeId);
            } else {
                alert(t('activity.shop_not_found', '카페 정보를 찾을 수 없거나 삭제되었습니다.'));
            }
        } catch (e) {
            console.error("Failed to fetch single shop", e);
            alert(t('activity.error_fetch_shop', '카페 정보를 불러오는 데 실패했습니다.'));
        } finally {
            setIsFetchingShop(false);
        }
    };

    const navigateToTarget = (item: ActivityItem) => {
        switch (item.type) {
            case 'post': 
            case 'comment': 
            case 'like': 
                fetchSinglePost(item.targetId);
                break;
            case 'follow':
                if (item.extra?.storeName) {
                    fetchSingleShop(item.targetId);
                } else {
                    alert(t('activity.profile_prep', { authorName: item.extra?.authorName || '' }));
                }
                break;
            case 'review': 
                fetchSingleShop(item.targetId);
                break;
        }
    };

    const resolveImageUrl = (imgUrl: string | null | undefined) => {
        if (!imgUrl) return '';
        let url = imgUrl;

        // Attempt to parse stringified JSON formats safely
        if (url.startsWith('[') || url.startsWith('"')) {
            try {
                const parsed = JSON.parse(url);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    url = parsed[0];
                } else if (typeof parsed === 'string') {
                    url = parsed;
                }
            } catch (e) {
                // Keep raw string on parse failure
            }
        }
        
        // Remove rogue escaped quotes if they somehow remain
        url = url.replace(/^"|"$/g, '');

        if (url.startsWith('http') || url.startsWith('data:')) return url;
        
        // ensure it has a leading slash
        if (!url.startsWith('/')) url = '/' + url;
        return `${API_BASE}${url}`;
    };

    return (
        <div className="absolute inset-0 bg-espresso-950 text-espresso-50 flex flex-col font-sans">
            {/* Top Section (Header + Tabs) */}
            <div className="shrink-0 z-50 shadow-sm border-b border-espresso-800/50 bg-espresso-950/90 backdrop-blur-md pt-safe">
                {/* Header */}
                <header className="flex items-center h-14 px-4">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-espresso-100 hover:text-amber-500 transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="flex-1 text-center font-bold text-lg text-espresso-50 pr-8 tracking-tight font-serif">
                        {t('activity.page_title', '내 활동 내역')}
                    </h1>
                </header>

                {/* Filter Tabs */}
                <div className="bg-espresso-900 border-t border-espresso-800/50">
                    <div className="flex px-4 py-3 flex-nowrap min-w-max gap-2 whitespace-nowrap overflow-x-auto hide-scrollbar">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setFilter(tab.id as any)}
                                className={`px-4 py-2 shrink-0 rounded-full text-[13px] font-bold transition-colors border ${
                                    filter === tab.id 
                                    ? 'bg-amber-500 text-espresso-950 border-amber-500 shadow-sm' 
                                    : 'bg-espresso-800/50 text-espresso-300 border-espresso-700 hover:bg-espresso-800 hover:text-espresso-100'
                                }`}
                                style={{ WebkitTapHighlightColor: 'transparent' }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Timeline */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20 scroll-smooth">
                {isLoading && page === 1 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                        <Coffee className="w-10 h-10 text-amber-500 animate-pulse mb-4" />
                        <p className="text-sm text-espresso-300">{t('activity.loading', '내역을 불러오는 중...')}</p>
                    </div>
                ) : activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                        <FileText className="w-12 h-12 text-espresso-600 mb-4" />
                        <p className="text-sm font-bold text-espresso-300">{t('activity.no_data', '해당하는 활동 내역이 없습니다.')}</p>
                    </div>
                ) : (
                    <AnimatePresence>
                        {activities.map((item, index) => (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                key={`${item.id}-${index}`} 
                                className="bg-espresso-900 rounded-2xl p-4 border border-espresso-800/50 shadow-sm active:bg-espresso-800/50 transition-colors cursor-pointer"
                                onClick={() => navigateToTarget(item)}
                            >
                                {/* Header (Type & Date) */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-espresso-800 flex items-center justify-center">
                                            {renderActivityIcon(item.type)}
                                        </div>
                                        <span className="font-bold text-[13px] text-espresso-100">{renderActivityTitle(item.type)}</span>
                                    </div>
                                    <span className="text-[11px] text-espresso-400 font-medium">{formatDate(item.createdAt)}</span>
                                </div>

                                {/* Body Content */}
                                <div className="pl-10 pb-1">
                                    {/* Additional context based on type */}
                                    {item.type === 'comment' && item.extra?.parentContent && (
                                        <div className="mb-2 bg-espresso-950/50 border-l-2 border-espresso-700 px-3 py-2 rounded-r-lg text-[13px] text-espresso-400 line-clamp-2 italic">
                                            {item.extra.parentContent}
                                        </div>
                                    )}

                                    {item.type === 'review' && item.extra?.storeName && (
                                        <div className="mb-2 text-[13px] font-bold text-amber-500">
                                            📍 {item.extra.storeName}
                                        </div>
                                    )}

                                    {item.type === 'like' && item.extra?.authorName && (
                                        <div className="mb-2 text-[13px] font-bold text-pink-400">
                                            {t('activity.like_desc', { authorName: item.extra.authorName })}
                                        </div>
                                    )}

                                    <div className="flex gap-3">
                                        <div className="flex-1 text-[14px] text-espresso-50 leading-relaxed line-clamp-3">
                                            {item.content || <span className="text-espresso-500 italic">{t('activity.no_content', '내용이 없습니다.')}</span>}
                                        </div>
                                        
                                        {/* Thumbnail if exists */}
                                        {item.imageUrl && (
                                            <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-espresso-800">
                                                <MediaRenderer 
                                                    src={resolveImageUrl(item.imageUrl)} 
                                                    className="w-full h-full object-cover bg-espresso-900" 
                                                    autoPlay={true}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer Badges */}
                                    {(item.extra?.earnedBeans || item.extra?.rating) ? (
                                        <div className="mt-3 flex items-center gap-2">
                                            {item.extra.earnedBeans && (
                                                <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-md text-[11px] font-bold border border-amber-500/20">
                                                    ☕ +{item.extra.earnedBeans}{t('activity.unit_bean', '콩')}
                                                </span>
                                            )}
                                            {item.extra.rating && (
                                                <span className="inline-flex items-center gap-1 bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded-md text-[11px] font-bold border border-yellow-400/20">
                                                    ★ {item.extra.rating.toFixed(1)}
                                                </span>
                                            )}
                                        </div>
                                    ) : null}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}

                {hasMore && (
                    <button 
                        onClick={handleLoadMore}
                        disabled={isLoading}
                        className="w-full py-4 rounded-xl border border-espresso-800 text-[13px] font-bold text-espresso-300 hover:text-amber-500 hover:border-amber-500/30 transition-colors disabled:opacity-50"
                    >
                        {isLoading ? t('activity.loading_more', '불러오는 중...') : t('activity.load_more', '더 보기')}
                    </button>
                )}
            </div>
            {/* Nav Padding */}
            <div className="h-20 shrink-0" />

            {/* Inline Post Viewer Modal */}
            <CommentSheet 
                isOpen={!!selectedPostId && !!selectedPostData}
                onClose={() => { setSelectedPostId(null); setSelectedPostData(null); }}
                postId={selectedPostId || ''}
                post={selectedPostData}
            />

            {/* Inline Shop Detail Modal */}
            <ShopDetailModal
                isOpen={!!selectedShopId && !!selectedShopData}
                shop={selectedShopData}
                onClose={() => { setSelectedShopId(null); setSelectedShopData(null); }}
            />
            
            {/* Loading Overlays */}
            {(isFetchingPost || isFetchingShop) && (
                <div className="fixed inset-0 z-[300] bg-espresso-950/60 flex items-center justify-center">
                    <div className="bg-espresso-900 border border-espresso-700 p-4 rounded-xl flex items-center gap-3 shadow-2xl">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-500"></div>
                        <span className="text-sm font-medium text-espresso-100">
                            {isFetchingPost ? t('activity.loading_post', '게시글 불러오는 중...') : t('activity.loading_shop', '카페 정보 불러오는 중...')}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActivityHistory;
