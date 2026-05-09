import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, MapPin, Video, Flame, ChevronRight, Play, Users, MessageSquare, Settings, X, ArrowUp, ArrowDown, Coffee, Heart, Zap, Gift } from 'lucide-react';
import { API_BASE, getDeviceCountryCode } from '../utils/apiConfig';
import { Geolocation } from '@capacitor/geolocation';
import PullToRefresh from '../components/common/PullToRefresh';
import MediaRenderer from '../components/community/MediaRenderer';
import { motion, AnimatePresence } from 'framer-motion';
import DailyRoulette from '../components/home/DailyRoulette';
import FlashDropBanner from '../components/home/FlashDropBanner';
import WeeklyTasteTest from '../components/home/WeeklyTasteTest';

interface PersonalizedHomeData {
    latestPrescription: any;
    followingFeeds: any[];
    tasteMatchedFeeds: any[];
    myClubFeeds: any[];
    recommendedClubs: any[];
}

// In-memory cache to prevent loading screens when re-entering the tab
let globalHomeCache: any = null;
export const clearHomeCache = () => { globalHomeCache = null; };

const getFullImageUrl = (url: string | null | undefined) => {
    if (!url) return '';
    if (url.startsWith('/mock-bucket')) return 'https://images.unsplash.com/photo-1554118811-1e0d58224f24';
    if (url.startsWith('/') && !url.startsWith('//')) return `${API_BASE}${url}`;
    return url;
};

const getFirstImage = (imageStr: string | null | undefined) => {
    if (!imageStr) return null;
    try {
        const parsed = JSON.parse(imageStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
            return getFullImageUrl(parsed[0]);
        }
        return getFullImageUrl(imageStr);
    } catch {
        return getFullImageUrl(imageStr);
    }
};

const getFirstVideo = (imageStr: string | null | undefined) => {
    if (!imageStr) return null;
    try {
        const parsed = JSON.parse(imageStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
            const videoUrl = parsed.find((url: string) => url.match(/\.(mp4|webm|ogg|mov|m4v|3gp|avi)(\b|$)/i) || url.includes('video'));
            if (videoUrl) return getFullImageUrl(videoUrl);
            return getFullImageUrl(parsed[0]);
        }
        return getFullImageUrl(imageStr);
    } catch {
        return getFullImageUrl(imageStr);
    }
};

interface HomeSectionConfig {
  id: string;
  name: string;
  isVisible: boolean;
  order: number;
  isFixed?: boolean;
}

const DEFAULT_LAYOUT: HomeSectionConfig[] = [
  { id: 'hero', name: 'home.sections.hero', isVisible: true, order: 1, isFixed: true },
  { id: 'flash_drop', name: 'home.sections.flash_drop', isVisible: true, order: 2 },
  { id: 'daily_roulette', name: 'home.sections.daily_roulette', isVisible: true, order: 3 },
  { id: 'shorts', name: 'home.sections.shorts', isVisible: true, order: 4 },
  { id: 'trending', name: 'home.sections.trending', isVisible: true, order: 5 },
  { id: 'following', name: 'home.sections.following', isVisible: true, order: 6 },
  { id: 'taste_match', name: 'home.sections.taste_match', isVisible: true, order: 7 },
  { id: 'coffee_pairing', name: 'home.sections.coffee_pairing', isVisible: true, order: 8 },
  { id: 'my_clubs', name: 'home.sections.my_clubs', isVisible: true, order: 9 },
  { id: 'recommended_clubs', name: 'home.sections.recommended_clubs', isVisible: true, order: 10 }
];

const CoffeePairingSection = () => {
    const { t } = useTranslation();
    const [activeDessert, setActiveDessert] = React.useState<number | null>(null);

    const DESSERTS = [
      { icon: '🥐', name: '크루아상', coffee: '플랫 화이트', desc: '버터의 풍미를 살려주는 진하고 부드러운 우유' },
      { icon: '🍰', name: '딸기 케이크', coffee: '에티오피아 예가체프', desc: '생크림의 느끼함을 잡아주는 화사한 산미' },
      { icon: '🍫', name: '초콜릿', coffee: '다크 로스트 에스프레소', desc: '카카오의 쌉싸름함을 극대화하는 깊은 바디감' },
      { icon: '🥯', name: '베이글', coffee: '아메리카노', desc: '담백한 빵과 어울리는 깔끔한 피니시' },
    ];

    const COMMUNITY_PAIRINGS = [
      { id: 1, title: '바닐라 라떼 & 까눌레', author: '커피마스터', image: 'https://images.unsplash.com/photo-1559525839-b184a4d698c7?w=300&q=80', likes: 24 },
      { id: 2, title: '드립커피 & 치즈케이크', author: '디저트덕후', image: 'https://images.unsplash.com/photo-1514517220017-8ce97a34a7b6?w=300&q=80', likes: 18 },
      { id: 3, title: '에스프레소 & 티라미수', author: '로스터리랩', image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=300&q=80', likes: 56 },
    ];

    return (
        <section className="pt-6 pb-2 border-t border-espresso-800 bg-gradient-to-b from-espresso-950 to-[#160d08]">
            <div className="px-4 flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-[17px] font-bold flex items-center gap-2 text-espresso-50">
                        <Sparkles className="text-amber-500 w-4 h-4" /> 
                        {t('home.title_pairing', '오늘의 완벽한 페어링')}
                    </h3>
                    <p className="text-[12px] text-espresso-400 mt-1">지금 먹고 싶은 디저트를 골라보세요!</p>
                </div>
            </div>

            {/* AI Pairing Roulette */}
            <div className="flex gap-4 overflow-x-auto px-4 pb-2 snap-x hide-scrollbar mb-4">
                {DESSERTS.map((item, idx) => (
                    <button 
                        key={idx}
                        onClick={() => setActiveDessert(activeDessert === idx ? null : idx)}
                        className={`flex flex-col items-center justify-center min-w-[90px] h-[90px] rounded-2xl shrink-0 snap-center transition-all duration-300 border-2 shadow-md ${activeDessert === idx ? 'bg-gradient-to-b from-amber-500/20 to-transparent border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]' : 'bg-espresso-800/80 border-espresso-700 hover:border-amber-500/50 hover:bg-espresso-800'}`}
                    >
                        <span className="text-[32px] mb-1 drop-shadow-sm">{item.icon}</span>
                        <span className={`text-[12px] font-black tracking-tight transition-colors ${activeDessert === idx ? 'text-amber-400' : 'text-espresso-200'}`}>{item.name}</span>
                    </button>
                ))}
            </div>

            <AnimatePresence>
                {activeDessert !== null && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-4 mb-6 overflow-hidden"
                    >
                        <div className="bg-gradient-to-br from-[#2a1a10] to-[#1a100a] border border-amber-500/30 rounded-2xl p-4 shadow-lg flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20 text-amber-500 shadow-inner">
                                <Coffee size={24} />
                            </div>
                            <div>
                                <div className="text-[11px] font-bold text-amber-500 mb-1">{DESSERTS[activeDessert].name}에는 이런 커피 어때요?</div>
                                <div className="text-[15px] font-black text-espresso-50 mb-1">{DESSERTS[activeDessert].coffee}</div>
                                <div className="text-[12px] text-espresso-300 line-clamp-2 leading-snug">{DESSERTS[activeDessert].desc}</div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Community Gallery */}
            <div className="px-4 flex items-center justify-between mb-3 mt-2">
                <h4 className="text-[14px] font-bold text-espresso-200">유저들의 페어링 추천</h4>
            </div>
            <div className="flex gap-3 overflow-x-auto px-4 pb-4 snap-x hide-scrollbar">
                {COMMUNITY_PAIRINGS.map((post) => (
                    <div key={post.id} className="relative w-[140px] h-[180px] rounded-2xl overflow-hidden shrink-0 snap-center shadow-lg group cursor-pointer border border-espresso-800">
                        <img src={post.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#120a05]/90 via-[#120a05]/30 to-transparent flex flex-col justify-end p-3">
                            <span className="text-[12px] font-bold text-espresso-50 leading-tight mb-1">{post.title}</span>
                            <div className="flex justify-between items-center w-full">
                                <span className="text-[10px] text-espresso-300">{post.author}</span>
                                <div className="flex items-center gap-1 text-[10px] text-amber-400 font-bold"><Heart size={10} fill="currentColor"/> {post.likes}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

const HomeLayoutEditor = ({ 
  isOpen, 
  onClose, 
  currentLayout, 
  onSave 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  currentLayout: HomeSectionConfig[]; 
  onSave: (newLayout: HomeSectionConfig[]) => void;
}) => {
  const { t } = useTranslation();
  const [layout, React_useState] = React.useState<HomeSectionConfig[]>([]);
  
  React.useEffect(() => {
    if (isOpen) React_useState([...currentLayout].sort((a, b) => a.order - b.order));
  }, [isOpen, currentLayout]);

  if (!isOpen) return null;

  const handleToggle = (id: string) => {
    const activeCount = layout.filter(l => l.isVisible && !l.isFixed).length + layout.filter(l => l.isFixed).length;
    React_useState(prev => prev.map(item => {
      if (item.id === id) {
        if (item.isVisible && activeCount <= 2 && !item.isFixed) {
           alert(t('home.layoutEditor.min_section_alert'));
           return item;
        }
        return { ...item, isVisible: !item.isVisible };
      }
      return item;
    }));
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const newLayout = [...layout];
      const temp = newLayout[index];
      newLayout[index] = newLayout[index - 1];
      newLayout[index - 1] = temp;
      newLayout.forEach((item, i) => item.order = i + 1);
      React_useState(newLayout);
    } else if (direction === 'down' && index < layout.length - 1) {
      const newLayout = [...layout];
      const temp = newLayout[index];
      newLayout[index] = newLayout[index + 1];
      newLayout[index + 1] = temp;
      newLayout.forEach((item, i) => item.order = i + 1);
      React_useState(newLayout);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-espresso-900 w-full sm:w-[400px] max-h-[85vh] rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0">
        <div className="p-5 border-b border-espresso-800 flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-espresso-50">{t('home.layoutEditor.title')}</h2>
          <button onClick={onClose} className="p-2 -mr-2 text-espresso-400 hover:text-espresso-50"><X size={20} /></button>
        </div>
        <div className="p-5 flex-1 overflow-y-auto">
          <p className="text-[13px] text-espresso-300 mb-4">{t('home.layoutEditor.subtitle')}</p>
          <div className="space-y-3">
            {layout.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-3 bg-espresso-800/50 p-3 rounded-xl border border-espresso-800">
                <div className="flex flex-col gap-1">
                  <button disabled={idx === 0} onClick={() => moveItem(idx, 'up')} className="text-espresso-400 hover:text-white disabled:opacity-30"><ArrowUp size={16} /></button>
                  <button disabled={idx === layout.length - 1} onClick={() => moveItem(idx, 'down')} className="text-espresso-400 hover:text-white disabled:opacity-30"><ArrowDown size={16} /></button>
                </div>
                <div className="flex-1 font-medium text-[14px] text-espresso-50">
                  {t(item.name)} {item.isFixed && <span className="text-[10px] bg-espresso-950 px-1.5 py-0.5 rounded text-amber-500 ml-2">{t('home.layoutEditor.fixed')}</span>}
                </div>
                <button 
                  onClick={() => !item.isFixed && handleToggle(item.id)}
                  className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${item.isVisible ? 'bg-amber-500' : 'bg-espresso-950'} ${item.isFixed ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${item.isVisible ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-espresso-800 bg-espresso-900 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button onClick={() => onSave(layout)} className="w-full py-3.5 bg-amber-500 text-espresso-950 font-bold rounded-xl text-[15px] hover:bg-amber-400 transition-colors">{t('home.layoutEditor.save')}</button>
        </div>
      </div>
    </div>
  );
};

export default function HomeDashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(!globalHomeCache);
  const [shorts, setShorts] = useState<any[]>(globalHomeCache?.shorts || []);

  const [pilgrimageFeeds, setPilgrimageFeeds] = useState<any[]>(globalHomeCache?.pilgrimageFeeds || []);
  const [activeClubs, setActiveClubs] = useState<any[]>(globalHomeCache?.activeClubs || []);
  const [personalizedData, setPersonalizedData] = useState<PersonalizedHomeData | null>(globalHomeCache?.personalizedData || null);
  
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isLoggedIn = !!localStorage.getItem('token');

  const [layoutConfigs, setLayoutConfigs] = useState<HomeSectionConfig[]>(globalHomeCache?.layoutConfigs || DEFAULT_LAYOUT);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  useEffect(() => {
    // Reconcile missing sections from DEFAULT_LAYOUT into layoutConfigs (in case of stale cache)
    setLayoutConfigs(prev => {
      const missing = DEFAULT_LAYOUT.filter(def => !prev.some(p => p.id === def.id));
      if (missing.length > 0) {
        const merged = [...prev, ...missing].sort((a, b) => a.order - b.order);
        if (globalHomeCache) globalHomeCache.layoutConfigs = merged;
        return merged;
      }
      return prev;
    });
  }, []);


  const fetchHomeData = async (silent = false) => {
    if (!silent && !globalHomeCache) setIsLoading(true);
    const headers: any = {};
    if (isLoggedIn) headers['Authorization'] = `Bearer ${localStorage.getItem('token')}`;
    
    try {
      const countryCode = getDeviceCountryCode();
      if (!globalHomeCache) {
          globalHomeCache = {
              shorts: [], pilgrimageFeeds: [], activeClubs: [], personalizedData: null, layoutConfigs: layoutConfigs, gpsLat: '', gpsLng: ''
          };
      }

      // 1. Fetch Me & Layout independently
      if (isLoggedIn) {
          fetch(`${API_BASE}/api/users/me`, { headers })
            .then(r => r.ok ? r.json() : null)
            .then(meData => {
                if (meData) {
                    localStorage.setItem('user', JSON.stringify(meData));
                    if (meData.homeLayout && Array.isArray(meData.homeLayout) && meData.homeLayout.length > 0) {
                        const savedLayout = meData.homeLayout as HomeSectionConfig[];
                        const mergedLayout = DEFAULT_LAYOUT.map(defaultItem => {
                            const savedItem = savedLayout.find(item => item.id === defaultItem.id);
                            return savedItem ? { ...defaultItem, isVisible: savedItem.isVisible, order: savedItem.order } : defaultItem;
                        });
                        savedLayout.forEach(savedItem => {
                            if (!mergedLayout.find(item => item.id === savedItem.id)) mergedLayout.push(savedItem);
                        });
                        mergedLayout.sort((a, b) => a.order - b.order);
                        setLayoutConfigs(mergedLayout);
                        if (globalHomeCache) globalHomeCache.layoutConfigs = mergedLayout;
                    }
                }
            }).catch(() => {});
      }

      // 2. Fetch Shorts independently
      fetch(`${API_BASE}/api/community/posts?filter=shorts&countryCode=${countryCode}`, { headers })
        .then(r => r.ok ? r.json() : [])
        .then(shortsData => {
            const newShorts = (shortsData || []).slice(0, 10);
            setShorts(newShorts);
            if (globalHomeCache) globalHomeCache.shorts = newShorts;
        }).catch(() => {});

      // 3. Fetch Trending independently
      fetch(`${API_BASE}/api/shops/trending?countryCode=${countryCode}`, { headers })
        .then(r => r.ok ? r.json() : [])
        .then(trendingData => {
            const newPilgrimageFeeds = trendingData || [];
            setPilgrimageFeeds(newPilgrimageFeeds);
            if (globalHomeCache) globalHomeCache.pilgrimageFeeds = newPilgrimageFeeds;
        }).catch(() => {});

      // 4. GPS & Location-dependent Data
      let fastLat = globalHomeCache?.gpsLat || '';
      let fastLng = globalHomeCache?.gpsLng || '';

      const processLocationDependentData = (lat: string, lng: string) => {
          // Clubs
          fetch(`${API_BASE}/api/clubs?countryCode=${countryCode}`, { headers })
            .then(r => r.ok ? r.json() : { all: [] })
            .then(clubsData => {
                if (clubsData && clubsData.all) {
                    let sortedClubs = [...clubsData.all];
                    if (lat && lng) {
                        const myLat = parseFloat(lat);
                        const myLng = parseFloat(lng);
                        sortedClubs.forEach((c: any) => {
                            if (c.lat && c.lng) {
                                const dLat = c.lat - myLat;
                                const dLng = c.lng - myLng;
                                c._distance = dLat * dLat + dLng * dLng;
                            } else {
                                c._distance = 999999;
                            }
                        });
                        sortedClubs.sort((a: any, b: any) => {
                            if (a.isRecruiting && !b.isRecruiting) return -1;
                            if (!a.isRecruiting && b.isRecruiting) return 1;
                            return a._distance - b._distance;
                        });
                    } else if (currentUser?.location) {
                        const userLoc = currentUser.location.split(' ')[0];
                        sortedClubs = sortedClubs.filter((c: any) => c.locationName && c.locationName.includes(userLoc));
                        sortedClubs.sort((a: any, b: any) => {
                            if (a.isRecruiting && !b.isRecruiting) return -1;
                            if (!a.isRecruiting && b.isRecruiting) return 1;
                            return b.memberCount - a.memberCount;
                        });
                    } else {
                        // Fallback: show nationwide popular clubs when location is not available
                        sortedClubs.sort((a: any, b: any) => {
                            if (a.isRecruiting && !b.isRecruiting) return -1;
                            if (!a.isRecruiting && b.isRecruiting) return 1;
                            return b.memberCount - a.memberCount;
                        });
                    }
                    const newActiveClubs = sortedClubs.slice(0, 6);
                    setActiveClubs(newActiveClubs);
                    if (globalHomeCache) globalHomeCache.activeClubs = newActiveClubs;
                }
            }).catch(() => {});

          // Personalized Data
          if (isLoggedIn) {
              const qsBase = `countryCode=${countryCode}`;
              const qs = lat ? `?lat=${lat}&lng=${lng}&${qsBase}` : `?${qsBase}`;
              fetch(`${API_BASE}/api/home/personalized${qs}`, { headers })
                .then(r => r.ok ? r.json() : null)
                .then(pData => {
                    if (pData) {
                        setPersonalizedData(pData);
                        if (globalHomeCache) globalHomeCache.personalizedData = pData;
                    }
                }).catch(() => {});
          }
      };

      if (!silent || !fastLat) {
          // Fast GPS Fetch (max 1.5 seconds)
          new Promise<{lat: string, lng: string}>((resolve) => {
              Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 1500 })
                  .then(pos => resolve({ lat: pos.coords.latitude.toString(), lng: pos.coords.longitude.toString() }))
                  .catch(() => {
                      if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition(
                              pos => resolve({ lat: pos.coords.latitude.toString(), lng: pos.coords.longitude.toString() }),
                              err => resolve({ lat: '', lng: '' }),
                              { timeout: 1500, maximumAge: 600000 }
                          );
                      } else {
                          resolve({ lat: '', lng: '' });
                      }
                  });
          }).then(gpsData => {
              if (gpsData.lat) {
                  fastLat = gpsData.lat;
                  fastLng = gpsData.lng;
                  if (globalHomeCache) {
                      globalHomeCache.gpsLat = fastLat;
                      globalHomeCache.gpsLng = fastLng;
                  }
              }
              processLocationDependentData(fastLat, fastLng);
              if (!silent) setIsLoading(false);
          });
      } else {
          processLocationDependentData(fastLat, fastLng);
          if (!silent) setIsLoading(false);
      }

    } catch (e) {
      console.error('Failed to load home data', e);
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (globalHomeCache) {
      fetchHomeData(true); // background refresh
    } else {
      fetchHomeData(false);
    }
  }, [i18n.language]);


  const handleSaveLayout = async (newLayout: HomeSectionConfig[]) => {
    if (isLoggedIn) {
      try {
        const headers: any = { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        };
        const res = await fetch(`${API_BASE}/api/users/me/home-layout`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ layout: newLayout })
        });
        
        if (!res.ok) {
           alert("설정 저장에 실패했습니다. 다시 로그인해주세요.");
           return; // Abort if save failed!
        }
      } catch (error) {
        console.error("Failed to save layout", error);
        alert("설정 저장에 실패했습니다. 네트워크를 확인해주세요.");
        return;
      }
    }
    
    // Only update local state if save was successful (or if not logged in)
    setLayoutConfigs(newLayout);
    setIsEditorOpen(false);
    if (globalHomeCache) globalHomeCache.layoutConfigs = newLayout;
  };

  const greetingName = currentUser?.nickname || t('home.guest', '방문자');

  return (
    <div className="absolute inset-0 bg-espresso-950 text-espresso-50 flex flex-col font-sans overflow-hidden">

      <HomeLayoutEditor 
        isOpen={isEditorOpen} 
        onClose={() => setIsEditorOpen(false)} 
        currentLayout={layoutConfigs}
        onSave={handleSaveLayout}
      />

      <header className="shrink-0 z-50 bg-espresso-900/80 backdrop-blur-xl border-b border-espresso-700/80 pt-safe">
        <div className="px-4 py-2.5 flex items-center justify-between">
            <h1 className="text-[18px] font-extrabold tracking-tight text-espresso-50 flex items-center gap-2">
              BeanMind
            </h1>
            
            <div className="flex items-center gap-3">
              <button onClick={() => setIsEditorOpen(true)} className="text-espresso-400 hover:text-amber-500 transition-colors p-1">
                <Settings size={20} />
              </button>
              <Sparkles className="text-amber-500 w-5 h-5" />
            </div>
        </div>
      </header>

      <PullToRefresh onRefresh={async () => { await fetchHomeData(false); }} className="flex-1 overflow-y-auto pb-24">
        {layoutConfigs.filter(l => l.isVisible).sort((a,b) => a.order - b.order).map(config => {


  if (config.id === 'hero') return (
        <section key={config.id} className="w-full">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            onClick={() => navigate('/curator', { state: { startFresh: true } })}
            className="relative w-full min-h-[260px] cursor-pointer group rounded-b-[2.5rem] overflow-hidden shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] mb-1 border-b border-espresso-800/30"
          >
            {/* Full Edge-to-Edge Image */}
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] ease-linear group-hover:scale-110"
              style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1559525839-b184a4d698c7?auto=format&fit=crop&w=800&q=80)' }}
            />
            {/* Dramatic Editorial Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
            
            <div className="absolute inset-0 px-6 pb-6 flex flex-col justify-end z-10">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-[1px] bg-amber-500/80" />
                  <span className="text-[9px] font-black tracking-[0.3em] text-amber-500/90 uppercase">
                    Curation
                  </span>
                </div>
                
                <h2 className="text-white">
                  {personalizedData?.latestPrescription ? (
                      <>
                          <span className="block text-[12px] text-espresso-200 font-light mb-2 tracking-widest uppercase">
                            {t('home.hero_title_1', '{{name}}님,', { name: greetingName })}
                          </span>
                          <span className="block text-[22px] font-serif leading-[1.1] tracking-tight text-white/95">
                            지난번 추천받으신
                          </span>
                          <span className="block text-[22px] font-serif leading-[1.1] tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-white mt-1 truncate max-w-full">
                            {personalizedData.latestPrescription.beanName}
                          </span>
                          <span className="block text-[11px] font-light text-espresso-200 mt-2 leading-relaxed max-w-[80%]">어떠셨나요? 당신을 위한 새로운 한 잔을 제안합니다.</span>
                      </>
                  ) : (
                      <>
                          <span className="block text-[12px] text-espresso-200 font-light mb-2 tracking-widest uppercase">
                            {t('home.hero_title_1', '{{name}}님,', { name: greetingName })}
                          </span>
                          <span className="block text-[24px] font-serif font-medium leading-[1.1] tracking-tight text-white/95">
                            오늘의
                          </span>
                          <span className="block text-[24px] font-serif font-medium leading-[1.1] tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-white mt-1">
                            커피 취향
                          </span>
                      </>
                  )}
                </h2>
                
                <div className="mt-4 flex items-center">
                  <button className="text-white text-[10px] font-bold tracking-widest uppercase flex items-center gap-2 group-hover:text-amber-400 transition-colors">
                    {t('home.btn_get_recommend', 'Discover More')} 
                    <div className="w-6 h-6 rounded-full border border-white/30 flex items-center justify-center group-hover:border-amber-400 transition-colors">
                        <ChevronRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </section>
  );

        {/* --- PERSONALIZED SECTIONS --- */}
                      if (config.id === 'following') return isLoggedIn && personalizedData && personalizedData.followingFeeds && personalizedData.followingFeeds.length > 0 && (
              <section key={config.id} className="py-2 mt-1">
                 <div className="px-6 flex items-center justify-between mb-3">
                   <h3 className="text-[20px] font-serif tracking-tight text-white flex items-center gap-2">
                     <Users className="text-blue-500 w-4 h-4" /> {t('home.title_following_news', '내 이웃 & 단골 소식')}
                   </h3>
                 </div>
                 <div className="flex gap-4 overflow-x-auto px-6 pb-6 snap-x hide-scrollbar">
                    {personalizedData.followingFeeds.map((post: any) => (
                      <div 
                        key={post.id}
                        onClick={() => navigate('/community', { state: { activePost: post.id } })}
                        className="w-[160px] flex flex-col shrink-0 snap-center cursor-pointer group"
                      >
                        <div className="w-full h-[160px] rounded-2xl bg-espresso-800 overflow-hidden relative shadow-md border border-espresso-800 group-hover:border-blue-500/50 transition-colors">
                          <div className="w-full h-full pointer-events-none">
                            {getFirstImage(post.image) ? (
                                <MediaRenderer 
                                  src={getFirstImage(post.image)} 
                                  className="w-full h-full object-cover" 
                                  hideControls={true} 
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-espresso-800 to-espresso-950 flex flex-col items-center justify-center p-4">
                                    <MessageSquare size={24} className="text-espresso-600 mb-2" />
                                    <p className="text-[11px] text-espresso-300 text-center line-clamp-3 font-medium leading-relaxed italic opacity-80">"{post.content}"</p>
                                </div>
                            )}
                          </div>
                          <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
                            <img 
                              src={post.author?.profileImageUrl ? (post.author.profileImageUrl.startsWith('http') ? post.author.profileImageUrl : `${API_BASE}${post.author.profileImageUrl}`) : 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&q=80'} 
                              className="w-6 h-6 rounded-full border-[1.5px] border-white/80 object-cover shadow-sm" 
                              alt="Profile"
                            />
                            <span className="text-[11px] font-bold text-white drop-shadow-md truncate">{post.author?.nickname}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                 </div>
              </section>
            );
            
              if (config.id === 'flash_drop') return <FlashDropBanner key={config.id} />;
      if (config.id === 'daily_roulette') return <DailyRoulette key={config.id} />;
      if (config.id === 'weekly_mbti') return <WeeklyTasteTest key={config.id} />;

      if (config.id === 'taste_match') return isLoggedIn && personalizedData && personalizedData.tasteMatchedFeeds && personalizedData.tasteMatchedFeeds.length > 0 && (
              <section key={config.id} className="py-2 mt-1">
                 <div className="px-6 flex items-center justify-between mb-3">
                   <h3 className="text-[20px] font-serif tracking-tight text-white flex items-center gap-2">
                     <Sparkles className="text-amber-500 w-4 h-4" /> {t('home.title_taste_match', '{{name}}님 취향 저격 피드', { name: greetingName })}
                   </h3>
                 </div>
                 <div className="flex gap-4 overflow-x-auto px-6 pb-6 snap-x hide-scrollbar">
                    {personalizedData.tasteMatchedFeeds.map((post: any) => (
                      <div 
                        key={post.id}
                        onClick={() => navigate('/community', { state: { activePost: post.id } })}
                        className="w-[160px] flex flex-col shrink-0 snap-center cursor-pointer group bg-transparent"
                      >
                        <div className="w-full h-[160px] rounded-2xl bg-espresso-800 overflow-hidden relative mb-2 shadow-md border border-espresso-800 group-hover:border-amber-500/50 transition-colors">
                          <div className="w-full h-full pointer-events-none">
                            <MediaRenderer 
                              src={getFirstImage(post.image) || 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf'} 
                              className="w-full h-full object-cover" 
                              hideControls={true} 
                            />
                          </div>
                        </div>
                        <p className="font-medium text-[12px] line-clamp-2 text-espresso-100 px-1 leading-snug">
                          {post.content}
                        </p>
                      </div>
                    ))}
                 </div>
              </section>
            );

            if (config.id === 'my_clubs') return isLoggedIn && personalizedData && personalizedData.myClubFeeds && personalizedData.myClubFeeds.length > 0 && (
              <section key={config.id} className="py-2 mt-1">
                 <div className="px-6 flex items-center justify-between mb-3">
                   <h3 className="text-[20px] font-serif tracking-tight text-white flex items-center gap-2">
                     <Users className="text-emerald-500 w-4 h-4" /> 
                     나의 크루 최신 소식
                   </h3>
                   <button onClick={() => navigate('/clubs')} className="text-[12px] text-espresso-400 font-medium">{t('home.btn_more', '더보기')}</button>
                 </div>
                 
                 <div className="flex gap-4 overflow-x-auto px-6 pb-6 snap-x hide-scrollbar">
                   {personalizedData.myClubFeeds.map((post: any) => (
                     <div 
                       key={post.id}
                       onClick={() => navigate(`/clubs/${post.club?.id}`)}
                       className="w-[calc(100vw-48px)] max-w-[340px] h-[180px] shrink-0 snap-center cursor-pointer group rounded-3xl overflow-hidden relative shadow-lg border border-espresso-800 hover:border-emerald-500/50 transition-colors"
                     >
                       <div className="absolute inset-0 pointer-events-none bg-espresso-800">
                           <MediaRenderer 
                             src={getFirstImage(post.image) || getFirstImage(post.club?.coverImageUrl) || 'https://images.unsplash.com/photo-1511920170033-f8396924c348'} 
                             className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                             hideControls={true} 
                           />
                       </div>
                       <div className="absolute inset-0 flex flex-col justify-end p-5 bg-black/20">
                           <span className="text-[13px] font-black text-emerald-400 tracking-wider drop-shadow-md mb-1">{post.club?.name}</span>
                           <p className="font-bold text-[15px] line-clamp-2 text-white leading-snug drop-shadow-md">{post.content}</p>
                           <div className="flex items-center gap-2 mt-3">
                               {post.club?.locationName && (
                                   <span className="text-[11px] text-espresso-200 font-medium flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/10">
                                       <MapPin size={10} className="text-emerald-500" /> {post.club.locationName}
                                   </span>
                               )}
                               {post.club?.isRecruiting && (
                                   <span className="text-[10px] font-bold text-white bg-emerald-500 px-2 py-0.5 rounded-full shadow-sm">
                                       모집중
                                   </span>
                               )}
                           </div>
                       </div>
                     </div>
                   ))}
                 </div>
              </section>
            );
          // Remove fragments for mapping

          if (config.id === 'shorts') return (
        <section key={config.id} className="py-2">
          <div className="px-4 flex items-center justify-between mb-4 mt-2">
            <h3 className="text-[22px] font-serif tracking-tight text-white flex items-center gap-2">
              <Video className="text-amber-500 w-5 h-5" /> 1분 커피 탐험
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3 px-4 pb-4">
            {isLoading ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="aspect-[4/5] w-full bg-espresso-800 animate-pulse rounded-2xl shrink-0" />
              ))
            ) : shorts.length === 0 ? (
              <div className="col-span-2 aspect-[4/5] w-full flex items-center justify-center text-espresso-400 text-[13px] font-medium bg-espresso-900/20 rounded-2xl border border-espresso-800/50">
                  아직 인기있는 숏폼 피드가 없습니다.
              </div>
            ) : shorts.slice(0, 4).map((post) => (
              <div 
                key={post.id}
                className="relative aspect-[4/5] w-full rounded-2xl bg-espresso-800 overflow-hidden shrink-0 shadow-md cursor-pointer group"
                onClick={() => navigate('/community', { state: { filter: 'shorts', activePost: post.id } })}
              >
                {post.image ? (
                   <div className="w-full h-full pointer-events-none transition-transform duration-700 group-hover:scale-105">
                       <MediaRenderer 
                           src={getFirstVideo(post.image) || ''} 
                           className="w-full h-full object-cover" 
                           autoPlay={true}
                           forceVideo={true}
                           hideControls={true}
                       />
                   </div>
                ) : (
                   <div className="w-full h-full bg-espresso-900" />
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Play className="w-4 h-4 text-white ml-0.5" fill="currentColor" />
                  </div>
                </div>
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-[11px] font-bold text-white line-clamp-2 leading-tight">
                    {post.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
  );

          if (config.id === 'trending') return (
        <section key={config.id} className="py-2 mt-1">
          <div className="px-6 flex items-center justify-between mb-3">
            <h3 className="text-[20px] font-serif tracking-tight text-white flex items-center gap-2">
              <MapPin className="text-amber-500 w-4 h-4" /> {t('home.title_trending_cafes', '요즘 뜨는 성지')}
            </h3>
            <button onClick={() => navigate('/community', { state: { filter: 'pilgrimage_talk' } })} className="text-[12px] text-espresso-400 font-medium">{t('home.btn_more', '더보기')}</button>
          </div>
          <div className="flex gap-3 overflow-x-auto px-4 pb-4 snap-x hide-scrollbar">
            {isLoading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="w-[160px] h-[160px] bg-espresso-800 animate-pulse rounded-2xl shrink-0 snap-center" />
              ))
            ) : pilgrimageFeeds.length === 0 ? (
              <div className="w-full h-[160px] flex flex-col items-center justify-center text-espresso-400 bg-espresso-900/20 rounded-2xl border border-espresso-800/50">
                  <MapPin size={24} className="mb-2 opacity-50" />
                  <span className="text-[13px] font-medium">이 지역의 뜨는 성지가 없습니다.</span>
              </div>
            ) : pilgrimageFeeds.map((store) => (
              <div 
                key={store.id}
                onClick={() => navigate('/map', { state: { targetShopId: store.id, targetLat: store.lat, targetLng: store.lng, targetName: store.name } })}
                className="w-[160px] flex flex-col shrink-0 snap-center cursor-pointer group"
              >
                <div className="w-full h-[160px] rounded-2xl bg-espresso-800 overflow-hidden relative shadow-md border border-espresso-800 group-hover:border-amber-500/50 transition-colors">
                  <div className="w-full h-full pointer-events-none">
                    <MediaRenderer 
                      src={getFirstImage(store.mainImageUrl) || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24'} 
                      className="w-full h-full object-cover" 
                      hideControls={true} 
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2 flex items-center">
                    <div className="text-[10px] font-bold bg-amber-500 text-espresso-950 px-1.5 py-0.5 rounded flex items-center gap-0.5 max-w-full">
                       <MapPin size={10} className="shrink-0" /> 
                       <span className="truncate">{store.name}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
  );


          if (config.id === 'coffee_pairing') return <CoffeePairingSection key={config.id} />;

          if (config.id === 'recommended_clubs') return (
        <section key={config.id} className="pt-2 pb-4">
          <div className="px-4 flex items-center justify-between mb-3">
            <h3 className="text-[16px] font-bold flex items-center gap-1.5">
              <Users className="text-amber-500 w-4 h-4" /> {t('home.title_recommended_clubs', '우리 동네 추천 크루')}
            </h3>
            <button onClick={() => navigate('/clubs')} className="text-[12px] text-espresso-400 font-medium">{t('home.btn_more', '더보기')}</button>
          </div>
          <div className="grid grid-cols-2 gap-3 px-4 pb-4">
            {isLoading ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="w-full h-[160px] bg-espresso-800 animate-pulse rounded-2xl" />
              ))
            ) : activeClubs.length === 0 ? (
              <div className="col-span-2 w-full h-[120px] flex flex-col items-center justify-center text-espresso-400 bg-espresso-900/20 rounded-2xl border border-espresso-800/50">
                  <Users size={24} className="mb-2 opacity-50" />
                  <span className="text-[13px] font-medium text-center">반경 20km 내에 활발한 크루가 없습니다.<br/><span className="text-[11px]">직접 모임을 열어보시는 건 어떨까요?</span></span>
              </div>
            ) : activeClubs.map((club) => (
              <div 
                key={club.id}
                onClick={() => navigate(`/clubs/${club.id}`)}
                className="w-full flex flex-col cursor-pointer group relative bg-espresso-900 rounded-2xl border border-espresso-700/50 hover:border-amber-500 transition-colors overflow-hidden shadow-md"
              >
                <div className="w-full h-[90px] bg-espresso-800 overflow-hidden relative">
                  <img src={getFirstImage(club.coverImageUrl) || 'https://images.unsplash.com/photo-1521017430205-0229078e4dcc'} alt="club cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  {club.isRecruiting && (
                    <div className="absolute top-2 left-2 bg-amber-500 text-espresso-950 text-[10px] font-bold px-1.5 py-0.5 rounded-sm shadow-sm">
                      {t('home.badge_recruiting', '모집중')}
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h4 className="font-bold text-[13px] text-espresso-50 truncate mb-1">{club.name}</h4>
                  <p className="text-[11px] text-espresso-400 line-clamp-2 leading-tight mb-2">
                    {club.description}
                  </p>
                  <div className="flex items-center justify-between text-[10px] font-medium text-espresso-300">
                    <span className="flex items-center gap-1 truncate max-w-[80px]">
                      <MapPin size={10} className="shrink-0" /> {club.locationName || t('home.lbl_nationwide', '전국')}
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                      <Users size={10} className="text-amber-500" /> {club.memberCount}/{club.maxMembers}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
  );
  return null;
})}

      </PullToRefresh>
    </div>
  );
}
