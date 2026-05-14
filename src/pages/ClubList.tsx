import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Users, Plus, Lock, Globe, Search, RefreshCw, Image as ImageIcon, MapPin, X } from 'lucide-react';
import { API_BASE, getDeviceCountryCode } from '../utils/apiConfig';
import { motion } from 'framer-motion';
import SharedCoffeeMap from '../components/SharedCoffeeMap';
import PullToRefresh from '../components/common/PullToRefresh';
import { parseCoverImages } from '../utils/imageParser';
import { useTranslation } from 'react-i18next';
import { useAdStore } from '../store/adStore';
import { FeedAdCard } from '../components/ads/FeedAdCard';

// In-memory cache to prevent loading screens when re-entering the tab
let globalClubsCache: any = null;

export default function ClubList() {
    const navigate = useNavigate();
    const location = useLocation();
    const { t, i18n } = useTranslation(['translation']);
    const [activeTab, setActiveTab] = useState<'MY_CLUBS' | 'ALL_CLUBS'>(location.state?.activeTab || 'ALL_CLUBS');
    const [myClubs, setMyClubs] = useState<any[]>(globalClubsCache?.my || []);
    const [allClubs, setAllClubs] = useState<any[]>(globalClubsCache?.all || []);
    const [nextCursor, setNextCursor] = useState<string | null>(globalClubsCache?.nextCursor || null);
    const [isLoading, setIsLoading] = useState(!globalClubsCache);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newlyApprovedClubIds, setNewlyApprovedClubIds] = useState<string[]>([]);
    const [clubAd, setClubAd] = useState<any>(null);
    const [clubPremiumAd, setClubPremiumAd] = useState<any>(null);
    const { canShowAd, recordAdView } = useAdStore();
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const isInitialRender = useRef(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [isRecruitingFilter, setIsRecruitingFilter] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    // Create Modal Form
    const [newClubName, setNewClubName] = useState('');
    const [newClubDesc, setNewClubDesc] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [coverImagePreviews, setCoverImagePreviews] = useState<string[]>([]);
    const [locationName, setLocationName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        if (files.length > 10) {
            alert('理쒕? 10?κ퉴吏留?泥⑤??????덉뒿?덈떎.');
            return;
        }

        const promises = files.map(file => {
            return new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });
        });

        const base64Images = await Promise.all(promises);
        setCoverImagePreviews(base64Images);
    };

    const fetchClubs = async (silent = false, isLoadMore = false) => {
        if (!silent && !isLoadMore) setIsLoading(true);
        if (isLoadMore) setIsLoadingMore(true);
        try {
            let endpoint = `${API_BASE}/api/clubs?limit=20&countryCode=${getDeviceCountryCode()}`;
            if (isLoadMore && nextCursor) {
                endpoint += `&lastId=${nextCursor}`;
            }
            if (debouncedSearchQuery) {
                endpoint += `&q=${encodeURIComponent(debouncedSearchQuery)}`;
            }
            if (isRecruitingFilter) {
                endpoint += `&recruitingOnly=true`;
            }

            const res = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                
                if (isLoadMore) {
                    setAllClubs(prev => {
                        const merged = [...prev, ...(data.all || [])];
                        return Array.from(new Map(merged.map(item => [item.id, item])).values());
                    });
                } else {
                    if (!debouncedSearchQuery && !isRecruitingFilter) {
                        globalClubsCache = data;
                    }
                    setMyClubs(data.my || []);
                    setAllClubs(data.all || []);
                }
                
                setNextCursor(data.nextCursor);
                if (data.nextCursor && !isLoadMore && globalClubsCache && !debouncedSearchQuery && !isRecruitingFilter) {
                   globalClubsCache.nextCursor = data.nextCursor;
                }
                
                // Clear unread badge by updating lastSeenClubIds
                const activeClubs = (data.my || []).filter((c: any) => c.members && c.members.length > 0 && c.members[0].role !== 'PENDING');
                const activeIds = activeClubs.map((c: any) => c.id);
                
                const lastSeenIds = JSON.parse(localStorage.getItem('lastSeenClubIds') || '[]');
                const newIds = activeIds.filter((id: string) => !lastSeenIds.includes(id));
                setNewlyApprovedClubIds(newIds);

                // Update lastSeenGlobalClubDate to clear the global "new club" badge
                if (data.all && data.all.length > 0) {
                    const latestGlobalClub = data.all[0];
                    localStorage.setItem('lastSeenGlobalClubDate', new Date(latestGlobalClub.createdAt).getTime().toString());
                }

                localStorage.setItem('lastSeenClubIds', JSON.stringify(activeIds));

                // Default gracefully if no clubs joined
                if ((data.my || []).length === 0 && !globalClubsCache) setActiveTab('ALL_CLUBS');
            }
        } catch(e) {
            console.error("Failed to fetch clubs", e);
        } finally {
            if (!silent && !isLoadMore) setIsLoading(false);
            if (isLoadMore) setIsLoadingMore(false);
        }
    };

    useEffect(() => {
        // If we have cache, the UI instantly loads, so we fetch silently in the background
        if (globalClubsCache) {
            fetchClubs(true);
        } else {
            fetchClubs(false);
        }

        // Fetch Club Ad
        const fetchAd = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/ads/serve?tab=FEED&placementKey=FEED_CLUB&lang=${i18n.language || 'en'}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.fallback === 'ADMOB') {
                        setClubAd(data);
                    } else if (data.ad && canShowAd(data.ad.id, (data.frequencyCapHours ?? 24) * 60 * 60 * 1000)) {
                        setClubAd(data);
                        recordAdView(data.ad.id, 'DIRECT', 'FEED');
                    } else {
                        setClubAd({ fallback: 'ADMOB' });
                    }
                }
            } catch(e) {
                console.error("Failed to fetch club ad", e);
            }

            try {
                const resPremium = await fetch(`${API_BASE}/api/ads/serve?tab=FEED&placementKey=FEED_CLUB_PREMIUM&lang=${i18n.language || 'en'}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
                });
                if (resPremium.ok) {
                    const data = await resPremium.json();
                    if (data.fallback === 'ADMOB') {
                        setClubPremiumAd(data);
                    } else if (data.ad) {
                        setClubPremiumAd(data);
                        recordAdView(data.ad.id, 'DIRECT', 'FEED');
                    } else {
                        setClubPremiumAd({ fallback: 'ADMOB' });
                    }
                }
            } catch(e) {
                console.error("Failed to fetch premium club ad", e);
            }
        };
        fetchAd();
    }, []);

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Refetch when filters change
    useEffect(() => {
        if (isInitialRender.current) {
            isInitialRender.current = false;
            return;
        }
        
        // When searching/filtering, we shouldn't use the cache for 'allClubs'
        setNextCursor(null);
        fetchClubs(false, false);
    }, [debouncedSearchQuery, isRecruitingFilter]);

    useEffect(() => {
        if (!loadMoreRef.current || !nextCursor || activeTab !== 'ALL_CLUBS') return;
        
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !isLoading && !isLoadingMore) {
                fetchClubs(true, true);
            }
        }, { threshold: 0.1 });
        
        observer.observe(loadMoreRef.current);
        return () => observer.disconnect();
    }, [nextCursor, activeTab, isLoading, isLoadingMore]);

    const handleCreateClub = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newClubName.trim() || !newClubDesc.trim()) return;

        setIsSubmitting(true);
        let clubLat: number | undefined;
        let clubLng: number | undefined;

        if (locationName.trim()) {
            try {
                // Use Nominatim for free geocoding based on location name
                const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName.trim())}`);
                if (geoRes.ok) {
                    const geoData = await geoRes.json();
                    if (geoData && geoData.length > 0) {
                        clubLat = parseFloat(geoData[0].lat);
                        clubLng = parseFloat(geoData[0].lon);
                    }
                }
            } catch(e) {
                console.warn('Geocoding failed', e);
            }
        }

        try {
            const res = await fetch(`${API_BASE}/api/clubs`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: newClubName,
                    description: newClubDesc,
                    coverImageUrl: coverImagePreviews.length > 0 ? JSON.stringify(coverImagePreviews) : null,
                    locationName: locationName.trim() || undefined,
                    lat: clubLat,
                    lng: clubLng,
                    isPrivate
                })
            });
            if (res.ok) {
                const newClub = await res.json();
                setIsCreateModalOpen(false);
                navigate(`/clubs/${newClub.id}`);
            } else {
                const err = await res.json();
                alert(err.error || '紐⑥엫 ?앹꽦 ?ㅽ뙣');
            }
        } catch(e) {
            alert('紐⑥엫 ?앹꽦 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // PRE-COMPUTE: Convert myClubs array into an O(1) Map to prevent O(N*M) lookup bottleneck during render
    const myClubsMap = React.useMemo(() => {
        const map = new Map();
        myClubs.forEach(c => map.set(c.id, c));
        return map;
    }, [myClubs]);

    const renderClubCard = (club: any, index: number) => {
        const myClubData = myClubsMap.get(club.id);
        const injectAd = index > 0 && (index + 1) % 5 === 0 && clubAd && clubAd.fallback !== 'ADMOB';
        const actualPendingCount = club.pendingApplicantsCount ?? myClubData?.pendingApplicantsCount ?? 0;
        const isRecruiting = club.isRecruiting ?? true;
        const deadlineStr = club.recruitDeadline ? new Date(club.recruitDeadline).toLocaleDateString() : '';

        return (
        <React.Fragment key={club.id}>
        <motion.div 
            whileTap={{ scale: 0.98 }}
            key={club.id} 
            onClick={() => navigate(`/clubs/${club.id}`, { state: { club } })}
            className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-colors relative overflow-hidden shadow-sm ${
                club.isDeleted 
                ? 'bg-espresso-950 border-red-500/30 opacity-70 hover:opacity-90' 
                : 'bg-espresso-800/80 border-espresso-600 hover:bg-espresso-700 shadow-espresso-900/50'
            }`}
        >
            <div className={`w-16 h-16 rounded-xl flex items-center justify-center shrink-0 border overflow-hidden relative ${club.isDeleted ? 'bg-espresso-900 border-red-500/20 grayscale' : 'bg-espresso-800 border-espresso-700'}`}>
                {club.coverImageUrl ? (
                    <img src={parseCoverImages(club.coverImageUrl)[0]} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                    <Users size={24} className={club.isDeleted ? "text-espresso-600" : "text-amber-500"} />
                )}
                {club.isPrivate && !club.isDeleted && (
                    <div className="absolute top-1 right-1 bg-black/60 p-0.5 rounded-full">
                        <Lock size={10} className="text-white" />
                    </div>
                )}
            </div>
            
            <div className="flex-1 min-w-0 z-10">
                <div className="flex justify-between items-start mb-1">
                    <h3 className={`font-bold text-[15px] truncate ${club.isDeleted ? 'text-espresso-400 line-through decoration-red-500/50' : 'text-espresso-50'}`}>
                        {club.name}
                    </h3>
                </div>
                <p className="text-[13px] text-espresso-300 line-clamp-1 mb-2">{club.isDeleted ? '紐⑥엫?μ뿉 ?섑빐 ?먯뇙???뚮え?꾩엯?덈떎.' : club.description}</p>
                <div className="flex items-center gap-1.5 text-[11px] font-medium mb-1 flex-nowrap overflow-x-auto hide-scrollbar pb-1">
                    {club.isDeleted ? (
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-500 border border-red-500/30 rounded-full w-fit flex flex-row shrink-0 whitespace-nowrap items-center gap-1 font-bold">
                            ???먯뇙??
                        </span>
                    ) : isRecruiting ? (
                        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 border border-green-500/50 rounded-full w-fit flex flex-row shrink-0 whitespace-nowrap items-center gap-1">
                            {t('club_list.recruiting')} {deadlineStr && `( ~${deadlineStr} )`}
                        </span>
                    ) : (
                        <span className="px-2 py-0.5 bg-espresso-800 text-espresso-400 border border-espresso-700/50 rounded-full w-fit flex flex-row shrink-0 whitespace-nowrap items-center gap-1">
                            {t('club_list.recruitment_closed')}
                        </span>
                    )}
                    <span className="px-2 py-0.5 bg-espresso-950 rounded-full w-fit text-amber-500/80 border border-amber-900/50 flex flex-row items-center gap-1 shrink-0 whitespace-nowrap">
                        <Users size={12} /> {club.memberCount || 0}{t('club_list.unit_person')}
                    </span>
                    {club.locationName && (
                        <span className="px-2 py-0.5 bg-espresso-900 rounded-full text-espresso-300 border shrink-0 whitespace-nowrap border-espresso-800 flex items-center gap-1">
                             <MapPin size={10} /> {club.locationName}
                        </span>
                    )}
                    {club.owner?.nickname && (
                        <span className="px-2 py-0.5 bg-espresso-900 rounded-full text-espresso-300 border shrink-0 whitespace-nowrap border-espresso-800">
                             {t('club_list.lbl_owner')}: {club.owner.nickname}
                        </span>
                    )}
                    {actualPendingCount > 0 && (
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-500 border border-red-500/50 rounded-full font-bold ml-auto flex items-center gap-1 animate-pulse shrink-0 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full"/> {t('club_list.lbl_pending')} {actualPendingCount}{t('club_list.unit_person')}
                        </span>
                    )}
                </div>
                {activeTab === 'MY_CLUBS' && club.members && club.members.length > 0 && (
                    <div className="text-[10px] items-center text-espresso-400 font-medium">
                        {club.members[0].role === 'PENDING' ? t('club_list.status_pending') : `${new Date(club.members[0].joinedAt).toLocaleDateString()} ${t('club_list.status_joined')}`}
                        {newlyApprovedClubIds.includes(club.id) && (
                            <span className="ml-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 px-2 py-0.5 rounded-full font-bold animate-pulse inline-flex items-center">
                                {t('club_list.alert_approved')}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
        {injectAd && (
            <div className="mb-4 mx-0" key={`ad-${club.id}-${index}`}>
                <FeedAdCard adData={clubAd.ads?.length > 0 ? clubAd.ads[Math.floor(index / 5) % clubAd.ads.length] : (clubAd.ad || clubAd)} />
            </div>
        )}
        </React.Fragment>
        );
    };

    const hasPendingInMyClubs = myClubs.some((c: any) => c.pendingApplicantsCount && c.pendingApplicantsCount > 0);
    const hasNewApprovalFeedback = newlyApprovedClubIds.length > 0;
    const showMyClubsBadge = hasPendingInMyClubs || hasNewApprovalFeedback;

    return (
        <div className="absolute inset-0 bg-espresso-950 text-espresso-50 flex flex-col font-sans">
            <header className="shrink-0 z-50 bg-espresso-900/80 backdrop-blur-xl border-b border-espresso-700/80 pt-safe">
                <div className="flex justify-between items-center px-4 h-14 gap-2">
                    <div className="flex items-center gap-1 sm:gap-3 shrink-0">
                        <button onClick={() => navigate('/community')} className="p-1 sm:p-2 -ml-2 text-espresso-200 hover:text-espresso-50 hover:bg-espresso-800 rounded-full transition-colors">
                            <ChevronLeft size={24} />
                        </button>
                        <h1 className="text-[16px] sm:text-[17px] font-extrabold tracking-tight text-espresso-50 whitespace-nowrap">
                            {t('club_list.page_title')}
                        </h1>
                    </div>

                    {!isSearchOpen ? (
                        <div className="flex items-center gap-1 shrink-0">
                            {activeTab === 'ALL_CLUBS' && (
                                <>
                                    <button 
                                        onClick={() => setIsRecruitingFilter(!isRecruitingFilter)}
                                        className={`shrink-0 px-2 py-1 mr-0.5 rounded-full text-[11px] font-bold border transition-colors ${isRecruitingFilter ? 'bg-amber-500/20 text-amber-500 border-amber-500/50' : 'bg-transparent text-espresso-400 border-espresso-800 hover:border-espresso-600'}`}
                                    >
                                        {t('club_list.filter_recruiting', '모집중')}
                                    </button>
                                    <button onClick={() => setIsSearchOpen(true)} className="p-2 hover:bg-espresso-800 rounded-full transition-colors text-espresso-200">
                                        <Search size={20} />
                                    </button>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center flex-1 justify-end min-w-0">
                            <div className="relative flex items-center flex-1 sm:max-w-xs bg-espresso-950/50 border border-espresso-800 rounded-full px-2 py-1 sm:px-3 sm:py-1.5 focus-within:border-amber-500 transition-colors">
                                <Search size={14} className="text-espresso-400 mr-1 shrink-0 hidden sm:block" />
                                <input 
                                    type="text"
                                    placeholder={t('club_list.ph_search')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="bg-transparent text-[13px] sm:text-sm text-espresso-50 flex-1 outline-none placeholder-espresso-500 py-0.5 min-w-0"
                                    autoFocus
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="p-1 text-espresso-400 hover:text-white shrink-0 ml-1">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                            <button 
                                onClick={() => { setIsSearchOpen(false); setSearchQuery(''); setIsRecruitingFilter(false); }} 
                                className="text-[13px] font-medium text-espresso-300 ml-2 whitespace-nowrap shrink-0"
                            >
                                {t('club_list.btn_cancel')} 
                            </button>
                        </div>
                    )}
                </div>
                
                <div className="flex w-full mb-0 border-b border-espresso-800/60">
                    <button 
                        onClick={() => setActiveTab('ALL_CLUBS')}
                        className={`flex-1 py-3 text-[14px] font-bold text-center border-b-2 transition-colors ${activeTab === 'ALL_CLUBS' ? 'border-amber-500 text-amber-500' : 'border-transparent text-espresso-400'}`}
                    >
                        {t('club_list.tab_all')}
                    </button>
                    <button 
                        onClick={() => setActiveTab('MY_CLUBS')}
                        className={`flex-1 py-3 text-[14px] font-bold text-center border-b-2 transition-colors relative flex justify-center items-center gap-1 ${activeTab === 'MY_CLUBS' ? 'border-amber-500 text-amber-500' : 'border-transparent text-espresso-400'}`}
                    >
                        {t('club_list.tab_mine')} ({myClubs.length})
                        {showMyClubsBadge && <span className="absolute top-[8px] right-2 w-[10px] h-[10px] bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />}
                    </button>
                </div>
            </header>

            <PullToRefresh onRefresh={async () => { await fetchClubs(true); }} className="flex-1 px-4 py-4 space-y-3 pb-24">
                {!isLoading && clubPremiumAd && clubPremiumAd.fallback !== 'ADMOB' && (
                    <div className="mb-4">
                        <FeedAdCard adData={clubPremiumAd.ad || clubPremiumAd} />
                    </div>
                )}
                {isLoading ? (
                    <p className="text-center text-espresso-300 mt-10 text-sm">{t('club_list.loading')}</p>
                ) : activeTab === 'MY_CLUBS' ? (
                    myClubs.length > 0 ? (
                        myClubs.map((club, index) => renderClubCard(club, index))
                    ) : (
                        <div className="text-center mt-20">
                            <Users size={48} className="mx-auto text-espresso-700 mb-4" />
                            <p className="text-espresso-300 text-sm">{t('club_list.no_my_clubs')}</p>
                        </div>
                    )
                ) : (
                    allClubs.length > 0 ? (
                        allClubs.map((club, index) => renderClubCard(club, index))
                    ) : (
                        <div className="text-center mt-20 text-espresso-300 text-sm">
                            ?덈줈???뚮え?꾩씠 ?놁뒿?덈떎.
                        </div>
                    )
                )}
                
                {activeTab === 'ALL_CLUBS' && nextCursor && (
                    <div ref={loadMoreRef} className="py-8 flex justify-center items-center">
                        {isLoadingMore ? (
                            <span className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                            <span className="text-espresso-400 text-sm">...</span>
                        )}
                    </div>
                )}
            </PullToRefresh>

            <div className="fixed bottom-20 right-4 md:right-8 lg:right-10 z-50 flex justify-end pointer-events-none">
                <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="pointer-events-auto w-14 h-14 md:w-16 md:h-16 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center text-espresso-950 shadow-lg shadow-amber-500/30 hover:scale-105 active:scale-95 transition-transform"
                >
                    <Plus className="w-7 h-7 md:w-8 md:h-8" />
                </button>
            </div>

            {/* Create Club Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-espresso-900 border border-espresso-700 w-full max-w-sm rounded-[24px] overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-espresso-800 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-espresso-50">{t('club_list.title_create')}</h2>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-espresso-400 hover:text-white p-1">
                                <ChevronLeft className="rotate-180" size={24} />
                            </button>
                        </div>
                        <div className="p-5 overflow-y-auto">
                            <form onSubmit={handleCreateClub} className="space-y-5">
                                <div>
                                    <label className="block text-[13px] font-medium text-espresso-300 mb-1.5">{t('club_list.lbl_name')}</label>
                                    <input 
                                        type="text" 
                                        value={newClubName}
                                        onChange={e => setNewClubName(e.target.value)}
                                        placeholder={t('club_list.ph_name')}
                                        maxLength={30}
                                        required
                                        className="w-full bg-espresso-950 border border-espresso-800 rounded-xl px-4 py-3 text-sm text-white placeholder-espresso-600 focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[13px] font-medium text-espresso-300 mb-1.5">{t('club_list.lbl_cover_image')}</label>
                                    <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full h-32 bg-espresso-950 border border-dashed border-espresso-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-amber-500 overflow-hidden relative transition-colors group"
                                >
                                    {coverImagePreviews.length > 0 ? (
                                        <div className="flex w-full h-full divide-x divide-espresso-900 border-r border-espresso-900 relative">
                                            {coverImagePreviews.slice(0, 3).map((img, idx) => (
                                                <div key={idx} className="flex-1 h-full relative">
                                                    <img src={img} alt="Preview" className="w-full h-full object-cover opacity-60" />
                                                </div>
                                            ))}
                                            {coverImagePreviews.length > 3 && (
                                                <div className="absolute inset-y-0 right-0 w-1/3 bg-black/70 flex items-center justify-center border-l border-espresso-800 backdrop-blur-sm">
                                                    <span className="text-white font-bold text-xs">+{coverImagePreviews.length - 3}</span>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                                <span className="bg-black/80 px-3 py-1 rounded-lg text-xs font-bold text-white shadow-lg">{t('club_list.btn_reset_images', { count: coverImagePreviews.length })}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <ImageIcon size={32} className="text-espresso-600 mb-2 group-hover:scale-110 transition-transform" />
                                            <span className="text-xs text-espresso-400 group-hover:text-amber-500 transition-colors">{t('club_list.desc_cover_image')}</span>
                                        </>
                                    )}
                                </div>
                                <input type="file" multiple ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                                </div>
                                <div>
                                    <label className="block text-[13px] font-medium text-espresso-300 mb-1.5">{t('club_list.lbl_location')}</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center object-contain pointer-events-none">
                                            <MapPin size={18} className="text-espresso-600" />
                                        </div>
                                        <input 
                                            type="text" 
                                            value={locationName}
                                            onChange={e => setLocationName(e.target.value)}
                                            placeholder={t('club_list.ph_location')}
                                            maxLength={50}
                                            className="w-full bg-espresso-950 border border-espresso-800 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-espresso-600 focus:outline-none focus:border-amber-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[13px] font-medium text-espresso-300 mb-1.5">{t('club_list.lbl_desc')}</label>
                                    <textarea 
                                        value={newClubDesc}
                                        onChange={e => setNewClubDesc(e.target.value)}
                                        placeholder={t('club_list.ph_desc')}
                                        rows={4}
                                        required
                                        className="w-full bg-espresso-950 border border-espresso-800 rounded-xl px-4 py-3 text-sm text-white placeholder-espresso-600 focus:outline-none focus:border-amber-500 resize-none"
                                    />
                                </div>
                                <div className="flex items-center justify-between p-4 bg-espresso-950 rounded-xl border border-espresso-800">
                                    <div>
                                        <div className="flex items-center gap-2 mb-0.5">
                                            {isPrivate ? <Lock size={16} className="text-amber-500" /> : <Globe size={16} className="text-emerald-500" />}
                                            <span className="text-[14px] font-bold text-white">{isPrivate ? t('club_list.lbl_private') : t('club_list.lbl_public')}</span>
                                        </div>
                                        <p className="text-[12px] text-espresso-400">{isPrivate ? t('club_list.desc_private') : t('club_list.desc_public')}</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} />
                                        <div className="w-11 h-6 bg-espresso-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                                    </label>
                                </div>

                                <button 
                                    type="submit"
                                    disabled={isSubmitting || !newClubName.trim() || !newClubDesc.trim()}
                                    className="w-full py-4 text-center mt-4 bg-amber-500 text-espresso-950 font-bold rounded-xl active:bg-amber-600 disabled:opacity-50"
                                >
                                    {isSubmitting ? t('club_list.btn_creating') : t('club_list.btn_create')}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}




