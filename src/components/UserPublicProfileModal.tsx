import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, MapPin, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_BASE } from '../utils/apiConfig';
import UserFollowBadge from './UserFollowBadge';

interface UserPublicProfileModalProps {
    userId: string;
    onClose: () => void;
    onOwnerDetected?: (store: any) => void;
}

export const UserPublicProfileModal: React.FC<UserPublicProfileModalProps> = ({ userId, onClose, onOwnerDetected }) => {
    const { t } = useTranslation();
    const [user, setUser] = useState<any>(null);
    const [collections, setCollections] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_BASE}/api/users/profile/shared/${userId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.user.role === 'OWNER' && data.store) {
                        onOwnerDetected?.(data.store);
                        onClose();
                        return;
                    }
                    setUser(data.user);
                    setCollections(data.collections || []);
                }
            } catch (error) {
                console.error("Failed to load public profile", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, [userId]);

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
            <div 
                className="absolute inset-0 z-0" 
                onClick={onClose}
            />
            
            <div className="relative z-10 w-full sm:w-[500px] h-full bg-[#111110] shadow-[auto_0_30px_60px_-15px_rgba(0,0,0,0.8)] border-l border-espresso-800/30 overflow-y-auto overflow-x-hidden transform transition-transform duration-300">
                <button
                    onClick={onClose}
                    className="absolute top-6 left-6 p-2 rounded-full bg-black/40 text-espresso-300 hover:text-white backdrop-blur-md z-50 transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center p-12 h-screen">
                        <div className="w-8 h-8 border-4 border-amber-900 border-t-amber-500 rounded-full animate-spin mb-4" />
                        <p className="text-espresso-300 text-sm">로딩 중...</p>
                    </div>
                ) : user ? (
                    <div className="pb-24">
                        {/* Header: Pure Black Background with fading portrait or centered image */}
                        <div className="relative pt-24 pb-12 px-6 flex flex-col items-center bg-black border-b border-espresso-900">
                            <div className="relative w-32 h-32 mb-6">
                                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500/20 to-transparent blur-xl"></div>
                                <img 
                                    src={user.profileImageUrl ? (user.profileImageUrl.startsWith('http') ? user.profileImageUrl : `${API_BASE}${user.profileImageUrl}`) : `https://ui-avatars.com/api/?name=${user.nickname}&background=3f3f3f&color=fff`} 
                                    alt={user.nickname}
                                    className="w-full h-full rounded-full object-cover border-2 border-espresso-800 shadow-2xl relative z-10"
                                />
                            </div>
                            
                            <h1 className="text-3xl font-serif font-bold text-white mb-2">{user.nickname}</h1>
                            {user.equippedBadge && (
                                <div className="px-3 py-1 bg-amber-900/30 text-amber-500 text-xs font-bold rounded-full mb-4 border border-amber-500/30">
                                    {user.equippedBadge}
                                </div>
                            )}
                            <p className="text-espresso-300 text-sm font-medium max-w-[280px] text-center leading-relaxed">
                                {user.bio ? user.bio : "커피를 사랑하는 큐레이터입니다."}
                            </p>

                            {/* Bio Media Gallery */}
                            {user.bioMediaUrls && (   
                                (() => {
                                    try {
                                        const urls = JSON.parse(user.bioMediaUrls);
                                        if (urls.length > 0) {
                                            return (
                                                <div className="flex gap-2 overflow-x-auto mt-6 max-w-[320px] snap-x hide-scrollbar px-2 pb-2">
                                                    {urls.map((url: string, idx: number) => (
                                                        <div key={idx} className="w-24 h-24 shrink-0 rounded-xl overflow-hidden border border-espresso-700/50 shadow-lg snap-center">
                                                            {url.match(/\.(mp4|webm|mov)(\?.*)?$/i) ? (
                                                                <video src={`${API_BASE}${url}`} className="w-full h-full object-cover" controls muted autoPlay loop playsInline />
                                                            ) : (
                                                                <img src={`${API_BASE}${url}`} className="w-full h-full object-cover" />
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        }
                                    } catch(e) {}
                                    return null;
                                })()
                            )}
                            
                            {/* Follow Button Action */}
                            {currentUser?.id && currentUser.id !== user.id && (
                                <div className="mt-5 transform scale-110 shadow-lg">
                                    <UserFollowBadge 
                                        targetUserId={user.id} 
                                        targetUserName={user.nickname} 
                                        currentUserId={currentUser.id} 
                                        onFollowToggled={(isFollowing) => {
                                            setUser((prev: any) => ({
                                                ...prev,
                                                _count: {
                                                    ...prev._count,
                                                    followers: (prev._count?.followers || 0) + (isFollowing ? 1 : -1)
                                                }
                                            }));
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Stats Row */}
                        <div className="flex justify-center gap-6 sm:gap-12 py-8 bg-[#111110]">
                            <div className="flex flex-col items-center">
                                <span className="text-2xl font-bold text-white">{user._count?.posts || 0}</span>
                                <span className="text-[10px] text-espresso-400 mt-1 uppercase tracking-widest">Logs</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-2xl font-bold text-white">{user._count?.collections || collections.length}</span>
                                <span className="text-[10px] text-espresso-400 mt-1 uppercase tracking-widest">Boards</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-2xl font-bold text-white">{user._count?.followers || 0}</span>
                                <span className="text-[10px] text-espresso-400 mt-1 uppercase tracking-widest">Followers</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-2xl font-bold text-white">{user._count?.following || 0}</span>
                                <span className="text-[10px] text-espresso-400 mt-1 uppercase tracking-widest">Following</span>
                            </div>
                        </div>

                        {/* Taster's Identity */}
                        <div className="px-6 py-8 border-t border-espresso-800/50">
                            <h2 className="text-[11px] uppercase font-serif tracking-[0.2em] text-[#D4BBA5] mb-6 text-center">Taster's Identity</h2>
                            <div className="space-y-4 max-w-[320px] mx-auto">
                                {[
                                    { label: 'Acidity', value: user.prefAcidity || 0 },
                                    { label: 'Sweetness', value: user.prefSweetness || 0 },
                                    { label: 'Bitterness', value: user.prefBitterness || 0 },
                                    { label: 'Body', value: user.prefBody || 0 }
                                ].map(taste => {
                                    const TASTE_MAP: Record<string, { kr: string, color: string }> = {
                                        'Acidity': { kr: '산미(신맛)', color: '#FFB000' },
                                        'Sweetness': { kr: '단맛', color: '#FF6B81' },
                                        'Bitterness': { kr: '쓴맛', color: '#A3A398' },
                                        'Body': { kr: '바디감', color: '#E57A00' }
                                    };
                                    const info = TASTE_MAP[taste.label];
                                    return (
                                        <div key={taste.label} className="flex justify-between items-center text-[15px]">
                                            <span className="font-semibold text-espresso-50 w-16 shrink-0 whitespace-nowrap text-xs">{info.kr}</span>
                                            <div className="flex flex-1 justify-center gap-[6px] px-2 sm:px-4">
                                                {Array(5).fill(0).map((_, i) => {
                                                    let bgStyle: any = { backgroundColor: '#33332D' };
                                                    if (taste.value >= i + 1) {
                                                        bgStyle = { backgroundColor: info.color };
                                                    } else if (taste.value > i) {
                                                        const percentage = (taste.value - i) * 100;
                                                        bgStyle = { background: `linear-gradient(to right, ${info.color} ${percentage}%, #33332D ${percentage}%)` };
                                                    }
                                                    return (
                                                        <div 
                                                            key={i} 
                                                            className="h-1.5 w-6 sm:w-8 rounded-full transition-all duration-300"
                                                            style={bgStyle}
                                                        />
                                                    );
                                                })}
                                            </div>
                                            <span className="font-bold text-[#FFD570] text-[13px] w-[30px] text-right shrink-0">{taste.value ? taste.value.toFixed(1) : '?.?'}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Collections / Curation Boards */}
                        {collections.length > 0 && (
                            <div className="pt-8 border-t border-espresso-800/50">
                                <h2 className="text-[11px] uppercase font-serif tracking-[0.2em] text-[#D4BBA5] mb-6 px-6">Curator's Collections</h2>
                                <div className="flex overflow-x-auto pb-6 px-6 gap-4 snap-x hide-scrollbar">
                                    {collections.map(c => (
                                        <div key={c.id} className="min-w-[240px] max-w-[240px] bg-espresso-950 rounded-xl overflow-hidden border border-espresso-800 flex-shrink-0 snap-center">
                                            <div className="h-[120px] bg-espresso-900 flex gap-[2px] p-[2px]">
                                                {c.items?.slice(0, 3).map((item: any, i: number) => {
                                                    const img = item.post?.image ? JSON.parse(item.post.image)[0] : item.store?.mainImageUrl;
                                                    return (
                                                        <div key={i} className="flex-1 h-full bg-espresso-800 rounded-[8px] overflow-hidden">
                                                            {img && <img src={img} className="w-full h-full object-cover opacity-80" alt="collection preview" />}
                                                        </div>
                                                    );
                                                })}
                                                {(!c.items || c.items.length === 0) && (
                                                    <div className="flex-1 h-full flex items-center justify-center bg-espresso-900/50">
                                                        <span className="text-xs text-espresso-400">Empty Board</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-4">
                                                <h3 className="font-bold text-white text-sm truncate">{c.name}</h3>
                                                <p className="text-xs text-espresso-400 mt-1 line-clamp-1">{c.description || 'No description'}</p>
                                                <p className="text-[10px] text-amber-500/70 mt-3">{c._count?.items || 0} items</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-12 h-screen text-center">
                        <Search size={48} className="text-espresso-800 mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">Profile Not Found</h3>
                        <p className="text-espresso-300 text-sm">해당 프로필을 찾을 수 없거나 비공개 설정되어 있습니다.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
