import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, MapPin, ChevronLeft, Camera, Star, Send, Bookmark, Folder, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CommentSheet from '../components/community/CommentSheet';
import ShopSearch from '../components/community/ShopSearch';
import CollectionSaveSheet from '../components/community/CollectionSaveSheet';
import { API_BASE } from '../utils/apiConfig';
import { useTranslation } from 'react-i18next';
import { formatRelativeTime } from '../utils/dateFormatter';

interface Post {
  id: string;
  isStoreOnly?: boolean;
  storeData?: any;
  author: { id: string; name: string; avatar: string; badges: string[] };
  image: string;
  content: string;
  cafeName?: string;
  cafeLocation?: string;
  cafeLat?: number;
  cafeLng?: number;
  likes: number;
  comments: number;
  shareCount: number;
  timeAgo: string;
  tastingNote?: { acidity: number; sweetness: number; body: number };
}

interface Collection {
  id: string;
  name: string;
  isPublic: boolean;
  isPilgrimageCourse?: boolean;
  _count: { items: number };
  items: any[];
}

export default function BookmarkedPosts() {
  const { t } = useTranslation(['translation']);
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState<Record<string, boolean>>({});
  const [isBookmarked, setIsBookmarked] = useState<Record<string, boolean>>({});
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [activeCollectionPostId, setActiveCollectionPostId] = useState<string | null>(null);
  
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  // View 1: Fetch all collections
  useEffect(() => {
    if (!selectedCollection) {
        fetchCollections();
    }
  }, [selectedCollection]);

  const fetchCollections = async () => {
      setIsLoading(true);
      try {
          const token = localStorage.getItem('token');
          if (!token) {
             navigate('/profile');
             return;
          }
          const res = await fetch(`${API_BASE}/api/users/collections`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
              const data = await res.json();
              setCollections(data);
          }
      } catch (e) {
          console.error("Failed to fetch collections", e);
      } finally {
          setIsLoading(false);
      }
  };

  // View 2: Fetch single collection posts
  const fetchCollectionPosts = async (collectionId: string) => {
      setIsLoading(true);
      try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_BASE}/api/users/collections/${collectionId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
              const data = await res.json();
              setSelectedCollection(data);
              
              const mappedPosts: Post[] = data.items
                .filter((d: any) => d?.post || d?.store)
                .map((d: any) => {
                  if (d.post) {
                      return {
                         id: d.post.id,
                         author: {
                           id: d.post.author?.id,
                           name: d.post.author?.role === 'OWNER' && d.post.author?.stores?.length > 0 ? d.post.author.stores[0].name : d.post.author?.nickname,
                           avatar: d.post.author?.profileImageUrl || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&q=80',
                           badges: d.post.author?.role === 'OWNER' ? [t('bookmarked_posts.badge_official', '공식 매장')] : [t('bookmarked_posts.badge_lover', '커피 애호가')]
                         },
                         image: d.post.image || 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=800&q=80',
                         content: d.post.content,
                         cafeName: d.post.cafeName,
                         cafeLocation: d.post.cafeLocation,
                         cafeLat: d.post.cafeLat ? parseFloat(d.post.cafeLat) : undefined,
                         cafeLng: d.post.cafeLng ? parseFloat(d.post.cafeLng) : undefined,
                         likes: d.post._count?.likes || 0,
                         comments: d.post._count?.comments || 0,
                         shareCount: d.post.shareCount || 0,
                         timeAgo: formatRelativeTime(d.post.createdAt || Date.now()),
                         tastingNote: d.post.acidity ? {
                            acidity: d.post.acidity || 0,
                            sweetness: d.post.sweetness || 0,
                            body: d.post.body || 0
                         } : undefined
                      };
                  } else {
                      return {
                          id: d.store.id,
                          isStoreOnly: true,
                          storeData: d.store,
                          // Fulfill interface
                          author: { id: '', name: '', avatar: '', badges: [] },
                          image: '',
                          content: '',
                          likes: 0,
                          comments: 0,
                          shareCount: 0,
                          timeAgo: ''
                      };
                  }
               });
              
              setPosts(mappedPosts);
              
              // Ensure all fetched posts appear as bookmarked in the UI
              const initialBookmarks: Record<string, boolean> = {};
              mappedPosts.forEach(p => initialBookmarks[p.id] = true);
              setIsBookmarked(initialBookmarks);
          }
      } catch (e) {
          console.error("Failed to fetch collection details", e);
      } finally {
          setIsLoading(false);
      }
  };

  const handleLike = async (id: string, currentLikes: number) => {
    const wasLiked = isLiked[id];
    setIsLiked(prev => ({ ...prev, [id]: !wasLiked }));
    setPosts(prev => prev.map(p => {
        if (p.id === id) {
            return { ...p, likes: wasLiked ? p.likes - 1 : p.likes + 1 };
        }
        return p;
    }));

    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const url = `${API_BASE}/api/community/posts/${id}/like`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    } catch (e) {
        console.error("Failed to toggle like", e);
        setIsLiked(prev => ({ ...prev, [id]: wasLiked }));
    }
  };

  const handleBookmark = (id: string) => {
      setActiveCollectionPostId(id);
  };

  const handleShare = async (id: string) => {
    try {
        const url = `${API_BASE}/api/community/posts/${id}/share`;
        const res = await fetch(url, { method: 'POST' });
        if (res.ok) {
            const data = await res.json();
            setPosts(prev => prev.map(p => {
                if (p.id === id) return { ...p, shareCount: data.shareCount };
                return p;
            }));
        }
        if (navigator.share) {
             await navigator.share({
                 title: 'Beanmind Coffee Talk',
                 text: '이 재미있는 커피 이야기를 확인해보세요!',
                 url: `${window.location.origin}/community`
             });
        } else {
             await navigator.clipboard.writeText(`${window.location.origin}/community`);
             alert(t('bookmarked_posts.alert_copy_link', '커뮤니티 링크가 웹클립보드에 복사되었습니다.'));
        }
    } catch (e) {
        console.error("Failed to share", e);
    }
  };

  const handleMapClick = (post: Post) => {
    navigate('/map', { 
      state: { targetLat: post.cafeLat, targetLng: post.cafeLng, targetName: post.cafeName } 
    });
  };

  const handleBack = () => {
      if (selectedCollection) {
          setSelectedCollection(null);
      } else {
          navigate(-1);
      }
  };

  return (
    <div className="absolute inset-0 bg-espresso-950 text-espresso-50 flex flex-col font-sans">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-espresso-900/80 backdrop-blur-xl border-b border-espresso-700/80 pt-safe">
        <div className="flex items-center px-4 h-14">
            <button onClick={handleBack} className="p-2 -ml-2 hover:bg-espresso-800 rounded-full transition-colors">
              <ChevronLeft size={24} className="text-espresso-200" />
            </button>
            <h1 className="text-[17px] font-bold tracking-tight text-espresso-50 ml-2">
                {selectedCollection ? selectedCollection.name : t('bookmarked_posts.title_my_collection', '나의 컬렉션')}
            </h1>
        </div>
      </header>

      {/* Main Feed Content */}
      <main className="flex-1 overflow-y-auto pb-6 pt-[70px] scroll-smooth">
        <div className="max-w-md mx-auto space-y-4 p-4">
          {isLoading ? (
             <p className="text-center text-espresso-200 mt-10">{t('bookmarked_posts.loading', '데이터를 불러오는 중입니다...')}</p>
          ) : !selectedCollection ? (
             // Collections List View
             collections.length === 0 ? (
                 <div className="text-center text-espresso-200 mt-10 p-6 bg-espresso-900/50 rounded-2xl border border-espresso-700/50 flex flex-col items-center">
                     <Folder size={40} className="mb-4 opacity-30 mx-auto" strokeWidth={1.5} />
                     <p className="font-medium text-[15px] mb-2 text-espresso-50">{t('bookmarked_posts.no_collections', '생성된 컬렉션이 없습니다.')}</p>
                     <p className="text-[13px] text-espresso-200 font-medium" dangerouslySetInnerHTML={{ __html: t('bookmarked_posts.no_collections_desc', '커피톡 피드에서 마음에 드는 게시글을<br/>저장하고 컬렉션에 추가해보세요.') }}></p>
                 </div>
             ) : (
                 <div className="grid grid-cols-2 gap-4">
                     {collections.map(col => (
                         <button 
                             key={col.id}
                             onClick={() => fetchCollectionPosts(col.id)}
                             className="bg-espresso-950 border border-espresso-700 rounded-2xl p-4 text-left hover:bg-espresso-800/50 transition-colors flex flex-col items-start gap-3"
                         >
                             <div className="w-12 h-12 rounded-xl bg-espresso-800 flex items-center justify-center overflow-hidden shrink-0">
                                 {col.items && col.items.length > 0 && col.items[0].post?.image ? (
                                      <img src={(() => {
                                          let img = col.items[0].post?.image;
                                          try {
                                              const parsed = JSON.parse(img);
                                              if (Array.isArray(parsed) && parsed.length > 0) img = parsed[0];
                                          } catch(e) {}
                                          return img.startsWith('http') ? img : `${API_BASE}${img}`;
                                      })()} className="w-full h-full object-cover" />
                                 ) : (
                                      <Folder size={24} className="text-amber-500/50" />
                                 )}
                             </div>
                             <div>
                                 <h3 className="font-bold text-espresso-50 text-[15px]">{col.name}</h3>
                                 <p className="text-xs text-espresso-300 mt-0.5">{t('bookmarked_posts.item_count', '항목 {{count}}개', { count: col._count.items })}</p>
                             </div>
                         </button>
                     ))}
                 </div>
             )
          ) : posts.length === 0 ? (
             // Empty Collection View
             <div className="text-center text-espresso-200 mt-10 p-6 bg-espresso-900/50 rounded-2xl border border-espresso-700/50 flex flex-col items-center">
                 <Bookmark size={40} className="mb-4 opacity-30 mx-auto" strokeWidth={1.5} />
                 <p className="font-medium text-[15px] mb-2 text-espresso-50">{t('bookmarked_posts.no_posts', '컬렉션이 비어있습니다.')}</p>
                 <p className="text-[13px] text-espresso-200 font-medium" dangerouslySetInnerHTML={{ __html: t('bookmarked_posts.no_posts_desc', '마음에 드는 커피톡 게시물을 저장하여<br/>이 컬렉션을 채워보세요!') }}></p>
             </div>
          ) : (
            // Posts inside Collection View
            <>
                {selectedCollection?.isPilgrimageCourse && (
                    <button 
                         onClick={() => navigate(`/map?courseId=${selectedCollection.id}`)}
                         className="w-full bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-2xl p-4 mb-4 flex items-center justify-between hover:bg-amber-500/20 transition-colors shadow-lg active:scale-95"
                    >
                         <div className="flex flex-col items-start text-left">
                             <span className="font-bold text-[14px]">📍 지도 기반 성지 순례 코스입니다!</span>
                             <span className="text-[11px] opacity-80 mt-1">포함된 매장들이 이어진 전체 지도 노선을 확인해보세요.</span>
                         </div>
                         <div className="bg-amber-500 text-espresso-950 px-3 py-2 rounded-xl font-bold text-[11px] whitespace-nowrap shrink-0 ml-2">
                             지도 전체 연동
                         </div>
                    </button>
                )}
                {posts.map((post) => {
                  if (post.isStoreOnly && post.storeData) {
                      return (
                          <article key={post.id} className="bg-[#121215] rounded-3xl overflow-hidden border border-espresso-700/60 shadow-xl mb-4 p-4 flex items-center justify-between">
                              <div className="flex items-center gap-4 flex-1">
                                  <div className="w-14 h-14 rounded-2xl bg-espresso-800 shrink-0 overflow-hidden border border-white/5">
                                      {post.storeData.mainImageUrl ? (
                                          <img src={post.storeData.mainImageUrl.startsWith('http') ? post.storeData.mainImageUrl : `${API_BASE}${post.storeData.mainImageUrl}`} className="w-full h-full object-cover" />
                                      ) : (
                                          <MapPin className="w-full h-full p-4 text-espresso-400" />
                                      )}
                                  </div>
                                  <div className="flex-1 pr-2">
                                      <h3 className="font-bold text-[15px] text-amber-500 line-clamp-1">{post.storeData.name}</h3>
                                      <p className="text-[12px] text-espresso-300 mt-1 line-clamp-1">{post.storeData.address || post.storeData.shortDesc}</p>
                                  </div>
                              </div>
                              <button onClick={() => navigate('/map', { state: { targetShopId: post.storeData.id, targetLat: post.storeData.lat, targetLng: post.storeData.lng, targetName: post.storeData.name } })} className="bg-espresso-800 hover:bg-espresso-700 text-espresso-50 px-3 py-2.5 rounded-xl flex items-center gap-1.5 shrink-0 border border-espresso-700 transition-colors">
                                  <MapPin size={14} className="text-amber-500" />
                                  <span className="text-[11px] font-bold whitespace-nowrap">{t('bookmarked_posts.btn_map', '점포 지도')}</span>
                              </button>
                          </article>
                      );
                  }

              // Parse images if JSON
              let displayImage = post.image;
              try {
                  const parsed = JSON.parse(post.image);
                  if (Array.isArray(parsed) && parsed.length > 0) displayImage = parsed[0];
              } catch (e) {}
              if (!displayImage.startsWith('http')) displayImage = `${API_BASE}${displayImage}`;

              return (
              <article key={post.id} className={`bg-espresso-950 rounded-3xl overflow-hidden border border-espresso-700/60 shadow-xl mb-4 transition-opacity duration-300 ${!isBookmarked[post.id] ? 'opacity-50 grayscale-[50%]' : ''}`}>
                {/* Post Header */}
                <div className="flex items-center p-4">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-espresso-600">
                    <img src={post.author.avatar} alt="avatar" className="w-full h-full object-cover" />
                  </div>
                  <div className="ml-3">
                    <h3 className="font-bold text-[14px] text-espresso-50 flex items-center gap-1">
                      {post.author.name}
                      {post.author.name === '로스터리 아카이브' && <Star size={12} className="text-amber-400 fill-amber-400" />}
                    </h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      {post.author.badges.map((badge, i) => (
                        <span key={i} className="text-[10px] bg-espresso-800 text-amber-400 px-1.5 py-0.5 rounded border border-amber-900/30">
                          {badge}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Post Image with 5:3 / 15:8 / 20:9 Aspect Ratios */}
                <div className="relative aspect-[5/3] sm:aspect-[15/8] md:aspect-[20/9] w-[calc(100%-1.5rem)] mx-auto rounded-2xl overflow-hidden bg-espresso-900 group shadow-inner">
                  <img src={displayImage} alt="coffee" className="w-full h-full object-cover" />
                  
                  {post.cafeName && (
                    <button onClick={() => handleMapClick(post)} className="absolute bottom-4 left-4 bg-espresso-950/50 backdrop-blur-md rounded-2xl p-3 flex items-center gap-3 border border-espresso-600 shadow-xl transition-transform active:scale-95 hover:bg-espresso-950/60">
                      <div className="bg-amber-500/20 p-2 rounded-full">
                        <MapPin size={18} className="text-amber-400" />
                      </div>
                      <div className="text-left">
                        <p className="text-[13px] font-bold text-espresso-50 leading-tight">{post.cafeName}</p>
                        <p className="text-[10px] font-medium text-espresso-100 mt-0.5">{post.cafeLocation} · {t('bookmarked_posts.btn_map', '지도 보기')}</p>
                      </div>
                    </button>
                  )}
                </div>

                {/* Interactions & Content */}
                <div className="p-4 pt-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <button onClick={() => handleLike(post.id, post.likes)} className="flex items-center gap-1.5 group transition-colors">
                        <Heart size={24} className={`transition-all duration-300 ${isLiked[post.id] ? 'fill-rose-500 text-rose-500 scale-110 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'text-espresso-200 group-hover:text-rose-400'}`} />
                        <span className={`text-[13px] font-medium ${isLiked[post.id] ? 'text-rose-500' : 'text-espresso-200'}`}>
                          {isLiked[post.id] ? post.likes + 1 : post.likes}
                        </span>
                      </button>
                      <button onClick={() => setActiveCommentPostId(post.id)} className="flex items-center gap-1.5 text-espresso-200 hover:text-amber-500 transition-colors">
                        <MessageCircle size={22} />
                        <span className="text-[13px] font-medium">{post.comments}</span>
                      </button>
                      <button onClick={() => handleShare(post.id)} className="flex items-center gap-1.5 text-espresso-200 hover:text-emerald-400 transition-colors">
                        <Send size={20} className="-mt-0.5" />
                        <span className="text-[13px] font-medium">{post.shareCount}</span>
                      </button>
                    </div>
                    <button onClick={() => handleBookmark(post.id)} className={`transition-colors ${isBookmarked[post.id] ? 'text-amber-400' : 'text-espresso-200 hover:text-amber-400'}`}>
                      <Bookmark size={22} className={isBookmarked[post.id] ? 'fill-amber-400' : ''} />
                    </button>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-[14px] leading-relaxed break-keep">
                      <span className="font-bold mr-2 text-espresso-50">{post.author.name}</span>
                      <span className="text-espresso-100">{post.content}</span>
                    </p>
                  </div>

                  {post.tastingNote && (
                    <div className="bg-espresso-900 rounded-2xl p-4 border border-espresso-700/80 mt-3 shadow-inner">
                      <h4 className="text-[11px] font-black text-amber-500 tracking-wider mb-3">TASTER'S NOTE</h4>
                      <div className="space-y-2.5">
                        {[
                          { label: '산미 (Acidity)', val: post.tastingNote.acidity },
                          { label: '단맛 (Sweetness)', val: post.tastingNote.sweetness },
                          { label: '바디감 (Body)', val: post.tastingNote.body }
                        ].map((stat, i) => (
                          <div key={i} className="flex items-center text-[12px]">
                            <span className="w-28 text-espresso-200 font-medium">{stat.label}</span>
                            <div className="flex-1 h-2 bg-espresso-800 rounded-full overflow-hidden ml-2 flex">
                              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(stat.val / 5) * 100}%` }} />
                            </div>
                            <span className="ml-3 text-espresso-100 font-bold w-7 text-right">{stat.val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-[10px] font-medium text-espresso-300 mt-4 uppercase tracking-wider">{post.timeAgo}</p>
                </div>
              </article>
            );
          })}
          </>
          )}
        </div>
      </main>

      {/* Comment Sheet */}
      {activeCommentPostId && (
         <div className="fixed inset-0 z-[100] flex justify-center sm:items-center items-end bg-espresso-950/60 backdrop-blur-sm sm:p-4">
            <div className="w-full max-w-md h-[85vh] sm:h-[80vh] sm:rounded-3xl overflow-hidden shadow-2xl bg-espresso-950 border-t sm:border border-espresso-700">
               <CommentSheet isOpen={!!activeCommentPostId} postId={activeCommentPostId} onClose={() => setActiveCommentPostId(null)} />
            </div>
         </div>
      )}

      {/* Collection Save Modal */}
      <CollectionSaveSheet 
          postId={activeCollectionPostId || ''} 
          isOpen={!!activeCollectionPostId} 
          onClose={() => setActiveCollectionPostId(null)} 
          onSaveStateChange={(id, isSaved) => setIsBookmarked(prev => ({ ...prev, [id]: isSaved }))}
      />
    </div>
  );
}
