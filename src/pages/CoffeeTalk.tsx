import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share2, MapPin, MoreVertical, X, Clock, Navigation, CheckCircle, Store, Send, Image as ImageIcon, Flame, TrendingUp, Droplets, Trophy, Lock, Users, Target, UserCheck, Shield, Bookmark, Edit, Trash2, Calendar, Coffee, ListChecks, Link, Globe, Info, Search, ChevronDown, Camera, Star, Map, User, Edit2, Gift, PenSquare, Scale, Thermometer, Timer, Settings, BarChart2, Plus, Minus, Crown, ChevronRight, Check, Smile, ChevronLeft, Play, Music, Pause, Sparkles } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Share as CapacitorShare } from '@capacitor/share';
import { motion, AnimatePresence } from 'framer-motion';
import CommentSheet from '../components/community/CommentSheet';
import CommentImageGallerySheet from '../components/community/CommentImageGallerySheet';
import ShopSearch from '../components/community/ShopSearch';
import MediaRenderer from '../components/community/MediaRenderer';
import CollectionSaveSheet from '../components/community/CollectionSaveSheet';
import MediaCarousel from '../components/community/MediaCarousel';
import TastingRadarChart from '../components/community/TastingRadarChart';
import { API_BASE, getDeviceCountryCode } from '../utils/apiConfig';
import { useTranslation } from 'react-i18next';
import NativeAdBanner, { AdCampaign } from '../components/NativeAdBanner';
import PrescriptionTicket from '../components/PrescriptionTicket';
import ShopDetailModal from '../components/ShopDetailModal';
import { UserPublicProfileModal } from '../components/UserPublicProfileModal';
import UserFollowBadge from '../components/UserFollowBadge';
import SharedCoffeeMap from '../components/SharedCoffeeMap';
import PullToRefresh from '../components/common/PullToRefresh';
import { COFFEE_BEANS, BRANDS } from '../data/coffeeData';
import EmojiPicker, { Theme, EmojiStyle } from 'emoji-picker-react';
import { formatRelativeTime } from '../utils/dateFormatter';
import HotspotMap from '../components/community/HotspotMap';
import { FeedAdCard } from '../components/ads/FeedAdCard';
import { ShortsAdCard } from '../components/ads/ShortsAdCard';
import { useAdStore } from '../store/adStore';

interface Post {
  id: string;
  author: { id: string; name: string; avatar: string; badges: string[]; role?: string };
  postType?: 'NORMAL' | 'ANNOUNCEMENT' | 'EVENT';
  image: string;
  imageEn?: string;
  content: string;
  contentEn?: string;
  countryCode?: string;
  cafeName?: string;
  cafeLocation?: string;
  cafeLat?: number;
  cafeLng?: number;
  likes: number;
  comments: number;
  commentImages?: { imageUrl: string }[];
  shareCount: number;
  timeAgo: string;
  isPinned?: boolean;
  isPilgrimageLedger?: boolean;
  isShorts?: boolean;
  shortsCategory?: string;
  equipmentTag?: string;
  earnedBeans: number;
  storeOwnerId?: string;
  tastingNote?: { acidity: number; sweetness: number; body: number; bitterness?: number; aroma?: number };
  taggedBean?: string;
  recipeData?: any;
  storeId?: string;
  store?: {
    id: string;
    ownerId: string;
    name: string;
    address: string;
    lat?: number;
    lng?: number;
    mainImageUrl: string;
    primaryCoffeeType: string;
  };
  poll?: {
    id: string;
    question: string;
    expiresAt?: string | null;
    options: {
      id: string;
      text: string;
      _count: { votes: number };
      votes: { userId: string }[];
    }[];
  };
  attachedCourseId?: string;
  attachedCourse?: any;
}

const renderWithLinks = (text: string | undefined): React.ReactNode => {
    if (!text) return text;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, i) => {
        if (part.match(urlRegex)) {
            return (
                <a 
                    key={i} 
                    href={part} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-amber-500 hover:text-amber-400 underline transition-colors"
                    onClick={(e) => e.stopPropagation()}
                >
                    {part}
                </a>
            );
        }
        return part;
    });
};

const getFilterLabel = (key: string, t: any) => {
  switch(key) {
    case 'all': return t('coffee_talk.filter_all', 'All');
    case 'clubs': return t('coffee_talk.filter_clubs', '🤝 소모임/크루');
    case 'following_story': return t('coffee_talk.filter_following', '☕ 이웃 & 단골 소식');
    case 'pilgrimage_talk': return t('coffee_talk.filter_pilgrimage', '🚩 성지톡');
    case 'taste_match': return t('coffee_talk.filter_taste', '내 취향 매칭 (85%)');
    case 'near_live': return t('coffee_talk.filter_near', '근처 라이브 (1km)');
    case 'home_cafe': return t('coffee_talk.filter_homecafe', '홈카페/장비');
    case 'shorts': return t('coffee_talk.filter_shorts', '🎥 커피 숏폼/ASMR');
    default: return key;
  }
};
let globalFeedCache: Record<string, any> = {};

interface BgmTheme {
  id: string;
  title: string;
  videoId: string;
  label: string;
}

const BGM_THEMES: BgmTheme[] = [
  { id: 'Classical', title: '바흐 클래식 피아노 커피 음악', videoId: 'tN9ecELJ5A0', label: '🎻 Classical (클래식)' },
  { id: 'Jazz', title: '잔잔한 재즈 카페 음악 플레이리스트', videoId: 'Dx5qFeM4yMc', label: '🎷 Jazz (재즈)' },
  { id: 'K-pop', title: '어쿠스틱 케이팝 명곡 커버', videoId: '811QZGDysx0', label: '🎤 K-pop (가요)' },
  { id: 'Pop', title: '감성 팝송 어쿠스틱 라이브', videoId: 'jfKfPfyJRdk', label: '🎵 Pop (팝송)' },
  { id: 'Rock', title: '잔잔한 감성 락 발라드 플레이리스트', videoId: 'jgpJVIg8DbM', label: '🎸 Rock (감성 락)' },
  { id: 'Hip Hop', title: '감성 로파이 힙합 비트 플레이리스트', videoId: 'mnd7nUqM5v0', label: '🎧 Hip Hop (힙합/로파이)' },
  { id: 'R&B', title: '카페 어반 알앤비 소울 음악', videoId: 'L8g3c-t0HjM', label: '🎹 R&B (알앤비)' },
  { id: 'EDM', title: '칠아웃 트로피컬 하우스 EDM', videoId: 'NDGs9x04DkY', label: '⚡ EDM (칠아웃)' },
  { id: 'Country', title: '편안한 컨트리 포크 송 플레이리스트', videoId: 'country_search', label: '🤠 Country (컨트리)' },
  { id: 'Reggae', title: '나른한 레게 보사노바 리듬', videoId: 'reggae_search', label: '🌴 Reggae (레게)' }
];

const getBgmGenreKey = (id: string) => id.toLowerCase().replace(/\s+/g, '').replace(/&/g, 'n').replace(/-/g, '');

// 글로벌 인비디어스 인스턴스 목록 (유튜브 음원 프록시용 고가용성 서버 그룹 - Uptime 우선순위 재정렬)
const INVIDIOUS_INSTANCES = [
  'https://invidious.flokinet.to',
  'https://iv.ggtyler.dev',
  'https://yewtu.be',
  'https://invidious.lunar.icu'
];

const resolveAudioUrl = (input: string | undefined, instanceIndex: number = 0): string => {
  const baseDomain = INVIDIOUS_INSTANCES[instanceIndex % INVIDIOUS_INSTANCES.length];
  
  if (!input) return `${baseDomain}/latest_version?id=57GfJ1A5e68&itag=140`; // 기본 짐노페디 1번 (유튜브)
  
  let targetInput = input;

  // 과거 DB 본문에 SoundHelix MP3 주소 자체로 저장되어 유입되는 케이스 방어막 (역매핑 세탁)
  if (input.includes('SoundHelix-Song-')) {
    if (input.includes('SoundHelix-Song-1.mp3')) targetInput = 'tN9ecELJ5A0';
    else if (input.includes('SoundHelix-Song-2.mp3')) targetInput = 'Dx5qFeM4yMc';
    else if (input.includes('SoundHelix-Song-3.mp3')) targetInput = '811QZGDysx0';
    else if (input.includes('SoundHelix-Song-4.mp3')) targetInput = 'jfKfPfyJRdk';
    else if (input.includes('SoundHelix-Song-5.mp3')) targetInput = '57GfJ1A5e68';
    else if (input.includes('SoundHelix-Song-6.mp3')) targetInput = 'jgpJVIg8DbM';
    else if (input.includes('SoundHelix-Song-7.mp3')) targetInput = 'mnd7nUqM5v0';
    else if (input.includes('SoundHelix-Song-8.mp3')) targetInput = 'L8g3c-t0HjM';
    else if (input.includes('SoundHelix-Song-10.mp3')) targetInput = 'NDGs9x04DkY';
  }

  // 역매핑 후에도 여전히 다른 완전한 HTTP 주소인 경우는 그대로 반환 (예: 픽사베이 등 기타 하위 호환)
  if (targetInput.startsWith('http') && !targetInput.includes('SoundHelix-Song-')) {
    return targetInput;
  }
  
  // 유튜브 비디오 ID 맵핑용 사전
  const youtubeMap: Record<string, string> = {
    'jazz': 'tN9ecELJ5A0',
    'lofi': 'Dx5qFeM4yMc',
    'acoustic': '811QZGDysx0',
    'bossanova': 'jfKfPfyJRdk',
    'classic': '57GfJ1A5e68',
    'rock': 'jgpJVIg8DbM',
    'hiphop': 'mnd7nUqM5v0',
    'nature': 'L8g3c-t0HjM',
    'coffeetime': 'NDGs9x04DkY'
  };

  // 만약 테마 ID가 들어왔다면 유튜브 비디오 ID로 치환
  const videoId = youtubeMap[targetInput] || targetInput;

  // 인비디어스 고가용성 오디오 스트리밍 API 프록시 경로로 실시간 변환
  return `${baseDomain}/latest_version?id=${videoId}&itag=140`;
};

interface ParsedBgm {
  title: string;
  videoId: string;
}

const parseBgmFromContent = (content: string | undefined): { cleanContent: string; bgm: ParsedBgm | null } => {
  if (!content) return { cleanContent: '', bgm: null };
  const bgmRegex = /<!--BM_BGM:({.*?})-->/;
  const match = content.match(bgmRegex);
  if (match && match[1]) {
    try {
      const bgm = JSON.parse(match[1]) as ParsedBgm;
      const cleanContent = content.replace(bgmRegex, '').trim();
      return { cleanContent, bgm };
    } catch (e) {
      console.error('BGM parse error:', e);
    }
  }
  return { cleanContent: content, bgm: null };
};

export default function CoffeeTalk() {
  const { t, i18n } = useTranslation(['translation']);
  const navigate = useNavigate();
  const location = useLocation();
  const savedLastFilter = (() => {
      try { return localStorage.getItem('coffeeTalkLastActiveFilter') || 'all'; } catch { return 'all'; }
  })();
  const initialFilter = location.state?.filter || savedLastFilter;
  const [activeFilter, setActiveFilter] = useState(initialFilter);
  const [sortOption, setSortOption] = useState('latest');
  const [isDeepLinked, setIsDeepLinked] = useState(!!location.state?.activePost || !!window.location.hash);
  const [isScrollJumping, setIsScrollJumping] = useState(() => {
      if (!!location.state?.activePost || !!window.location.hash) return true;
      try {
          const filter = location.state?.filter || savedLastFilter;
          const savedScroll = localStorage.getItem(`coffeeTalkScrollTop_${filter}`);
          if (savedScroll && parseInt(savedScroll, 10) > 0) {
              return true;
          }
      } catch (e) {}
      return false;
  });
  const currentFilterRef = useRef(activeFilter);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const initialCacheKey = initialFilter + '_latest';
  const [isLiked, setIsLiked] = useState<Record<string, boolean>>(globalFeedCache[initialCacheKey]?.likes || {});
  const [isBookmarked, setIsBookmarked] = useState<Record<string, boolean>>(globalFeedCache[initialCacheKey]?.bookmarks || {});
  const [hiddenAnnouncements, setHiddenAnnouncements] = useState<string[]>([]);
  const [unreadAnnouncementsCount, setUnreadAnnouncementsCount] = useState(0);
  const [unreadClubsBadge, setUnreadClubsBadge] = useState(false);
  const [collectionPostId, setCollectionPostId] = useState<string | null>(null);
  const [selectedPublicUserId, setSelectedPublicUserId] = useState<string | null>(null);
  const [activeRecipeNotePost, setActiveRecipeNotePost] = useState<Post | null>(null);
  const lastScrollTopRef = useRef<number>(0);
  const restoreScrollTop = useRef<number | null>(null);
  const isMountedRef = useRef(false);

  let currentUserId = '';
  try {
      const token = localStorage.getItem('token');
      if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          currentUserId = payload.id;
      }
  } catch {}

  const [posts, setPosts] = useState<Post[]>(globalFeedCache[initialCacheKey]?.posts || []);
  const [isLoading, setIsLoading] = useState(!globalFeedCache[initialCacheKey]?.posts);


  // New Post Modal State
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [galleryPostId, setGalleryPostId] = useState<string | null>(null);
  const [activePostMenuId, setActivePostMenuId] = useState<string | null>(null);
  const [isShopSearchOpen, setIsShopSearchOpen] = useState(false);
  const [taggedShop, setTaggedShop] = useState<{id?: string, name: string, address: string, lat: number, lng: number} | null>(null);
  const [taggedBean, setTaggedBean] = useState<string>('');
  const [shortsCategory, setShortsCategory] = useState<string>('');
  const [equipmentTag, setEquipmentTag] = useState<string>('');
  const [isRecipeMode, setIsRecipeMode] = useState(false);
  const [recipeData, setRecipeData] = useState({ dose: '', yield: '', temp: '', time: '', grinder: '', method: '' });
  const [hasPoll, setHasPoll] = useState(false);
  const [pollDraft, setPollDraft] = useState<{ question: string; options: string[]; durationHours: number }>({ question: '', options: ['', ''], durationHours: 24 });
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newContent, setNewContent] = useState('');
  const [tastingNote, setTastingNote] = useState({ acidity: 0, sweetness: 0, body: 0, bitterness: 0, aroma: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detailShopData, setDetailShopData] = useState<any>(null);
  const [editPostId, setEditPostId] = useState<string | null>(null);
  const [composeMode, setComposeMode] = useState<'NOTICE' | 'TASTING' | 'GENERAL' | 'SHORTS'>('GENERAL');
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [isPilgrimageLedgerCompose, setIsPilgrimageLedgerCompose] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const [isCourseSelectorOpen, setIsCourseSelectorOpen] = useState(false);
  const [attachedCourseId, setAttachedCourseId] = useState<string | null>(null);
  const [myAvailableCourses, setMyAvailableCourses] = useState<any[]>([]);

  // BGM Player State
  const [activeBgmVideoId, setActiveBgmVideoId] = useState<string | null>(null);
  const [activeBgmTitle, setActiveBgmTitle] = useState<string | null>(null);
  const [activeBgmPostId, setActiveBgmPostId] = useState<string | null>(null);
  const [isBgmPlaying, setIsBgmPlaying] = useState<boolean>(false);
  const [bgmVolume, setBgmVolume] = useState<number>(50);
  const [selectedBgmTheme, setSelectedBgmTheme] = useState<string>(''); // For write/edit modal
  const [customBgmTitle, setCustomBgmTitle] = useState<string>(''); // For custom song name input
  const [isCustomBgmInputActive, setIsCustomBgmInputActive] = useState<boolean>(false); // Show/hide custom input field

  // BGM Audio Singleton Instance Ref & Control Helpers
  const bgmAudioRef = React.useRef<HTMLAudioElement | null>(null);

  const playBgmAudio = (url: string, volValue: number) => {
    let attemptIndex = 0;
    
    const playWithFallback = (currentUrl: string) => {
      const resolvedUrl = resolveAudioUrl(currentUrl, attemptIndex);
      
      if (!bgmAudioRef.current) {
        bgmAudioRef.current = new Audio(resolvedUrl);
        bgmAudioRef.current.loop = true;
      } else if (bgmAudioRef.current.src !== resolvedUrl) {
        bgmAudioRef.current.pause();
        bgmAudioRef.current = new Audio(resolvedUrl);
        bgmAudioRef.current.loop = true;
      }
      
      bgmAudioRef.current.volume = volValue / 100;
      
      // 에러 리스너 결합 (네트워크 차단, 403 Forbidden 등 소리 안 남 원천 방어)
      bgmAudioRef.current.onerror = () => {
        console.warn(`[BGM Player Warning] Invidious proxy ${INVIDIOUS_INSTANCES[attemptIndex % INVIDIOUS_INSTANCES.length]} failed to stream. Attempting fallback...`);
        attemptIndex++;
        if (attemptIndex < INVIDIOUS_INSTANCES.length) {
          // 다음 사용 가능한 최적의 인비디어스 인스턴스로 자동 전환 재생 시도
          playWithFallback(currentUrl);
        } else {
          console.error("[BGM Player Critical] All public YouTube Music proxies are currently blocked. Transitioning to high-availability SoundHelix MP3 fallback...");
          
          // 각 테마별 장르 구분을 보장하는 1:1 맞춤형 고가용성 백업 매핑
          const fallbackMap: Record<string, string> = {
            'tN9ecELJ5A0': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
            'jazz': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
            
            'Dx5qFeM4yMc': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
            'lofi': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
            
            '811QZGDysx0': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
            'acoustic': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
            
            'jfKfPfyJRdk': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
            'bossanova': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
            
            '57GfJ1A5e68': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
            'classic': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
            
            'jgpJVIg8DbM': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
            'rock': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
            
            'mnd7nUqM5v0': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
            'hiphop': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
            
            'L8g3c-t0HjM': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
            'nature': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
            
            'NDGs9x04DkY': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
            'coffeetime': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3'
          };

          const fallbackUrl = fallbackMap[currentUrl] || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3';
          
          if (bgmAudioRef.current) {
            bgmAudioRef.current.src = fallbackUrl;
            bgmAudioRef.current.play().catch(console.error);
          }
        }
      };

      bgmAudioRef.current.play().catch(err => {
        console.error("Audio play catch error, falling back...", err);
        // play() 동적 거부 시 에러 리스너 수동 격발
        bgmAudioRef.current?.onerror?.(null as any);
      });
    };

    playWithFallback(url);
  };

  const pauseBgmAudio = () => {
    if (bgmAudioRef.current) {
      bgmAudioRef.current.pause();
    }
  };

  const handleAiBgmAutoMatch = () => {
    if (!newContent.trim()) {
      alert(t('coffee_talk.bgm_alert_empty_content', '🪄 [BeanMind AI 사운드 매칭]\n\n피드 내용을 먼저 조금이라도 작성해 주시면, AI가 본문 감성을 분석하여 가장 잘 어울리는 BGM을 자동으로 매칭해 드립니다!'));
      return;
    }

    const text = newContent.toLowerCase();
    
    // 감성 매칭 스코어링 테이블 (처방전 노래 추천 장르 매핑)
    const scoreMap: Record<string, { score: number; keywords: string[] }> = {
      Classical: { 
        score: 0, 
        keywords: ["클래식", "classic", "집중", "공부", "첼로", "피아노", "에스프레소", "정갈", "차분", "바이올린", "커피향", "오케스트라", "바흐", "쇼팽", "드뷔시", "베토벤"] 
      },
      Jazz: { 
        score: 0, 
        keywords: ["재즈", "jazz", "카페", "조용한", "차분한", "독서", "에스프레소", "브런치", "모닝", "원두", "아메리카노", "색소폰", "그루브", "나른한"] 
      },
      'K-pop': { 
        score: 0, 
        keywords: ["가요", "kpop", "k-pop", "아이유", "방탄", "뉴진스", "에스파", "멜로디", "한글", "국내", "발라드", "댄스"] 
      },
      Pop: { 
        score: 0, 
        keywords: ["팝송", "pop", "팝", "감성팝", "어쿠스틱팝", "빌보드", "외국", "english", "sunset", "mood", "sweet"] 
      },
      Rock: { 
        score: 0, 
        keywords: ["락", "rock", "밴드", "기타솔로", "신나는", "시원한", "드럼", "비트", "에너지", "강렬한", "자유"] 
      },
      'Hip Hop': { 
        score: 0, 
        keywords: ["힙합", "hiphop", "비트", "트렌디", "시티팝", "도심", "힙한", "리듬", "그루브", "스트릿", "트렌디한", "신나는", "로파이", "lofi"] 
      },
      'R&B': { 
        score: 0, 
        keywords: ["알앤비", "rnb", "r&b", "소울", "어반", "감성", "부드러운", "밤", "새벽", "조명", "애틋한", "그루브"] 
      },
      EDM: { 
        score: 0, 
        keywords: ["edm", "일렉", "댄스", "신나는", "페스티벌", "클럽", "일렉트로닉", "하우스", "테크노", "칠아웃", "트로피컬"] 
      },
      Country: { 
        score: 0, 
        keywords: ["컨트리", "country", "포크", "folk", "기타", "어쿠스틱", "여행", "자연", "바람", "평화로운", "목가적인", "캠핑"] 
      },
      Reggae: { 
        score: 0, 
        keywords: ["레게", "reggae", "보사노바", "bossa", "라틴", "해변", "바다", "여름", "휴양지", "여유로운", "나른한", "리듬"] 
      }
    };

    // 점수 채점 및 매칭 단어 색출
    let matchedWord = "";
    Object.keys(scoreMap).forEach(themeId => {
      scoreMap[themeId].keywords.forEach(word => {
        if (text.includes(word)) {
          scoreMap[themeId].score += 2;
          if (!matchedWord) matchedWord = word; // 최초 매칭 단어 기록
        }
      });
    });

    // 가장 높은 점수의 테마 선정
    let bestThemeId = "Jazz"; // 기본 테마
    let maxScore = 0;
    
    Object.keys(scoreMap).forEach(themeId => {
      if (scoreMap[themeId].score > maxScore) {
        maxScore = scoreMap[themeId].score;
        bestThemeId = themeId;
      }
    });

    // 만약 매칭 단어가 전혀 없다면 랜덤 매칭 혹은 기본 Jazz/Pop 매칭
    if (maxScore === 0) {
      const defaultThemes = ["Classical", "Jazz", "K-pop", "Pop", "Rock", "Hip Hop", "R&B", "EDM", "Country", "Reggae"];
      bestThemeId = defaultThemes[Math.floor(Math.random() * defaultThemes.length)];
      matchedWord = t('coffee_talk.bgm_match_fallback', '커피 한 잔의 여유');
    }

    const matchedTheme = BGM_THEMES.find(t => t.id === bestThemeId);
    if (matchedTheme) {
      setSelectedBgmTheme(bestThemeId);
      
      // AI 피드백 팝업 알림 (다국어화 및 인젝션 바인딩)
      const translatedLabel = t(`coffee_talk.bgm_genre_${getBgmGenreKey(bestThemeId)}`, matchedTheme.label);
      alert(t('coffee_talk.bgm_alert_match_complete', `🪄 [BeanMind AI BGM 자동 매칭 완료]\n\n회원님이 작성하신 피드 속 감성 어휘(예: "${matchedWord}")를 정밀 분석하여,\n가장 아름답게 어울리는 배경음악 테마 「${translatedLabel}」을 찾아 자동으로 페어링해 드렸습니다!`, {
        word: matchedWord,
        label: translatedLabel
      }));
    }
  };

  // Ads State
  const [feedAd, setFeedAd] = useState<any>(null);
  const [premiumAd, setPremiumAd] = useState<any>(null);
  const [shortsAd, setShortsAd] = useState<any>(null);
  const [neighborAd, setNeighborAd] = useState<any>(null);
  const [neighborPremiumAd, setNeighborPremiumAd] = useState<any>(null);
  const { canShowAd, recordAdView } = useAdStore();

  useEffect(() => {
     if (isCourseSelectorOpen && myAvailableCourses.length === 0 && currentUserId) {
         fetch(`${API_BASE}/api/users/collections`, {
             headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
         })
         .then(r => r.json())
         .then(data => setMyAvailableCourses(data.filter((c: any) => c.isPilgrimageCourse)))
         .catch(console.error);
     }
  }, [isCourseSelectorOpen, currentUserId]);

  // Rewards State
  const [rewardTiers, setRewardTiers] = useState<any>(null);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [isRewarding, setIsRewarding] = useState(false);
  const [selectedRewardTarget, setSelectedRewardTarget] = useState<{ id: string, name: string, entityId: string } | null>(null);
  const [activeCarouselUrls, setActiveCarouselUrls] = useState<string[] | null>(null);

  const handleOpenMap = (targetShopId: string | null, targetLat: number, targetLng: number, targetName: string) => {
      if (targetShopId) {
          navigate('/map', { state: { targetShopId, targetLat, targetLng, targetName } });
      } else {
          navigate('/map', { state: { targetLat, targetLng, targetName } });
      }
  };

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<{prefAcidity: number, prefSweetness: number, prefBody: number} | null>(null);
  const [currentLoc, setCurrentLoc] = useState<{lat: number, lng: number} | null>({ lat: 37.4033, lng: 127.1163 }); // Start with Pangyo fallback immediately
  
  const targetPostIdToScroll = useRef<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const queryPostId = params.get('post');
    if (queryPostId) {
        targetPostIdToScroll.current = queryPostId;
        setIsScrollJumping(true);
    }

    if (location.state?.filter) {
        setActiveFilter(location.state.filter);
    }
    
    if (location.state?.activePost) {
        targetPostIdToScroll.current = location.state.activePost;
        setIsScrollJumping(true);
    }
    
    if (location.state?.composePilgrimageLedger) {
        setIsPilgrimageLedgerCompose(true);
        if (location.state.targetShopId) {
            setTaggedShop({ 
                id: location.state.targetShopId, 
                name: location.state.targetShopName, 
                address: location.state.targetShopAddress,
                lat: location.state.targetShopLat,
                lng: location.state.targetShopLng
            });
        }
        setIsWriteModalOpen(true);
    }
    
    // Clean up location state and URL query parameter so reload/back doesn't trigger again
    if (location.state?.filter || location.state?.composePilgrimageLedger || location.state?.activePost || queryPostId) {
        window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location]);

  const fetchPosts = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const filterToFetch = activeFilter || 'all';
      const url = `${API_BASE}/api/community/posts?filter=${filterToFetch}&sort=${sortOption}&countryCode=${getDeviceCountryCode()}&_t=${Date.now()}`;
      const token = localStorage.getItem('token');
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(url, { headers });
      if (res.ok) {
          const data = await res.json();
          const initialLikes: Record<string, boolean> = {};
          const initialBookmarks: Record<string, boolean> = {};
          const userId = currentUser?.id;

          let mappedPosts: Post[] = data.map((d: any) => {
            if (userId) {
                if (d.likes?.some((l: any) => l.userId === userId)) {
                    initialLikes[d.id] = true;
                }
                if (
                    d.bookmarks?.some((b: any) => b.userId === userId) || 
                    d.collectionItems?.some((item: any) => item.collection?.userId === userId)
                ) {
                    initialBookmarks[d.id] = true;
                }
            }

            return {
              id: d.id,
              isPilgrimageLedger: d.isPilgrimageLedger,
              isShorts: d.isShorts,
              author: {
                id: d.author?.id,
                name: d.author.role === 'OWNER' && d.author.stores && d.author.stores.length > 0 ? d.author.stores[0].name : d.author.nickname,
                avatar: d.author.profileImageUrl ? (d.author.profileImageUrl.startsWith('http') ? d.author.profileImageUrl : `${API_BASE}${d.author.profileImageUrl}`) : 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&q=80',
                badges: d.author.role === 'OWNER' ? [t('coffee_talk.badge_official', '공식 매장')] : [t('coffee_talk.badge_lover', '커피 애호가')],
                role: d.author.role
              },
              postType: d.postType,
              image: d.image || null,
              content: d.content,
                contentEn: d.contentEn,
                imageEn: d.imageEn,
                countryCode: d.countryCode,
              cafeName: d.cafeName,
              cafeLocation: d.cafeLocation,
              cafeLat: d.cafeLat ? parseFloat(d.cafeLat) : undefined,
              cafeLng: d.cafeLng ? parseFloat(d.cafeLng) : undefined,
              likes: d._count?.likes || 0,
              comments: d._count?.comments || 0,
              commentImages: d.comments || [],
              shareCount: d.shareCount || 0,
              timeAgo: formatRelativeTime(d.createdAt),
              isPinned: d.isPinned,
              earnedBeans: d.earnedBeans || 0,
              storeOwnerId: d.store?.ownerId,
              storeId: d.storeId,
              store: d.store || undefined,
              taggedBean: d.taggedBean,
              shortsCategory: d.shortsCategory,
              equipmentTag: d.equipmentTag,
              recipeData: d.recipeData ? JSON.parse(d.recipeData) : undefined,
              poll: d.poll,
              attachedCourseId: d.attachedCourseId,
              attachedCourse: d.attachedCourse || undefined,
              tastingNote: d.acidity || d.sweetness || d.body || d.bitterness || d.aroma ? {
                 acidity: d.acidity || 0,
                 sweetness: d.sweetness || 0,
                 body: d.body || 0,
                 bitterness: d.bitterness || 0,
                 aroma: d.aroma || 0
              } : undefined
            };
          });

          // Fetch the targeted active post if it's missing from the feed (e.g., old hot post)
          const activePostId = location.state?.activePost || targetPostIdToScroll.current;
          if (activePostId && !mappedPosts.some(p => p.id === activePostId)) {
              try {
                  const singleRes = await fetch(`${API_BASE}/api/community/posts/${activePostId}`, { headers });
                  if (singleRes.ok) {
                      const d = await singleRes.json();
                      const singlePost = {
                          id: d.id,
                          isPilgrimageLedger: d.isPilgrimageLedger,
                          isShorts: d.isShorts,
                          author: {
                              id: d.author?.id,
                              name: d.author.role === 'OWNER' && d.author.stores && d.author.stores.length > 0 ? d.author.stores[0].name : d.author.nickname,
                              avatar: d.author.profileImageUrl ? (d.author.profileImageUrl.startsWith('http') ? d.author.profileImageUrl : `${API_BASE}${d.author.profileImageUrl}`) : 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&q=80',
                              badges: d.author.role === 'OWNER' ? [t('coffee_talk.badge_official', '공식 매장')] : [t('coffee_talk.badge_lover', '커피 애호가')],
                              role: d.author.role
                          },
                          postType: d.postType,
                          image: d.image || null,
                          content: d.content,
                contentEn: d.contentEn,
                            imageEn: d.imageEn,
                            countryCode: d.countryCode,
                          cafeName: d.cafeName,
                          cafeLocation: d.cafeLocation,
                          cafeLat: d.cafeLat ? parseFloat(d.cafeLat) : undefined,
                          cafeLng: d.cafeLng ? parseFloat(d.cafeLng) : undefined,
                          likes: d._count?.likes || 0,
                          shareCount: d.shareCount || 0,
                          comments: d._count?.comments || 0,
                          commentImages: d.comments || [],
                          timeAgo: formatRelativeTime(d.createdAt),
                          isPinned: d.isPinned,
                          earnedBeans: d.earnedBeans || 0,
                          storeOwnerId: d.store?.ownerId,
                          storeId: d.storeId,
                          store: d.store || undefined,
                          taggedBean: d.taggedBean,
                          shortsCategory: d.shortsCategory,
                          equipmentTag: d.equipmentTag,
                          recipeData: d.recipeData ? JSON.parse(d.recipeData) : undefined,
                          poll: d.poll,
                          attachedCourseId: d.attachedCourseId,
                          attachedCourse: d.attachedCourse || undefined,
                          tastingNote: d.acidity || d.sweetness || d.body || d.bitterness || d.aroma ? {
                              acidity: d.acidity || 0,
                              sweetness: d.sweetness || 0,
                              body: d.body || 0,
                              bitterness: d.bitterness || 0,
                              aroma: d.aroma || 0
                          } : undefined
                      };
                      mappedPosts = [singlePost, ...mappedPosts];
                      
                      if (userId) {
                          if (d.likes?.some((l: any) => l.userId === userId)) initialLikes[d.id] = true;
                          if (
                              d.bookmarks?.some((b: any) => b.userId === userId) || 
                              d.collectionItems?.some((item: any) => item.collection?.userId === userId)
                          ) {
                              initialBookmarks[d.id] = true;
                          }
                      }
                  }
              } catch (err) {
                  console.error('Failed to fetch active post:', err);
              }
          }

          if (filterToFetch === currentFilterRef.current) {
            setIsLiked(prev => ({...prev, ...initialLikes}));
            setIsBookmarked(prev => ({...prev, ...initialBookmarks}));
            
            // 기존 포스트와 새로 가져온 포스트 목록이 동일한 경우 상태 업데이트를 생략하여 불필요한 리렌더링 및 껌벅거림 차단
            // silent 모드(백그라운드 갱신)일 때는 setPosts 전 scrollTop을 저장하고 재렌더링 후 복원
            const containerForScroll = silent ? document.getElementById('coffee-feed-container') : null;
            const savedScrollTop = containerForScroll ? containerForScroll.scrollTop : 0;

            setPosts(prevPosts => {
                const isSame = prevPosts.length === mappedPosts.length && prevPosts.every((p, idx) => {
                    const np = mappedPosts[idx];
                    return p.id === np?.id &&
                           p.likes === np?.likes &&
                           p.comments === np?.comments &&
                           p.shareCount === np?.shareCount &&
                           p.content === np?.content &&
                           p.image === np?.image;
                });
                return isSame ? prevPosts : mappedPosts;
            });

            // 백그라운드 갱신 후 스크롤 위치 복원 (double RAF: 첫 번째는 React 커밋, 두 번째는 레이아웃 확정 대기)
            if (silent && savedScrollTop > 0) {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        const c = document.getElementById('coffee-feed-container');
                        if (c) {
                            c.style.scrollBehavior = 'auto';
                            c.scrollTop = savedScrollTop;
                            // 한 프레임 후 scrollBehavior 복원 (즉시 복원 시 animation 방지)
                            requestAnimationFrame(() => { c.style.scrollBehavior = ''; });
                        }
                    });
                });
            }
          }
          
          const cacheKey = filterToFetch + '_' + sortOption;
          globalFeedCache[cacheKey] = {
              posts: mappedPosts,
              likes: initialLikes,
              bookmarks: initialBookmarks
          };
        }
      } catch (e) {
        console.error("Failed to fetch posts", e);
      } finally {
        if (!silent) setIsLoading(false);
      }
  };
    
  const fetchRewardTiers = async () => {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const res = await fetch(`${API_BASE}/api/users/reward-tiers`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setRewardTiers(await res.json());
            }
        } catch (e) {
            console.error('Failed to fetch tiers', e);
        }
    }
  };

  const fetchAds = async () => {
      try {
          const token = localStorage.getItem('token');
          const headers: any = {};
          if (token) headers['Authorization'] = `Bearer ${token}`;
          
          // Fetch Premium Top Feed Ad
          const resPremium = await fetch(`${API_BASE}/api/ads/serve?tab=FEED&placementKey=FEED_PREMIUM&lang=${i18n.language || 'en'}`, { headers });
          if (resPremium.ok) {
              const data = await resPremium.json();
              if (data.fallback === 'ADMOB') {
                  setPremiumAd(data);
              } else if (data.ad && canShowAd(data.ad.id, (data.frequencyCapHours ?? 24) * 60 * 60 * 1000)) {
                  setPremiumAd(data);
                  recordAdView(data.ad.id, 'DIRECT', 'FEED');
              } else {
                  setPremiumAd({ fallback: 'ADMOB' });
              }
          }

          // Fetch Standard Feed Ads
          const resFeed = await fetch(`${API_BASE}/api/ads/serve?tab=FEED&placementKey=FEED_STANDARD&lang=${i18n.language || 'en'}`, { headers });
          if (resFeed.ok) {
              const data = await resFeed.json();
              if (data.fallback === 'ADMOB') {
                  setFeedAd(data);
              } else if (data.ad && canShowAd(data.ad.id, (data.frequencyCapHours ?? 24) * 60 * 60 * 1000)) {
                  setFeedAd(data);
                  recordAdView(data.ad.id, 'DIRECT', 'FEED');
              } else {
                  setFeedAd({ fallback: 'ADMOB' });
              }
          }

          // Fetch Shorts Ads
          const resShorts = await fetch(`${API_BASE}/api/ads/serve?tab=SHORTS&lang=${i18n.language || 'en'}`, { headers });
          if (resShorts.ok) {
              const data = await resShorts.json();
              if (data.fallback === 'ADMOB') {
                  setShortsAd(data);
              } else if (data.ad && canShowAd(data.ad.id, (data.frequencyCapHours ?? 24) * 60 * 60 * 1000)) {
                  setShortsAd(data);
                  recordAdView(data.ad.id, 'DIRECT', 'SHORTS');
              } else {
                  setShortsAd({ fallback: 'ADMOB' });
              }
          }

          // Fetch Neighbor (Near Live) Ads
          const resNeighbor = await fetch(`${API_BASE}/api/ads/serve?tab=FEED&placementKey=FEED_NEIGHBOR&lang=${i18n.language || 'en'}`, { headers });
          if (resNeighbor.ok) {
              const data = await resNeighbor.json();
              if (data.fallback === 'ADMOB') {
                  setNeighborAd(data);
              } else if (data.ad && canShowAd(data.ad.id, (data.frequencyCapHours ?? 24) * 60 * 60 * 1000)) {
                  setNeighborAd(data);
                  recordAdView(data.ad.id, 'DIRECT', 'FEED');
              } else {
                  setNeighborAd({ fallback: 'ADMOB' });
              }
          }

          // Fetch Neighbor Premium Ads
          const resNeighborPremium = await fetch(`${API_BASE}/api/ads/serve?tab=FEED&placementKey=FEED_NEIGHBOR_PREMIUM&lang=${i18n.language || 'en'}`, { headers });
          if (resNeighborPremium.ok) {
              const data = await resNeighborPremium.json();
              if (data.fallback === 'ADMOB') {
                  setNeighborPremiumAd(data);
              } else if (data.ad && canShowAd(data.ad.id, (data.frequencyCapHours ?? 24) * 60 * 60 * 1000)) {
                  setNeighborPremiumAd(data);
                  recordAdView(data.ad.id, 'DIRECT', 'FEED');
              } else {
                  setNeighborPremiumAd({ fallback: 'ADMOB' });
              }
          }
      } catch(e) {}
  };

  const fetchUnreadAnnouncementsCount = async () => {
        const token = localStorage.getItem('token');
        if (!token || !currentUser?.id) return;
        try {
            const lastRead = localStorage.getItem(`lastReadAnnouncements_${currentUser.id}`) || '1970-01-01T00:00:00.000Z';
            const res = await fetch(`${API_BASE}/api/community/announcements/unread?lastRead=${lastRead}`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
              const data = await res.json();
              setUnreadAnnouncementsCount(data.count);
          }
      } catch (e) {}
  };

  const checkClubUpdates = async () => {
      try {
          const token = localStorage.getItem('token');
          if (!token) return;
          const res = await fetch(`${API_BASE}/api/clubs`, { headers: { 'Authorization': `Bearer ${token}` }});
          if (res.ok) {
              const data = await res.json();
              // 1. Check for updates in my clubs
              let hasNewMyClub = false;
              let hasPending = false;
              if (data.my && Array.isArray(data.my)) {
                  const myActiveClubs = data.my.filter((c: any) => c.members && c.members.length > 0 && c.members[0].role !== 'PENDING');
                  const lastSeenIds = JSON.parse(localStorage.getItem('lastSeenClubIds') || '[]');
                  const currentIds = myActiveClubs.map((c: any) => c.id);
                  
                  hasNewMyClub = currentIds.some((id: string) => !lastSeenIds.includes(id));
                  hasPending = data.my.some((c: any) => c.pendingApplicantsCount && c.pendingApplicantsCount > 0);
              }

              // 2. Check for NEW global clubs
              let hasNewGlobal = false;
              if (data.all && data.all.length > 0) {
                  const latestGlobalClub = data.all[0];
                  const lastSeenGlobalDate = localStorage.getItem('lastSeenGlobalClubDate');
                  
                  // If they've never seen clubs, or if the latest club is newer than their last seen date
                  if (!lastSeenGlobalDate || new Date(latestGlobalClub.createdAt).getTime() > parseInt(lastSeenGlobalDate)) {
                      hasNewGlobal = true;
                  }
              }

              setUnreadClubsBadge(hasNewMyClub || hasPending || hasNewGlobal);
          }
      } catch(e) {}
  };

  React.useEffect(() => {
    // 최초 마운트 시점에는 백업을 건너뜀으로써 로컬 스토리지에 유효하게 들어있던 이전 복원 대상 값을 0으로 덮어쓰는 버그를 차단합니다.
    if (isMountedRef.current) {
        if (currentFilterRef.current) {
            localStorage.setItem(`coffeeTalkScrollTop_${currentFilterRef.current}`, lastScrollTopRef.current.toString());
        }
    } else {
        isMountedRef.current = true;
    }

    currentFilterRef.current = activeFilter;
    try {
        localStorage.setItem('coffeeTalkLastActiveFilter', activeFilter);
    } catch (e) {}
    const cacheKey = activeFilter + '_' + sortOption;
    
    // 딥링크가 아닌 경우 이전 스크롤 복원 대상 확보
    const targetId = window.location.hash ? window.location.hash.substring(1) : targetPostIdToScroll.current;
    if (!targetId) {
        const savedScroll = localStorage.getItem(`coffeeTalkScrollTop_${activeFilter}`);
        if (savedScroll) {
            restoreScrollTop.current = parseInt(savedScroll, 10);
            setIsScrollJumping(true); // 스크롤 복원 전까지 투명 마스킹
        } else {
            restoreScrollTop.current = null;
        }
    } else {
        restoreScrollTop.current = null;
    }
    
    let useCache = false;
    if (globalFeedCache[cacheKey]) {
        if (targetPostIdToScroll.current) {
            // Check if the target post is in the cache
            const isTargetInCache = globalFeedCache[cacheKey].posts.some((p: any) => p.id === targetPostIdToScroll.current);
            useCache = isTargetInCache;
        } else {
            useCache = true;
        }
    }

    if (useCache) {
        setPosts(globalFeedCache[cacheKey].posts);
        setIsLiked(globalFeedCache[cacheKey].likes);
        setIsBookmarked(globalFeedCache[cacheKey].bookmarks);
        setIsLoading(false); // MUST clear spinner immediately
        fetchPosts(true); // Silent background sync
    } else {
        setIsLoading(true); // Initial load with spinner
        // Clear posts to prevent flickering old posts while waiting for the target post
        setPosts([]); // Always clear posts when switching filters/sorts to show loading spinner
        fetchPosts(false); 
    }
  }, [activeFilter, sortOption]);

  React.useEffect(() => {
    fetchRewardTiers();
    fetchAds();
    fetchUnreadAnnouncementsCount();
    checkClubUpdates();
    setHiddenAnnouncements(JSON.parse(localStorage.getItem('hiddenAnnouncements') || '[]'));

    const container = document.getElementById('coffee-feed-container');
    const handleScroll = () => {
        if (container) {
            // 진짜 스크롤 가능한 상태일 때만 기록을 보존하고 실시간 백업
            if (container.scrollHeight > container.clientHeight) {
                lastScrollTopRef.current = container.scrollTop;
                localStorage.setItem(`coffeeTalkScrollTop_${currentFilterRef.current}`, container.scrollTop.toString());
            }
        }
    };
    if (container) {
        container.addEventListener('scroll', handleScroll);
    }

    // Listen for global scrollToTop events (e.g. from Bottom Nav)
    const handleScrollToTop = () => {
        if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('scrollToTop', handleScrollToTop);
    return () => {
        window.removeEventListener('scrollToTop', handleScrollToTop);
        if (container) {
            container.removeEventListener('scroll', handleScroll);
            try {
                localStorage.setItem(`coffeeTalkScrollTop_${currentFilterRef.current}`, lastScrollTopRef.current.toString());
            } catch (e) {}
        }
    };
  }, []);

  React.useEffect(() => {
      if (activeFilter === 'following_story' && currentUser?.id) {
          localStorage.setItem(`lastReadAnnouncements_${currentUser.id}`, new Date().toISOString());
          const timer = setTimeout(() => {
              setUnreadAnnouncementsCount(0);
          }, 1500);
          return () => clearTimeout(timer);
      }
  }, [activeFilter, currentUser]);

  React.useEffect(() => {
    const targetId = window.location.hash ? window.location.hash.substring(1) : targetPostIdToScroll.current;
    
    // 1. 딥링크 타깃 포스트 스크롤 이동
    if (posts.length > 0 && targetId) {
      if (targetPostIdToScroll.current === targetId) {
          targetPostIdToScroll.current = null;
      }
      if (window.location.hash === `#${targetId}`) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }

      const performScroll = () => {
        const el = document.getElementById(`post-${targetId}`);
        const container = document.getElementById('coffee-feed-container');
        if (el && container) {
          // Temporarily remove smooth scrolling so the jump is instant
          container.style.scrollBehavior = 'auto';
          el.scrollIntoView({ behavior: 'auto', block: 'start' });
          
          // 대상 피드 강조 링 표시 (항상)
          el.classList.add('ring-4', 'ring-amber-500', 'ring-offset-2', 'ring-offset-espresso-950', 'transition-all', 'duration-500');
          setTimeout(() => {
             el.classList.remove('ring-4', 'ring-amber-500', 'ring-offset-2', 'ring-offset-espresso-950');
          }, 2000);
          
          // Restore smooth scrolling after the jump
          setTimeout(() => {
              container.style.scrollBehavior = '';
          }, 50);

          // 스크롤이 완료된 즉시 화면 투명도 잠금 해제! (0ms 찰나에 페이드인)
          setIsScrollJumping(false);
          return true;
        }
        return false;
      };

      if (!performScroll()) {
        // 미세 렌더링 프레임 지연 대비 10ms 인터벌 폴링 재시도 (최대 10회)
        let attempts = 0;
        const interval = setInterval(() => {
          if (performScroll() || attempts > 10) {
            clearInterval(interval);
            setIsScrollJumping(false); // 스크롤 시도 종료/실패 시에도 강제 잠금 해제하여 먹통 예방
          }
          attempts++;
        }, 10);
      }
    } 
    // 2. 이전 탭 및 이력 스크롤 위치 복원 (ResizeObserver로 레이아웃 안정화 감지 후 1회 정확 복원)
    else if (posts.length > 0 && restoreScrollTop.current !== null) {
      const scrollPos = restoreScrollTop.current;
      restoreScrollTop.current = null; // 중복 복원 즉시 해제

      const performScrollRestore = () => {
        const container = document.getElementById('coffee-feed-container');
        if (!container) return false;

        // 즉시 스크롤 위치 선점 (마스킹 뒤에서 0px 노출 방어)
        container.style.scrollBehavior = 'auto';
        container.scrollTop = scrollPos;

        let settled = false;
        let lastScrollHeight = container.scrollHeight;
        let stableCount = 0;
        let rafId: number;

        const finish = async () => {
          if (settled) return;
          settled = true;
          cancelAnimationFrame(rafId);

          // iOS WKWebView는 이미지를 lazy decode함: 이미지 src가 설정되어도
          // 실제 디코딩(naturalHeight 반영 및 scrollHeight 확정)은 비동기로 나중에 발생.
          // 시뮬레이터는 즉시 디코딩되어 문제 없지만, 실제 아이폰에서는
          // 디코딩 전 scrollHeight가 너무 작아 scrollTop이 클램핑됨.
          // img.decode()로 모든 이미지 디코딩 완료 후 scrollTop을 세팅해야 정확함.
          const imgs = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];
          await Promise.race([
            Promise.all(imgs.map(img => img.decode().catch(() => {}))),
            new Promise<void>(r => setTimeout(r, 600))
          ]);

          container.style.scrollBehavior = 'auto';
          container.scrollTop = scrollPos;
          requestAnimationFrame(() => {
            container.style.scrollBehavior = '';
            setIsScrollJumping(false);
          });
        };

        // RAF 루프로 scrollHeight(실제 콘텐츠 높이) 변화를 직접 감지
        // ResizeObserver는 컨테이너 바운딩박스(clientHeight)만 감지하므로
        // 이미지 로드로 인한 scrollHeight 변화를 포착하지 못함
        const tick = () => {
          if (settled) return;
          const h = container.scrollHeight;
          if (h !== lastScrollHeight) {
            // 높이 변화 감지 → 안정화 카운트 리셋 (scrollTop은 finish에서만 최종 세팅)
            lastScrollHeight = h;
            stableCount = 0;
          } else {
            stableCount++;
            // 연속 8프레임(~133ms @60fps) 동안 높이 고정 → 레이아웃 완료로 판단
            if (stableCount >= 8) {
              finish();
              return;
            }
          }
          rafId = requestAnimationFrame(tick);
        };

        rafId = requestAnimationFrame(tick);

        // 폴백: 최대 1.5초 후 강제 해제 (느린 네트워크 안드로이드 대비)
        setTimeout(() => finish(), 1500);

        return true;
      };

      if (!performScrollRestore()) {
        // 컨테이너가 아직 마운트되지 않은 경우 RAF로 재시도
        let attempts = 0;
        const retry = () => {
          if (performScrollRestore() || attempts++ > 10) return;
          requestAnimationFrame(retry);
        };
        requestAnimationFrame(retry);
      }
    }
  }, [posts, window.location.hash]);

  const handleLike = async (id: string, currentLikes: number) => {
    const token = localStorage.getItem('token');
    if (!token) {
        if (window.confirm(t('coffee_talk.alert_login_write', '로그인이 필요한 서비스입니다. 로그인 화면으로 이동하시겠습니까?'))) {
            navigate('/profile');
        }
        return;
    }

    const wasLiked = isLiked[id];
    // Optimistic UI update
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
        // Revert on failure
        setIsLiked(prev => ({ ...prev, [id]: wasLiked }));
    }
  };

  const handleBookmark = async (id: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
        if (window.confirm(t('coffee_talk.alert_login_write', '로그인이 필요한 서비스입니다. 로그인 화면으로 이동하시겠습니까?'))) {
            navigate('/profile');
        }
        return;
    }

    const wasBookmarked = isBookmarked[id];
    setIsBookmarked(prev => ({ ...prev, [id]: !wasBookmarked }));

    try {
        const url = `${API_BASE}/api/community/posts/${id}/bookmark`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    } catch (e) {
        console.error("Failed to toggle bookmark", e);
        setIsBookmarked(prev => ({ ...prev, [id]: wasBookmarked }));
    }
  };

  const handleShare = async (id: string) => {
      const isNative = typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor.isNativePlatform();
      const origin = isNative ? 'https://www.beanmindcurator.com:3002' : window.location.origin;
      
      // Nginx 등 외부 웹 서버의 다이렉트 서브라우팅 유실 한계를 우회하기 위해 루트 경로 경유 쿼리 파라미터로 공유 링크 구성
      const shareUrl = `${origin}/?route=community&post=${id}`;
      
      const shareTitle = t('coffee_talk.msg_share_title', 'Beanmind Coffee Talk');
      const shareText = t('coffee_talk.msg_share_text', '이 재미있는 커피 이야기를 확인해보세요!');

      let sharedSuccessfully = false;

      // 1. 브라우저 보안 제스처가 유효한 동안 즉각 공유창 또는 클립보드 복사 실행
      if (isNative) {
          try {
              await CapacitorShare.share({
                  title: shareTitle,
                  text: shareText,
                  url: shareUrl,
                  dialogTitle: shareTitle
              });
              sharedSuccessfully = true;
          } catch (e) {
              console.log("Capacitor Share API cancelled or failed", e);
              return;
          }
      } else if (navigator.share) {
          try {
              await navigator.share({
                  title: shareTitle,
                  text: shareText,
                  url: shareUrl
              });
              sharedSuccessfully = true;
          } catch (e) {
              console.log("Web Share API cancelled or failed", e);
              return;
          }
      } else {
          try {
              await navigator.clipboard.writeText(shareUrl);
              alert(t('coffee_talk.alert_copy_link', '커뮤니티 링크가 클립보드에 복사되었습니다.'));
              sharedSuccessfully = true;
          } catch (e) {
              console.error("Clipboard copy failed", e);
              return;
          }
      }

      // 2. 백그라운드 비동기로 서버에 카운트 업 요청 및 로컬 상태 + 글로벌 피드 캐시 갱신
      if (sharedSuccessfully) {
          try {
              const url = `${API_BASE}/api/community/posts/${id}/share`;
              const res = await fetch(url, { method: 'POST' });
              if (res.ok) {
                  const data = await res.json();
                  
                  // 로컬 posts 상태 갱신
                  setPosts(prev => prev.map(p => {
                      if (p.id === id) {
                          return { ...p, shareCount: data.shareCount };
                      }
                      return p;
                  }));

                  // 캐시에도 동시 갱신 반영하여 뒤로가기/복원 시 유실 차단
                  const cacheKey = activeFilter + '_' + sortOption;
                  if (globalFeedCache[cacheKey]) {
                      globalFeedCache[cacheKey].posts = globalFeedCache[cacheKey].posts.map((p: any) => {
                          if (p.id === id) return { ...p, shareCount: data.shareCount };
                          return p;
                      });
                  }
              }
          } catch (e) {
              console.error("Failed to share count up API call", e);
          }
      }
  };

  const processReward = async (amount: number, description: string) => {
    if (!selectedRewardTarget) return;
    
    const token = localStorage.getItem('token');
    if (!token) {
        alert("로그인이 필요합니다.");
        navigate('/profile');
        return;
    }

    setIsRewarding(true);
    try {
        const res = await fetch(`${API_BASE}/api/points/reward`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                targetUserId: selectedRewardTarget.id,
                amount,
                description,
                targetType: 'POST',
                targetEntityId: selectedRewardTarget.entityId
            })
        });

        if (res.ok) {
            alert(t('coffee_talk.alert_reward_ok', '{{name}}님에게 커피콩 선물을 완료했습니다! ☕🎁', {name: selectedRewardTarget.name}));
            setShowRewardModal(false);
            setSelectedRewardTarget(null);
            fetchPosts(true); // Refresh feed silently to update earned beans without losing scroll position
        } else {
            const errData = await res.json();
            let errMsg = errData.error || '선물에 실패했습니다.';
            if (errData.error?.startsWith('ERR_')) errMsg = t(`api_error.${errData.error}`);
            alert(errMsg);
        }
    } catch (error) {
        console.error('Failed to reward', error);
        alert('오류가 발생했습니다.');
    } finally {
        setIsRewarding(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const remainingSlots = 10 - (newImages.length + existingImages.length);
      const filesToAdd = files.slice(0, remainingSlots);

      setNewImages(prev => [...prev, ...filesToAdd]);
      
      const newPreviews = filesToAdd.map(file => URL.createObjectURL(file));
      setNewImagePreviews(prev => [...prev, ...newPreviews]);
      
      if (files.length > remainingSlots) {
          alert(`최대 10개의 미디어만 업로드할 수 있습니다.`);
      }
    }
  };

  const removeImage = (index: number, isExisting: boolean) => {
      if (isExisting) {
          setExistingImages(prev => prev.filter((_, i) => i !== index));
      } else {
          setNewImages(prev => prev.filter((_, i) => i !== index));
          setNewImagePreviews(prev => prev.filter((_, i) => i !== index));
      }
  };

  const handleSubmitPost = async () => {
    if (!newContent) {
        alert("내용을 입력해주세요.");
        return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
        alert("로그인이 필요합니다.");
        navigate('/profile');
        return;
    }

    setIsSubmitting(true);
    try {
        const formData = new FormData();
        formData.append('content', newContent);
        
        newImages.forEach(img => formData.append('images', img));
        if (editPostId) {
            formData.append('existingImages', JSON.stringify(existingImages));
        }
        
        if (taggedShop) {
            formData.append('cafeName', taggedShop.name);
            formData.append('cafeLocation', taggedShop.address);
            formData.append('cafeLat', taggedShop.lat.toString());
            formData.append('cafeLng', taggedShop.lng.toString());
            if (taggedShop.id) formData.append('storeId', taggedShop.id);
        }
        
        if (tastingNote.acidity > 0) formData.append('acidity', tastingNote.acidity.toString());
        if (tastingNote.sweetness > 0) formData.append('sweetness', tastingNote.sweetness.toString());
        if (tastingNote.body > 0) formData.append('body', tastingNote.body.toString());
        if (tastingNote.bitterness > 0) formData.append('bitterness', tastingNote.bitterness.toString());
        if (tastingNote.aroma > 0) formData.append('aroma', tastingNote.aroma.toString());
        if (taggedBean.trim()) formData.append('taggedBean', taggedBean.trim());
        
        if (composeMode === 'SHORTS') {
            if (shortsCategory) formData.append('shortsCategory', shortsCategory);
            if (equipmentTag.trim()) formData.append('equipmentTag', equipmentTag.trim());
        }

        if (isRecipeMode) {
            formData.append('recipeData', JSON.stringify(recipeData));
        }
        
        if (hasPoll && pollDraft.question?.trim() && pollDraft.options.filter(o => typeof o === 'string' && o.trim()).length >= 2) {
            formData.append('pollData', JSON.stringify({
                 question: pollDraft.question.trim(),
                 options: pollDraft.options.filter(o => typeof o === 'string' && o.trim()),
                 durationHours: pollDraft.durationHours
            }));
        } else if (editPostId && !hasPoll) {
            formData.append('removePoll', 'true');
        }

        if (currentUser?.role === 'OWNER' && isAnnouncement) {
            formData.append('postType', 'ANNOUNCEMENT');
        }

        if (isPilgrimageLedgerCompose) {
            formData.append('isPilgrimageLedger', 'true');
        }
        
        if (editPostId) {
            formData.append('attachedCourseId', attachedCourseId || '');
        } else if (attachedCourseId) {
            formData.append('attachedCourseId', attachedCourseId);
        }

        formData.append('countryCode', getDeviceCountryCode());

        // BGM Theme or Custom BGM injection
        if (customBgmTitle && customBgmTitle.trim()) {
            formData.append('bgmTheme', JSON.stringify({ title: customBgmTitle.trim(), videoId: 'custom_search' }));
        } else if (selectedBgmTheme) {
            const themeObj = BGM_THEMES.find(t => t.id === selectedBgmTheme);
            if (themeObj) {
                formData.append('bgmTheme', JSON.stringify({ title: themeObj.title, videoId: themeObj.videoId }));
            }
        } else if (editPostId) {
            formData.append('removeBgm', 'true');
        }
        
        if (composeMode === 'SHORTS') {
            formData.append('isShorts', 'true');
        } else {
            formData.append('isShorts', 'false');
        }

        const url = editPostId ? `${API_BASE}/api/community/posts/${editPostId}` : `${API_BASE}/api/community/posts`;
        const res = await fetch(url, {
            method: editPostId ? 'PUT' : 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (res.ok) {
            // Reload posts
            setIsWriteModalOpen(false);
            setNewContent('');
            setSelectedBgmTheme('');
            setCustomBgmTitle('');
            setIsCustomBgmInputActive(false);
            setNewImages([]);
            setNewImagePreviews([]);
            setExistingImages([]);
            setTaggedShop(null);
            setTaggedBean('');
            setShortsCategory('');
            setEquipmentTag('');
            setIsRecipeMode(false);
            setRecipeData({ dose: '', yield: '', temp: '', time: '', grinder: '', method: '' });
            setHasPoll(false);
            setIsAnnouncement(false);
            setPollDraft({ question: '', options: ['', ''], durationHours: 24 });
            setEditPostId(null);
            setTastingNote({ acidity: 0, sweetness: 0, body: 0, bitterness: 0, aroma: 0 });
            setAttachedCourseId(null);
            setIsCourseSelectorOpen(false);
            setComposeMode('GENERAL');
            
            // Re-fetch posts smoothly to stay on the current tab
            fetchPosts();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            let errText = await res.text();
            try {
                const errJson = JSON.parse(errText);
                if (errJson.errorCode) {
                    errText = t(`api_error.${errJson.errorCode}`, errJson.error || errText);
                } else if (errJson.error) {
                    errText = t(`api_error.${errJson.error}`, errJson.error); // Fallback for raw string matching
                    if (errText === `api_error.${errJson.error}`) errText = errJson.error; // If no translation, use raw string
                }
            } catch (e) {
                // If not JSON, leave errText as is
            }
            console.error("SERVER ERROR RESPONSE:", errText);
            alert(editPostId ? t('coffeetalk.error_edit', { error: errText }) : t('coffeetalk.error_upload', { error: errText }));
        }
    } catch (error) {
        console.error("Upload error", error);
        alert(t('coffeetalk.error_generic') || "오류가 발생했습니다.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleAdminDeletePost = async (postId: string) => {
      setActivePostMenuId(null);
      let reason = window.prompt("⚠️ 관리자 권한으로 삭제합니다.\n\n해당 게시글을 삭제하는 사유를 입력해주세요. 입력된 사유는 즉시 작성자에게 메일로 발송됩니다.");
      if (reason === null) return;
      if (!reason.trim()) {
          alert("삭제 사유를 반드시 입력해야 합니다.");
          return;
      }

      const token = localStorage.getItem('token');
      if (!token) return;

      try {
          const res = await fetch(`${API_BASE}/api/admin/content/delete`, {
              method: 'POST',
              headers: { 
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({ type: 'POST', id: postId, reason: reason.trim() })
          });

          if (res.ok) {
              setPosts(prev => prev.filter(p => p.id !== postId));
              alert("삭제 및 알림 발송이 완료되었습니다.");
          } else {
              const err = await res.json();
              alert(err.error || "관리자 삭제에 실패했습니다.");
          }
      } catch (e) {
          console.error('Admin Delete error', e);
          alert("오류가 발생했습니다.");
      }
  };

  const handleEditPost = (post: Post) => {
      setActivePostMenuId(null);
      setEditPostId(post.id);
      
      const { cleanContent, bgm } = parseBgmFromContent(post.content);
      setNewContent(cleanContent);
      if (bgm) {
          const matchingTheme = BGM_THEMES.find(t => t.videoId === bgm.videoId || t.title === bgm.title);
          if (matchingTheme) {
              setSelectedBgmTheme(matchingTheme.id);
              setCustomBgmTitle('');
              setIsCustomBgmInputActive(false);
          } else {
              setSelectedBgmTheme('');
              setCustomBgmTitle(bgm.title);
              setIsCustomBgmInputActive(true);
          }
      } else {
          setSelectedBgmTheme('');
          setCustomBgmTitle('');
          setIsCustomBgmInputActive(false);
      }
      
      if (post.isShorts) {
          setComposeMode('SHORTS');
      } else if (post.postType === 'ANNOUNCEMENT' || post.postType === 'EVENT') {
          setComposeMode('NOTICE');
      } else {
          setComposeMode('GENERAL');
      }
      
      // Parse existing image arrays
      let imagesArray: string[] = [];
      if (post.image) {
          try {
              const parsed = JSON.parse(post.image);
              imagesArray = Array.isArray(parsed) ? parsed : [post.image];
          } catch(e) {
              imagesArray = [post.image];
          }
      }
      setExistingImages(imagesArray);
      setNewImages([]);
      setNewImagePreviews([]);

      if (post.cafeName && post.cafeLat && post.cafeLng) {
          setTaggedShop({
              name: post.cafeName,
              address: post.cafeLocation || '',
              lat: post.cafeLat,
              lng: post.cafeLng
          });
      } else {
          setTaggedShop(null);
      }
      setTaggedBean(post.taggedBean || '');
      setShortsCategory(post.shortsCategory || '');
      setEquipmentTag(post.equipmentTag || '');
      
      if (post.recipeData) {
          setIsRecipeMode(true);
          setRecipeData(post.recipeData);
      } else {
          setIsRecipeMode(false);
          setRecipeData({ dose: '', yield: '', temp: '', time: '', grinder: '', method: '' });
      }

      if (post.poll) {
          setHasPoll(true);
          // Calculate remaining hours if expiresAt exists, else default to 24
          let remaining = 24;
          if (post.poll.expiresAt) {
              const diffMs = new Date(post.poll.expiresAt).getTime() - Date.now();
              if (diffMs > 0) remaining = Math.ceil(diffMs / (1000 * 60 * 60));
          }
          setPollDraft({ 
              question: post.poll.question, 
              options: post.poll.options.map(o => o.text), 
              durationHours: remaining 
          });
      } else {
          setHasPoll(false);
          setPollDraft({ question: '', options: ['', ''], durationHours: 24 });
      }

      setTastingNote({
          acidity: post.tastingNote?.acidity || 0,
          sweetness: post.tastingNote?.sweetness || 0,
          body: post.tastingNote?.body || 0,
          bitterness: post.tastingNote?.bitterness || 0,
          aroma: post.tastingNote?.aroma || 0
      });
      setAttachedCourseId(post.attachedCourseId || null);
      if (post.attachedCourseId) {
          setIsCourseSelectorOpen(true);
      }
      setIsWriteModalOpen(true);
  };

  const handleVote = async (postId: string, optionId: string) => {
      try {
          const res = await fetch(`${API_BASE}/api/community/posts/${postId}/poll/vote`, {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`,
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({ optionId })
          });
          const data = await res.json();
          if (data.success) {
              setPosts(prevPosts => prevPosts.map(p => {
                  if (p.id === postId && p.poll) {
                      const newPoll = { ...p.poll };
                      newPoll.options = newPoll.options.map((o: any) => {
                          const wasVoted = o.votes.some((v: any) => v.userId === currentUserId);
                          let newCount = o._count.votes;
                          let newVotes = [...o.votes];
                          
                          if (wasVoted) {
                              newCount = Math.max(0, newCount - 1);
                              newVotes = newVotes.filter((v: any) => v.userId !== currentUserId);
                          }
                          if (o.id === optionId) {
                              newCount += 1;
                              newVotes.push({ userId: currentUserId });
                          }
                          
                          return { ...o, _count: { votes: newCount }, votes: newVotes };
                      });
                      return { ...p, poll: newPoll };
                  }
                  return p;
              }));
          } else {
              alert(t(`api_error.${data.error}`, data.error || '투표 실패'));
          }
      } catch(e) { console.error('Vote error:', e); }
  };

  const handleDeletePost = async (id: string) => {
      setActivePostMenuId(null);
      if (!window.confirm("정말로 이 게시물을 삭제하시겠습니까?")) return;
      
      try {
          const token = localStorage.getItem('token');
          if (!token) return;
          const url = `${API_BASE}/api/community/posts/${id}`;
          const res = await fetch(url, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
              setPosts(prev => prev.filter(p => p.id !== id));
          } else {
              alert("게시물 삭제에 실패했습니다.");
          }
      } catch (err) {
          console.error("Delete error", err);
          alert("오류가 발생했습니다.");
      }
  };

  const handleReportPost = async (id: string) => {
      setActivePostMenuId(null);
      const reason = window.prompt("신고 사유를 간단히 입력해주세요.\n('음란물', '불법', '범죄' 등의 키워드 포함 시 즉시 블라인드 처리될 수 있습니다.)");
      if (reason === null) return;
      
      try {
          const token = localStorage.getItem('token');
          if (!token) {
              alert('로그인이 필요한 서비스입니다.');
              return;
          }
          const res = await fetch(`${API_BASE}/api/community/posts/${id}/report`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ reason: reason.trim() || '유저 자발적 신고' })
          });
          if (res.ok) {
              const data = await res.json();
              alert('신고가 접수되었습니다.');
              if (data.isHidden) {
                  setPosts(prev => prev.filter(p => p.id !== id));
              }
          } else {
              const err = await res.json();
              alert(err.error || '신고 처리에 실패했습니다.');
          }
      } catch (err) {
          console.error("Report error", err);
          alert("오류가 발생했습니다.");
      }
  };

  const handleMapClick = (post: Post) => {
      handleOpenMap(post.store?.id || null, post.cafeLat || post.store?.lat || 37.5665, post.cafeLng || post.store?.lng || 126.9780, post.cafeName || post.store?.name || '위치 정보');
  };

  // BGM Audio volume synchronization & Clean-up effect
  React.useEffect(() => {
    if (bgmAudioRef.current) {
      bgmAudioRef.current.volume = bgmVolume / 100;
    }
  }, [bgmVolume]);

  React.useEffect(() => {
    return () => {
      if (bgmAudioRef.current) {
        bgmAudioRef.current.pause();
        bgmAudioRef.current = null;
      }
    };
  }, []);

  // User Profile
  React.useEffect(() => {
    const fetchUserProfile = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const url = `${API_BASE}/api/users/me`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setUserProfile({
            prefAcidity: data.prefAcidity || 0,
            prefSweetness: data.prefSweetness || 0,
            prefBody: data.prefBody || 0
          });
        }
      } catch (e) {
        console.error("Failed to fetch user profile", e);
      }
    };
    fetchUserProfile();
  }, []);

  // Geolocation with manual timeout fallback for Capacitor silent hangs
  React.useEffect(() => {
    if (activeFilter === '근처 라이브 (1km)' || activeFilter === 'All') {
       if (navigator.geolocation && !currentLoc) {
         let fallbackTriggered = false;
         const fallbackTimeout = setTimeout(() => {
             if (!currentLoc) {
                 fallbackTriggered = true;
                 console.log('Mobile Geolocation forced timeout fallback -> Using Pangyo coordinates');
                 setCurrentLoc({ lat: 37.4033, lng: 127.1163 });
             }
         }, 7000);

         navigator.geolocation.getCurrentPosition(
           (pos) => {
             if (fallbackTriggered) return;
             clearTimeout(fallbackTimeout);
             setCurrentLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
           },
           (err) => {
             if (fallbackTriggered) return;
             clearTimeout(fallbackTimeout);
             console.log('Geolocation error:', err);
             // Fallback to Pangyo test location
             setCurrentLoc({ lat: 37.4033, lng: 127.1163 });
           },
           { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
         );
       } else if (!navigator.geolocation && !currentLoc) {
           setCurrentLoc({ lat: 37.4033, lng: 127.1163 });
       }
    }
  }, [activeFilter, currentLoc]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const calculateTasteMatch = (post: Post) => {
    if (!userProfile || !post.tastingNote) return 0;
    const diffA = Math.abs(userProfile.prefAcidity - post.tastingNote.acidity);
    const diffS = Math.abs(userProfile.prefSweetness - post.tastingNote.sweetness);
    const diffB = Math.abs(userProfile.prefBody - post.tastingNote.body);
    const maxDiff = 15;
    return Math.max(0, 100 - ((diffA + diffS + diffB) / maxDiff * 100));
  };

  const filteredPosts = posts.filter(post => {
    // 0. Hidden Announcements Check
    if (post.isPinned && hiddenAnnouncements.includes(post.id)) {
        return false;
    }

    // 1. Text Search Filter
    if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesContent = (post.content || '').toLowerCase().includes(query);
        const matchesAuthor = (post.author?.name || '').toLowerCase().includes(query);
        const matchesCafe = (post.cafeName || '').toLowerCase().includes(query);
        if (!matchesContent && !matchesAuthor && !matchesCafe) {
            return false;
        }
    }

    // Bypass category filters for pinned posts if no search query,
    // EXCEPT for strictly localized or personalized tabs where distance/taste matters.
    if (post.isPinned && !searchQuery.trim() && (activeFilter === 'all' || activeFilter === 'following_story')) return true;

    // 2. Tab Filters
    if (activeFilter === 'all') {
        return post.postType !== 'ANNOUNCEMENT' && post.postType !== 'EVENT';
    }
    
    if (activeFilter === 'taste_match') {
       if (!userProfile) return false;
       return calculateTasteMatch(post) >= 85;
    }
    
    if (activeFilter === 'near_live') {
       if (!currentLoc) return false;
       const pLat = Number(post.cafeLat || post.store?.lat);
       const pLng = Number(post.cafeLng || post.store?.lng);
       if (!pLat || !pLng || isNaN(pLat) || isNaN(pLng)) return false;
       const dist = calculateDistance(currentLoc.lat, currentLoc.lng, pLat, pLng);
       console.log(`[NEAR_LIVE_DEBUG] id:${post.id.slice(-4)} | User(${currentLoc.lat.toFixed(4)}, ${currentLoc.lng.toFixed(4)}) - Cafe(${pLat.toFixed(4)}, ${pLng.toFixed(4)}) | Dist:${dist.toFixed(2)}km`);
       return dist <= 3;
    }
    
    if (activeFilter === 'home_cafe') {
       const tags = [t('coffee_talk.tag_bean_review', '원두리뷰'), t('coffee_talk.tag_gear_boast', '장비자랑'), t('coffee_talk.tag_home_brewing', '홈브루잉'), t('coffee_talk.tag_coffee_recipe', '커피레시피'), t('coffee_talk.tag_home_cafe_life', '홈카페일상'), t('coffee_talk.tag_pairing', '페어링')]; return tags.some(tag => post.content?.includes(`#${tag}`));
    }
    
    if (activeFilter === 'pilgrimage_talk') {
       return post.isPilgrimageLedger === true || !!post.attachedCourseId;
    }
    
    return true;
  });

  const executeSearch = () => {
      setSearchQuery(searchInput);
      if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
      }
  };

  return (
    <div className="absolute inset-0 bg-espresso-950 text-espresso-50 flex flex-col font-sans">
      {/* Header (Glassmorphism) with tap-to-top */}
      <header 
        onClick={(e) => {
           // Prevent scrolling if touching interactive elements like inputs or buttons
           if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).tagName === 'INPUT') return;
           const container = document.getElementById('coffee-feed-container');
           if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        className="shrink-0 z-50 bg-espresso-900/80 backdrop-blur-xl border-b border-espresso-700/80 pt-safe cursor-pointer"
      >
        <div className="flex justify-between items-center px-4 h-14">
          {!isSearchOpen ? (
            <>
              <h1 className="text-xl font-extrabold tracking-tight text-espresso-50 flex items-center gap-2">
                Coffee Talk <span className="flex h-2 w-2 rounded-full bg-amber-500"></span>
              </h1>
              <div className="flex items-center gap-1 text-espresso-200">
                <div className="relative flex items-center pr-1">
                  <span className="text-[12px] font-bold text-espresso-300 hidden sm:inline-block mr-1">{t('coffee_talk.sort_label', '정렬:')}</span>
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="appearance-none bg-transparent text-[13px] font-extrabold text-amber-500 pr-4 pl-1 outline-none cursor-pointer hover:text-amber-400 transition-colors"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="latest" className="text-espresso-950 font-bold">{t('coffee_talk.sort_latest', '최신순')}</option>
                    <option value="popular" className="text-espresso-950 font-bold">{t('coffee_talk.sort_popular', '인기순')}</option>
                    <option value="sponsored" className="text-espresso-950 font-bold">{t('coffee_talk.sort_sponsored', '후원순')}</option>
                  </select>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none opacity-80">
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500" />
                    </svg>
                  </div>
                </div>
                <button onClick={() => setIsSearchOpen(true)} className="p-2 hover:bg-espresso-800 rounded-full transition-colors"><Search size={22} /></button>
              </div>
            </>
          ) : (
            <form 
              onSubmit={(e) => { e.preventDefault(); executeSearch(); }}
              className="flex items-center w-full relative"
            >
              <Search size={18} className="text-espresso-300 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder={t('coffee_talk.ph_search', '게시물, 작성자, 카페 검색...')} 
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                autoFocus
                className="w-full bg-espresso-800/80 text-espresso-50 pl-10 pr-[4.5rem] py-2 rounded-full focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all text-[15px]"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <button 
                    type="submit"
                    className="text-[13px] font-bold text-amber-500 hover:text-amber-400 px-1 py-1"
                  >{t('coffee_talk.btn_search', '검색')}</button>
                  <button 
                    type="button"
                    onClick={() => { setIsSearchOpen(false); setSearchInput(''); setSearchQuery(''); }} 
                    className="text-[13px] font-medium text-espresso-200 hover:text-espresso-50 px-1 py-1"
                  >{t('coffee_talk.btn_cancel', '취소')}</button>
              </div>
            </form>
          )}
        </div>
        
        {/* Taste Filtering Scroll */}
        <div className="px-4 pt-2 pb-3 flex overflow-x-auto gap-2 no-scrollbar">
          {['all', 'shorts', 'following_story', 'pilgrimage_talk', 'near_live', 'home_cafe'].map((filter) => (
            <button
              key={filter}
              onClick={() => {
                  if (filter === 'clubs') {
                      const token = localStorage.getItem('token');
                      if (!token) {
                          if (window.confirm(t('coffee_talk.alert_login_write', '로그인이 필요한 서비스입니다. 로그인 화면으로 이동하시겠습니까?'))) {
                              navigate('/profile');
                          }
                          return;
                      }
                      navigate('/clubs');
                      return;
                  }
                  setActiveFilter(filter);
                  setIsDeepLinked(false);
              }}
              className={`relative px-4 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all duration-300 ${
                activeFilter === filter 
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-espresso-50 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                  : 'bg-espresso-800/60 text-espresso-200 border border-espresso-600/50 hover:bg-espresso-800'
              }`}
            >
              {getFilterLabel(filter, t)}
              {filter === 'following_story' && unreadAnnouncementsCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white shadow-md border border-espresso-950 animate-bounce">
                      {unreadAnnouncementsCount > 9 ? '9+' : unreadAnnouncementsCount}
                  </span>
              )}
              {filter === 'clubs' && unreadClubsBadge && (
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-md border border-espresso-950 animate-pulse">
                      N
                  </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* 스크롤 복원 중 마스킹 오버레이: opacity 대신 별도 div로 덮어 iOS WKWebView 컴포지팅 레이어 초기화 방지 */}
      {isScrollJumping && (
        <div className="absolute inset-0 z-40 bg-espresso-950" />
      )}

      {/* Main Feed Content */}
      <PullToRefresh id="coffee-feed-container" onRefresh={async () => { await fetchPosts(true); }} className={`flex-1 overflow-y-auto scroll-smooth ${activeFilter === 'shorts' ? 'snap-y snap-mandatory pb-0 pt-0 bg-black no-scrollbar' : 'pb-24'}`}>
        <div className={`mx-auto ${activeFilter === 'shorts' ? 'w-full max-w-md md:max-w-2xl h-full' : 'max-w-md md:max-w-2xl sm:px-4 sm:pb-4'}`}>
          {activeFilter === 'near_live' && <HotspotMap />}
          {isLoading && <p className="text-center text-espresso-200 mt-10">{t('coffee_talk.loading_feed', '피드를 불러오는 중입니다...')}</p>}
          {!isLoading && filteredPosts.length === 0 && (
            <div className="text-center text-espresso-200 mt-10 p-6 bg-espresso-900/50 rounded-2xl mx-4 border border-espresso-700/50">
               {activeFilter === 'taste_match' && !userProfile ? (
                  <>
                    <Coffee size={32} className="mx-auto mb-3 opacity-50" />
                    <p>{t('coffee_talk.no_taste_1', '내 취향에 맞는 커피를 찾으려면')}<br/><span className="text-amber-500 font-bold">{t('coffee_talk.no_taste_2', '프로필에서 취향을 먼저 설정')}</span>{t('coffee_talk.no_taste_3', '해주세요.')}</p>
                  </>
               ) : (
                  <>
                    <Search size={32} className="mx-auto mb-0 opacity-50" />
                    <p>{t('coffee_talk.no_posts', '조건에 맞는 게시물이 없습니다.')}</p>
                   </>
               )}
            </div>
          )}{!isLoading && premiumAd && activeFilter === 'all' && !isDeepLinked && (() => {
               const ad = premiumAd.ad || premiumAd;
               if (!ad || ad.fallback === 'ADMOB') return null;
               return (
                   <div className="mb-0 mx-0">
                       <FeedAdCard adData={ad} />
                   </div>
               );
          })()}
          {!isLoading && neighborPremiumAd && activeFilter === 'near_live' && !isDeepLinked && (() => {
               const ad = neighborPremiumAd.ad || neighborPremiumAd;
               if (!ad || ad.fallback === 'ADMOB') return null;
               return (
                   <div className="mb-0 mx-0">
                       <FeedAdCard adData={ad} />
                   </div>
               );
          })()}
          {!isLoading && filteredPosts.map((post, idx) => {
            const { cleanContent, bgm } = parseBgmFromContent(((i18n.language?.startsWith('en') || getDeviceCountryCode() === 'US') && post.contentEn) ? post.contentEn : post.content);
            return (
              <React.Fragment key={post.id}>
              
              {/* Standard Ad Injection: 1 ad every 5 posts */}
              {idx > 0 && (idx + 1) % 5 === 0 && feedAd && ['all', 'taste_match', 'home_cafe', 'following_story', 'pilgrimage_talk'].includes(activeFilter) && !isDeepLinked && (() => {
                 const ad = feedAd.ads?.length > 0 ? feedAd.ads[Math.floor(idx / 5) % feedAd.ads.length] : (feedAd.ad || feedAd);
                 if (!ad || ad.fallback === 'ADMOB') return null;
                 return (
                     <div className="mb-0 mx-0">
                         <FeedAdCard adData={ad} />
                     </div>
                 );
              })()}

              {idx > 0 && (idx + 1) % 5 === 0 && neighborAd && activeFilter === 'near_live' && !isDeepLinked && (() => {
                 const ad = neighborAd.ads?.length > 0 ? neighborAd.ads[Math.floor(idx / 5) % neighborAd.ads.length] : (neighborAd.ad || neighborAd);
                 if (!ad || ad.fallback === 'ADMOB') return null;
                 return (
                     <div className="mb-0 mx-0">
                         <FeedAdCard adData={ad} />
                     </div>
                 );
              })()}

              {/* Shorts Ad Injection: 1 ad every 3 shorts */}
              {idx > 0 && (idx + 1) % 3 === 0 && shortsAd && activeFilter === 'shorts' && !isDeepLinked && (() => {
                 const ad = shortsAd.ads?.length > 0 ? shortsAd.ads[Math.floor(idx / 3) % shortsAd.ads.length] : (shortsAd.ad || shortsAd);
                 if (!ad || ad.fallback === 'ADMOB') return null;
                 return (
                     <div className="snap-start snap-always w-full h-full shrink-0 mx-0 mb-0 border-0 rounded-none overflow-hidden bg-black relative flex items-center justify-center">
                         <ShortsAdCard adData={ad} isActive={true} />
                     </div>
                 );
              })()}
              
              {/* Branch between Official Announcements and Normal Posts */}
              {post.postType === 'ANNOUNCEMENT' || post.postType === 'EVENT' ? (
                  <article id={`post-${post.id}`} className="bg-gradient-to-b from-[#3a2008] to-[#1a1205] border-amber-500 rounded-none sm:rounded-3xl mx-0 sm:border-2 border-y-2 border-x-0 overflow-hidden shadow-[0_10px_40px_rgba(245,158,11,0.25)] mb-0 relative transition-colors">
                      {/* Prominent Official Top Banner */}
                      <div className="w-full bg-amber-500 py-2.5 px-4 flex items-center justify-between shadow-sm">
                          <span className="text-espresso-950 font-black text-sm tracking-widest flex items-center gap-1.5">
                              📢 {post.postType === 'EVENT' ? t('coffee_talk.badge_event', '공식 이벤트 (EVENT)') : (post.author?.role === 'ADMIN' || post.author?.role === 'SUPER_ADMIN' ? t('coffee_talk.badge_system_notice', 'BeanMind 시스템 공지') : t('coffee_talk.badge_notice', '매장 공식 공지사항 (NOTICE)'))}
                          </span>
                      </div>
                      {/* Official Badge Header */}
                      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-600/30 to-transparent border-b border-amber-500/30">
                          <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl overflow-hidden border border-amber-500 relative bg-espresso-900 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                                  <img 
                                      src={post.store?.mainImageUrl ? (post.store.mainImageUrl.startsWith('/') ? `${API_BASE}${post.store.mainImageUrl}` : post.store.mainImageUrl) : 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=200&q=80'} 
                                      alt="store thumbnail" 
                                      className="w-full h-full object-cover absolute inset-0" 
                                  />
                              </div>
                              <div>
                                  <div className="flex items-center gap-2">
                                      <h3 className="font-extrabold text-[15px] text-amber-500 flex items-center gap-1.5 drop-shadow-md">
                                          {post.store?.name || post.cafeName || post.author.name}
                                          <Star size={14} className="text-amber-500 fill-amber-500" />
                                      </h3>
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-1">
                                      {!(post.author?.role === 'ADMIN' || post.author?.role === 'SUPER_ADMIN') && (
                                          <span className="text-[10px] font-black bg-amber-500 text-espresso-950 px-2 py-0.5 rounded-sm tracking-wider">
                                              {post.postType === 'EVENT' ? 'EVENT' : t('coffee_talk.label_regular_notice', '단골 소식')}
                                          </span>
                                      )}
                                      <span className="text-[10px] text-amber-200/80 font-medium">{post.timeAgo}</span>
                                  </div>
                              </div>
                          </div>
                          
                          {/* Options/Edit Menu */}
                          <div className="flex items-center gap-2">
                            {currentUser && (
                              <div className="relative z-50">
                                <button 
                                  onClick={() => setActivePostMenuId(activePostMenuId === post.id ? null : post.id)} 
                                  className="p-2 text-amber-500/80 hover:text-amber-400 transition-colors"
                                >
                                  <MoreVertical size={20} />
                                </button>
                                {activePostMenuId === post.id && (
                                  <div className="absolute right-0 top-10 mt-1 w-36 bg-espresso-900 border border-amber-500/50 rounded-2xl shadow-2xl py-2 z-50 overflow-hidden">
                                    {post.author.id === currentUser?.id ? (
                                      <>
                                        <button 
                                          onClick={() => handleEditPost(post)} 
                                          className="w-full text-left px-4 py-2.5 text-[13px] font-medium text-espresso-100 hover:bg-espresso-800 flex items-center gap-2"
                                        >
                                          <Edit2 size={14} />{t('coffee_talk.btn_edit', '수정하기')}
                                        </button>
                                        <button 
                                          onClick={() => handleDeletePost(post.id)} 
                                          className="w-full text-left px-4 py-2.5 text-[13px] font-medium text-red-500 hover:bg-espresso-800 flex items-center gap-2"
                                        >
                                          <Trash2 size={14} />{t('coffee_talk.btn_delete', '삭제하기')}
                                        </button>
                                      </>
                                    ) : (
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); if(window.confirm(t('coffee_talk.confirm_report', '이 게시물을 신고하시겠습니까?'))) handleReportPost(post.id); }} 
                                          className="w-full text-left px-4 py-2.5 text-[13px] font-bold text-red-500 hover:bg-espresso-800 flex items-center gap-2"
                                        >
                                          <span className="w-3 h-3 rounded-full bg-red-500 flex items-center justify-center text-[8px] text-white font-bold leading-none">!</span> {t('coffee_talk.btn_report', '신고하기')}
                                        </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                      </div>

                      {/* Official Post Body Content */}
                      <div 
                          className={`p-4 relative ${(((i18n.language?.startsWith('en') || getDeviceCountryCode() === 'US') && post.contentEn) ? post.contentEn : post.content) && ((((i18n.language?.startsWith('en') || getDeviceCountryCode() === 'US') && post.contentEn) ? post.contentEn : post.content).length > 150 || (((i18n.language?.startsWith('en') || getDeviceCountryCode() === 'US') && post.contentEn) ? post.contentEn : post.content).split('\n').length > 4) && !expandedPosts.has(post.id) ? 'cursor-pointer active:bg-espresso-900/50 transition-colors rounded-b-xl' : ''}`}
                          onClick={(e) => {
                              const contentToUse = ((i18n.language?.startsWith('en') || getDeviceCountryCode() === 'US') && post.contentEn) ? post.contentEn : post.content;
                              if (contentToUse && (contentToUse.length > 150 || contentToUse.split('\n').length > 4)) {
                                  e.stopPropagation();
                                  setExpandedPosts(prev => {
                                      const next = new Set(prev);
                                      if (next.has(post.id)) next.delete(post.id);
                                      else next.add(post.id);
                                      return next;
                                  });
                              }
                          }}
                      >
                          {/* Giant Watermark for EXTREME clarity */}
                          <div className="absolute top-0 right-4 pointer-events-none select-none overflow-hidden">
                              <span className="text-[60px] font-black text-amber-500/10 italic leading-none block -translate-y-4 translate-x-2">NOTICE</span>
                          </div>
                      
                          <p className={`text-[14px] text-espresso-50 leading-relaxed whitespace-pre-wrap font-medium break-words z-10 relative overflow-hidden transition-all duration-300 ${!expandedPosts.has(post.id) ? 'line-clamp-4' : ''}`}>
                              {renderWithLinks(cleanContent)}
                          </p>
                          {(cleanContent?.split('\n').length > 4 || (cleanContent?.length || 0) > 150) && !expandedPosts.has(post.id) && (
                              <div className="mt-2 text-right z-10 relative">
                                  <span className="text-[12px] font-bold text-amber-500 transition-colors">
                                      {t('coffee_talk.btn_expand', '더 보기')}
                                  </span>
                              </div>
                          )}
                          
                          {/* Official Media Banner */}
                          {(((i18n.language?.startsWith('en') || getDeviceCountryCode() === 'US') && post.imageEn) ? post.imageEn : post.image) && (
                              <div className="relative mt-4 aspect-[4/3] sm:aspect-[16/9] w-[calc(100%+2rem)] -mx-4 group shadow-inner">
                                  {(() => {
                                      const imageToUse = ((i18n.language?.startsWith('en') || getDeviceCountryCode() === 'US') && post.imageEn) ? post.imageEn : post.image;
                                      let urls: string[] = [];
                                      try {
                                          if (typeof imageToUse === 'string') {
                                              const parsed = JSON.parse(imageToUse);
                                              if (Array.isArray(parsed)) urls = parsed;
                                              else urls = [imageToUse];
                                          } else if (Array.isArray(imageToUse)) {
                                              urls = imageToUse;
                                          } else {
                                              urls = [String(imageToUse)];
                                          }
                                      } catch(e) {
                                          urls = [imageToUse];
                                      }
                                      if (!urls || urls.length === 0 || !urls[0]) return null;
                                      const firstImageStr = typeof urls[0] === 'string' ? urls[0] : String(urls[0]);
                                      
                                      return (
                                          <div className="absolute inset-0 w-full h-full cursor-pointer" onClick={(e) => { e.stopPropagation(); setActiveCarouselUrls(urls); }}>
                                              <MediaRenderer src={firstImageStr} className="w-full h-full object-cover" autoPlay={true} />
                                              {bgm && (
                                                  <button 
                                                      onClick={(e) => { 
                                                          e.stopPropagation(); 
                                                          e.preventDefault();
                                                          if (bgm.title) {
                                                              const searchUrl = `https://music.youtube.com/search?q=${encodeURIComponent(bgm.title)}`;
                                                              window.open(searchUrl, '_blank');
                                                          }
                                                      }}
                                                      className="absolute z-30 px-3 py-1.5 bg-espresso-950/85 hover:bg-espresso-900/95 backdrop-blur-md text-amber-400 border border-amber-500/30 rounded-full shadow-lg active:scale-95 transition-all flex items-center gap-1.5 text-[11px] font-black tracking-wider bottom-4 right-4"
                                                  >
                                                      <Music size={13} />
                                                      {t('coffee_talk.bgm_pairing_btn', 'BGM 페어링')}
                                                  </button>
                                              )}
                                          </div>
                                      )
                                  })()}
                                  <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#1a1205] to-transparent pointer-events-none" />
                              </div>
                          )}

                          {/* Action Button Banner */}
                          {post.storeId && (
                              <div className="mt-4 flex -mx-4 -mb-4 bg-amber-900/40 border-t border-amber-500/20">
                                  <button onClick={() => {
                                      const tLat = post.cafeLat || post.store?.lat || 37.5665;
                                      const tLng = post.cafeLng || post.store?.lng || 126.9780;
                                      const tName = post.cafeName || post.store?.name || t('coffee_talk.lbl_shop_location', '매장 위치');
                                      handleOpenMap(post.store?.id || null, tLat, tLng, tName);
                                  }} className="flex-1 py-3 text-[13px] font-bold text-amber-400 hover:bg-amber-500/20 transition-colors flex items-center justify-center gap-2">
                                      <Store size={16} /> {t('coffee_talk.btn_shop_detail', '매장 상세정보 확인하기')}
                                  </button>
                              </div>
                          )}
                      </div>
                  </article>
              ) : (
                  <article id={`post-${post.id}`} className={`${activeFilter === 'shorts' ? 'snap-start snap-always h-full w-full mx-0 border-0 sm:border-x sm:border-espresso-800 rounded-none mb-0 flex flex-col pt-0 shrink-0 bg-black relative' : post.isPilgrimageLedger ? 'min-h-[500px] border-amber-500/20 shadow-2xl flex flex-col group rounded-none sm:rounded-3xl mx-0 border-y sm:border border-x-0 mb-0' : (post.isPinned ? 'bg-gradient-to-b from-[#251b0f] to-[#1a1205] border-amber-500/40 rounded-none sm:rounded-3xl mx-0 border-y sm:border border-x-0 mb-0' : 'bg-espresso-900 border-espresso-600 rounded-none sm:rounded-3xl mx-0 border-y sm:border border-x-0 mb-0')} overflow-hidden relative hover:border-amber-500/50 transition-colors`}>
              
              {/* --- MAGAZINE BACKGROUND FOR PILGRIMAGE --- */}
              {post.isPilgrimageLedger && post.image && (() => {
                  let urls = [post.image];
                  try { const parsed = JSON.parse(post.image); if (Array.isArray(parsed)) urls = parsed; } catch(e) {}
                  return (
                      <div 
                          className="absolute inset-0 z-0 overflow-hidden bg-[#0a0a0c] cursor-pointer"
                          onClick={(e) => { e.stopPropagation(); setActiveCarouselUrls(urls); }}
                      >
                          {urls.length > 0 && <MediaRenderer src={urls[0]} className={`w-full h-full transition-transform duration-700 group-hover:scale-105 outline-none object-cover`} autoPlay={true} />}
                          {bgm && (
                              <button 
                                  onClick={(e) => { 
                                      e.stopPropagation(); 
                                      e.preventDefault();
                                      if (bgm.title) {
                                          const searchUrl = `https://music.youtube.com/search?q=${encodeURIComponent(bgm.title)}`;
                                          window.open(searchUrl, '_blank');
                                      }
                                  }}
                                  className="absolute z-[25] px-3.5 py-2 bg-black/75 hover:bg-black/90 backdrop-blur-md text-amber-400 border border-amber-500/40 rounded-xl shadow-2xl active:scale-95 transition-all flex items-center gap-1.5 text-xs font-black tracking-widest top-[140px] right-5"
                              >
                                  <Music size={14} />
                                  {t('coffee_talk.bgm_pairing_btn', 'BGM 페어링')}
                              </button>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none"></div>
                          <div className="hidden">
                              <span className="font-serif text-[60px] sm:text-[75px] font-black tracking-[0.3em] text-white rotate-[-12deg] leading-[0.8] text-center drop-shadow-2xl grayscale ml-4">PILGRIMAGE<br/>CERTIFIED</span>
                          </div>
                      </div>
                  );
              })()}
              {/* Pinned Badge */}
              {post.isPinned && (
                  <div className="absolute top-0 right-0 px-4 py-1.5 bg-gradient-to-l from-amber-500/20 to-transparent flex items-center gap-1.5 border-b border-l border-amber-500/20 rounded-bl-xl z-20">
                      <Star size={12} className="text-amber-500 fill-amber-500" />
                      <span className="text-[11px] font-bold text-amber-500 pr-2 border-r border-amber-500/20">{t('coffee_talk.badge_notice', '공지')}</span>
                      <button 
                          onClick={(e) => {
                              e.stopPropagation();
                              const updated = [...hiddenAnnouncements, post.id];
                              setHiddenAnnouncements(updated);
                              localStorage.setItem('hiddenAnnouncements', JSON.stringify(updated));
                          }}
                          className="text-espresso-200 hover:text-espresso-50 transition-colors p-0.5"
                      >
                          <X size={12} />
                      </button>
                  </div>
              )}

              {/* Option C Magazine Neon Cyber Badge */}
              {post.isPilgrimageLedger && (
                  <div className="absolute top-[75px] right-5 z-[25] pointer-events-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                      <div className="border border-amber-500/50 bg-gradient-to-br from-black/80 to-espresso-950/80 backdrop-blur-md rounded-xl px-3 py-1.5 flex items-center gap-2.5">
                          <Crown size={14} className="text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]" />
                          <div className="flex flex-col">
                              <span className="text-amber-400 font-serif font-black text-[11px] tracking-[0.1em] uppercase leading-tight">
                                  HALL OF FAME
                              </span>
                              <span className="text-amber-200/80 font-sans font-bold text-[8px] tracking-widest leading-none">
                                  BEANDMIND PILGRIMAGE
                              </span>
                          </div>
                      </div>
                  </div>
              )}

              {/* Post Header */}
              <div className="relative z-30 flex items-center justify-between p-4 mix-blend-normal">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full overflow-hidden border border-espresso-600 relative bg-espresso-900 cursor-pointer shrink-0"
                    onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPublicUserId(post.author.id);
                    }}
                  >
                    <img 
                        src={post.author.avatar.startsWith('/') ? `${API_BASE}${post.author.avatar}` : post.author.avatar} 
                        alt="avatar" 
                        className="w-full h-full object-cover absolute inset-0 text-transparent" 
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&q=80'; }} 
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 
                          className="font-bold text-[14px] text-espresso-50 flex items-center gap-1 cursor-pointer hover:underline truncate"
                          onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPublicUserId(post.author.id);
                          }}
                        >
                          {post.author.name}
                          {post.author.name === '로스터리 아카이브' && <Star size={12} className="text-amber-400 fill-amber-400" />}
                        </h3>
                        {/* Reward Button and Earned Beans next to Nickname */}
                        {post.earnedBeans > 0 && (
                            <span className="text-[10px] bg-amber-50/10 text-amber-500 font-bold px-1.5 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1 shadow-sm shrink-0 whitespace-nowrap">
                                ☕ {post.earnedBeans}
                            </span>
                        )}
                        {currentUser && post.author.id !== currentUser.id && (
                            <>
                                <UserFollowBadge 
                                    targetUserId={post.author.id} 
                                    targetUserName={post.author.name} 
                                    currentUserId={currentUser.id} 
                                />
                                <button
                                    onClick={() => {
                                        setSelectedRewardTarget({ id: post.author.id, name: post.author.name, entityId: post.id });
                                        setShowRewardModal(true);
                                    }}
                                    className="text-[10px] font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded-full flex items-center gap-1 transition-colors border border-amber-500/30 shrink-0 whitespace-nowrap"
                                >
                                    <Gift size={10} />{t('coffee_talk.btn_reward', '후원')}
                                </button>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 overflow-x-auto no-scrollbar">
                      {post.author.badges.map((badge, i) => (
                        <span key={i} className="text-[10px] bg-espresso-800 text-amber-400 px-1.5 py-0.5 rounded border border-amber-900/30 whitespace-nowrap shrink-0">
                          {badge}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Options Menu */}
                <div className="flex items-center gap-2">
                  {currentUser && (
                    <div className="relative z-50">
                      <button 
                        onClick={() => setActivePostMenuId(activePostMenuId === post.id ? null : post.id)} 
                        className="p-2 text-espresso-300 hover:text-espresso-100 transition-colors"
                      >
                        <MoreVertical size={20} />
                      </button>
                      {activePostMenuId === post.id && (
                        <div className="absolute right-0 top-10 mt-1 w-36 bg-espresso-900 border border-espresso-700/80 rounded-2xl shadow-2xl py-2 z-50 overflow-hidden">
                          {post.author.id === currentUser?.id && (
                              <>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleEditPost(post); }} 
                                  className="w-full text-left px-4 py-2.5 text-[13px] font-medium text-espresso-100 hover:bg-espresso-800 flex items-center gap-2"
                                >
                                  <Edit2 size={14} />{t('coffee_talk.btn_edit', '수정하기')}</button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDeletePost(post.id); }} 
                                  className="w-full text-left px-4 py-2.5 text-[13px] font-medium text-red-500 hover:bg-espresso-800 flex items-center gap-2"
                                >
                                  <Trash2 size={14} />{t('coffee_talk.btn_delete', '삭제하기')}</button>
                              </>
                          )}
                          {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') && post.author.id !== currentUser?.id && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleAdminDeletePost(post.id); }} 
                                  className="w-full text-left px-4 py-2.5 text-[13px] font-bold text-red-500 hover:bg-red-950/30 flex items-center gap-2"
                                >
                                  <Trash2 size={14} />삭제 (관리자)</button>
                          )}
                          {post.author.id !== currentUser?.id && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); if(window.confirm(t('coffee_talk.confirm_report', '이 게시물을 신고하시겠습니까?'))) handleReportPost(post.id); }} 
                                  className="w-full text-left px-4 py-2.5 text-[13px] font-bold text-red-500 hover:bg-espresso-800 flex items-center gap-2"
                                >
                                  <span className="w-3 h-3 rounded-full bg-red-500 flex items-center justify-center text-[8px] text-white font-bold leading-none mr-1">!</span> {t('coffee_talk.btn_report', '신고하기')}</button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Post Media (Hidden in Pilgrimage because it's the background!) */}
              {post.image && !post.isPilgrimageLedger && (
                  <div className={`relative z-10 ${activeFilter === 'shorts' ? 'absolute inset-0 w-full h-full' : 'aspect-[5/3] sm:aspect-[15/8] md:aspect-[20/9] w-[calc(100%-1.5rem)] mx-auto'} bg-espresso-900 group shadow-inner ${activeFilter === 'shorts' ? '' : 'rounded-2xl'} transform-gpu`}>
                    {(() => {
                        let urls: string[] = [];
                        try {
                            if (typeof post.image === 'string') {
                                const parsed = JSON.parse(post.image);
                                if (Array.isArray(parsed)) {
                                    urls = parsed;
                                } else {
                                    urls = [post.image];
                                }
                            } else if (Array.isArray(post.image)) {
                                urls = post.image;
                            } else {
                                urls = [String(post.image)];
                            }
                        } catch(e) {
                            urls = [post.image];
                        }
                        
                        // Sanity check to prevent undefined or array objects from crashing MediaRenderer
                        if (!urls || urls.length === 0 || !urls[0]) return null;
                        const firstImageStr = typeof urls[0] === 'string' ? urls[0] : String(urls[0]);
                        
                        return (
                            <>
                                <MediaRenderer 
                                    src={firstImageStr} 
                                    className={`absolute inset-0 w-full h-full cursor-pointer object-cover transform-gpu backface-hidden ${activeFilter === 'shorts' ? 'bg-black' : 'rounded-2xl'}`} 
                                    autoPlay={true} 
                                    onClick={() => setActiveCarouselUrls(urls)} 
                                />
                                
                                {/* Geo-tag & Bean Tag Floating Card (Hidden in Shorts, moved to interactions block) */}
                                {activeFilter !== 'shorts' && (post.cafeName || post.taggedBean || post.shortsCategory || post.equipmentTag) && (
                                  <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-10">
                                    {/* Shorts Specific Tags */}
                                    {(post.shortsCategory || post.equipmentTag) && (
                                        <div className="flex flex-wrap items-center gap-1.5 z-20 pointer-events-auto">
                                            {post.shortsCategory && (
                                                <span className="bg-black/20 text-amber-400 font-bold text-[10px] px-2.5 py-1 rounded-sm border border-amber-500/30 flex items-center gap-1.5 drop-shadow-md">
                                                    {post.shortsCategory}
                                                </span>
                                            )}
                                            {post.equipmentTag && (
                                                <span className="bg-black/20 text-amber-50 font-medium text-[10px] px-2.5 py-1 rounded-sm border border-espresso-700/50 self-start flex items-center gap-1">
                                                    <Settings size={10} className="text-espresso-400" />
                                                    {post.equipmentTag}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {post.taggedBean && (
                                      <div className="bg-black/20 rounded-full px-3 py-1.5 flex items-center gap-2 border border-amber-500/20 self-start">
                                        <Coffee size={14} className="text-amber-400" />
                                        <span className="text-xs font-medium text-espresso-50 drop-shadow-md">{post.taggedBean}</span>
                                      </div>
                                    )}
                                     {post.cafeName && (
                                      <div className="bg-black/20 rounded-2xl p-2.5 flex items-center gap-3 border border-white/10 pointer-events-auto">
                                        <button 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                if (post.store) handleOpenMap(post.store.id, post.store.lat || 37.5665, post.store.lng || 126.9780, post.store.name);
                                                else handleMapClick(post); 
                                            }} 
                                            className="bg-amber-500/20 p-2 rounded-full hover:bg-amber-500/40 active:scale-95 transition-all focus:outline-none hover:shadow-[0_0_10px_rgba(245,158,11,0.3)] z-10"
                                        >
                                          <MapPin size={18} className="text-amber-400" />
                                        </button>
                                        <button 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                if (post.store) setDetailShopData(post.store);
                                                else handleMapClick(post);
                                            }}
                                            className="group flex flex-col items-start min-w-[70px] max-w-[150px] text-left focus:outline-none transition-opacity active:scale-95"
                                        >
                                          <p className="text-[13px] font-bold text-espresso-50 leading-tight w-full truncate group-hover:text-amber-400 transition-colors drop-shadow-md">{post.cafeName}</p>
                                          <p className="text-[10px] font-medium text-amber-500/80 mt-0.5 w-full truncate">{t('coffee_talk.btn_view_shop_detail', '매장 상세보기')}</p>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* BGM Pairing Button */}
                                {bgm && (
                                    <button 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            e.preventDefault();
                                            if (bgm.title) {
                                                const searchUrl = `https://music.youtube.com/search?q=${encodeURIComponent(bgm.title)}`;
                                                window.open(searchUrl, '_blank');
                                            }
                                        }}
                                        className={`absolute z-30 px-3 py-1.5 bg-espresso-950/85 hover:bg-espresso-900/95 backdrop-blur-md text-amber-400 border border-amber-500/30 rounded-full shadow-lg active:scale-95 transition-all flex items-center gap-1.5 text-[11px] font-black tracking-wider ${
                                            activeFilter === 'shorts' ? 'bottom-[280px] right-4' : (urls.length > 1 ? 'bottom-4 right-[96px]' : 'bottom-4 right-4')
                                        }`}
                                    >
                                        <Music size={13} />
                                        {t('coffee_talk.bgm_pairing_btn', 'BGM 페어링')}
                                    </button>
                                )}

                                {/* +N More Button */}
                                {urls.length > 1 && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setActiveCarouselUrls(urls); }}
                                        className="absolute bottom-4 right-4 bg-espresso-950/60 backdrop-blur-md text-espresso-50 font-bold text-sm px-3 py-1.5 rounded-full border border-white/20 shadow-lg hover:bg-espresso-950/80 transition-colors z-10 flex items-center gap-1.5"
                                    >
                                        <div className="flex -space-x-1.5 opacity-80">
                                            <div className="w-4 h-4 rounded-full bg-zinc-400 border border-espresso-700" />
                                            <div className="w-4 h-4 rounded-full bg-zinc-600 border border-espresso-700" />
                                        </div>
                                        +{urls.length - 1}
                                    </button>
                                )}
                            </>
                        );
                    })()}
                  </div>
              )}

              {/* Interactions & Content */}
              <div className={activeFilter === 'shorts' ? "absolute bottom-0 left-0 right-0 z-[50] pl-4 pr-[80px] pt-32 landscape:pt-4 pb-[110px] landscape:pb-4 flex flex-col justify-end pointer-events-none bg-gradient-to-t from-black/80 via-black/20 to-transparent" : "relative z-20 p-4 pt-3 flex flex-col justify-end mt-auto"}>
                {/* Shorts / Pilgrimage Meta Tags Area */}
                {(post.isPilgrimageLedger || activeFilter === 'shorts') && (post.cafeName || post.taggedBean || post.shortsCategory || post.equipmentTag) && (
                  <div className={`flex flex-col gap-2 mb-3 ${post.isPilgrimageLedger ? 'pb-2 w-full border-b border-white/5' : ''}`}>
                    {/* Shorts Metadata */}
                    {activeFilter === 'shorts' && (post.shortsCategory || post.equipmentTag) && (
                        <div className="flex flex-wrap items-center gap-1.5 z-20 pointer-events-auto">
                            {post.shortsCategory && (
                                <span className="bg-black/20 text-amber-400 font-bold text-[10px] px-2.5 py-1 rounded-sm border border-amber-500/30 flex items-center gap-1.5 drop-shadow-md">
                                    {post.shortsCategory}
                                </span>
                            )}
                            {post.equipmentTag && (
                                <span className="bg-black/20 text-amber-50 font-medium text-[10px] px-2.5 py-1 rounded-sm border border-espresso-700/50 self-start flex items-center gap-1">
                                    <Settings size={10} className="text-espresso-400" />
                                    {post.equipmentTag}
                                </span>
                            )}
                        </div>
                    )}
                    
                    {/* General Metadata */}
                    {post.taggedBean && (
                      <div className="bg-black/20 rounded-full px-3 py-1.5 flex items-center gap-2 border border-amber-500/20 self-start pointer-events-auto">
                        <Coffee size={14} className="text-amber-400" />
                        <span className="text-xs font-medium text-espresso-50 drop-shadow-md">{post.taggedBean}</span>
                      </div>
                    )}
                     {post.cafeName && (
                      <div className="bg-black/20 rounded-2xl p-2.5 flex items-center gap-3 border border-white/10 pointer-events-auto self-start">
                        <button 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                if (post.store) handleOpenMap(post.store.id, post.store.lat || 37.5665, post.store.lng || 126.9780, post.store.name);
                                else handleMapClick(post); 
                            }} 
                            className="bg-amber-500/20 p-2 rounded-full hover:bg-amber-500/40 active:scale-95 transition-all focus:outline-none hover:shadow-[0_0_10px_rgba(245,158,11,0.3)] z-10"
                        >
                          <MapPin size={18} className="text-amber-400" />
                        </button>
                        <button 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                if (post.store) setDetailShopData(post.store);
                                else handleMapClick(post);
                            }}
                            className="group flex flex-col items-start min-w-[70px] max-w-[150px] text-left focus:outline-none transition-opacity active:scale-95"
                        >
                          <p className="text-[13px] font-bold text-espresso-50 leading-tight w-full truncate group-hover:text-amber-400 transition-colors drop-shadow-md">{post.cafeName}</p>
                          <p className="text-[10px] font-medium text-amber-500/80 mt-0.5 w-full truncate">{t('coffee_talk.btn_view_shop_detail', '매장 상세보기')}</p>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className={`flex items-center justify-between mb-3 ${activeFilter === 'shorts' ? 'pointer-events-auto' : ''}`}>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleLike(post.id, post.likes);
                      }}
                      className="flex items-center gap-1.5 group transition-colors"
                    >
                      <Heart 
                        size={24} 
                        className={`transition-all duration-300 ${isLiked[post.id] ? 'fill-rose-500 text-rose-500 scale-110 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'text-espresso-200 group-hover:text-rose-400'}`} 
                      />
                      <span className={`text-[13px] font-medium ${isLiked[post.id] ? 'text-rose-500' : 'text-espresso-200'}`}>
                        {post.likes}
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

                    {(post.recipeData || post.tastingNote) && activeFilter === 'shorts' && (
                        <button onClick={() => setActiveRecipeNotePost(post)} className="flex items-center gap-1.5 pl-3 border-l border-espresso-700 ml-1 text-espresso-200 hover:text-amber-500 transition-colors group pointer-events-auto">
                           <div className="relative">
                               <div className="absolute inset-0 bg-emerald-400/20 blur-md rounded-full animate-pulse group-hover:bg-emerald-400/40"></div>
                               <ListChecks size={20} className="text-emerald-400 relative z-10 -mt-0.5" />
                           </div>
                           <span className="text-[13px] font-medium text-emerald-400">레시피</span>
                        </button>
                    )}

                    {post.commentImages && post.commentImages.length > 0 && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); setGalleryPostId(post.id); }}
                            className="flex items-center gap-1.5 pl-3 border-l border-espresso-700 ml-1 text-espresso-200 hover:text-amber-500 transition-colors"
                        >
                            <ImageIcon size={18} className="opacity-80" />
                            <div className="flex -space-x-2 opacity-90">
                                {post.commentImages.map((c: any, i: number) => {
                                    if (i > 3) return null;
                                    let url = '';
                                    try {
                                        const parsed = JSON.parse(c.imageUrl);
                                        url = Array.isArray(parsed) ? parsed[0] : c.imageUrl;
                                    } catch(e) {
                                        url = c.imageUrl;
                                    }
                                    return (
                                        <div key={i} className="w-5 h-5 rounded-full border-2 border-[#18181b] bg-espresso-800 overflow-hidden ring-1 ring-zinc-800 relative shadow-sm">
                                           <MediaRenderer src={url} className="w-full h-full object-cover" />
                                        </div>
                                    );
                                })}
                            </div>
                        </button>
                    )}
                  </div>
                  <button 
                      onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setCollectionPostId(post.id);
                      }} 
                      className={`transition-colors ${isBookmarked[post.id] ? 'text-amber-400' : 'text-espresso-200 hover:text-amber-400'}`}
                  >
                    <Bookmark size={22} className={isBookmarked[post.id] ? 'fill-amber-400' : ''} />
                  </button>
                  
                  {bgm && !post.image && (
                      <button 
                          onClick={(e) => { 
                              e.stopPropagation(); 
                              e.preventDefault();
                              if (bgm.title) {
                                  const searchUrl = `https://music.youtube.com/search?q=${encodeURIComponent(bgm.title)}`;
                                  window.open(searchUrl, '_blank');
                              }
                          }}
                          className="ml-3 px-3 py-1.5 rounded-full bg-espresso-800 text-[11px] font-black border border-amber-500/20 hover:border-amber-500/50 text-amber-500/90 transition-all flex items-center gap-1.5"
                      >
                          <Music size={12} />
                          {t('coffee_talk.bgm_pairing_btn', 'BGM 페어링')}
                      </button>
                  )}
                </div>

                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (post.content && post.content.length > 80) {
                      setExpandedPosts(prev => {
                        const next = new Set(prev);
                        if (next.has(post.id)) next.delete(post.id);
                        else next.add(post.id);
                        return next;
                      });
                    }
                  }}
                  className={`${activeFilter === 'shorts' ? 'pointer-events-auto' : ''} ${post.content && post.content.length > 80 && !expandedPosts.has(post.id) ? "cursor-pointer active:opacity-70 transition-opacity" : ""}`}
                >
                  <p className={`text-[14px] leading-[1.6] text-espresso-50 whitespace-pre-wrap break-words ${!expandedPosts.has(post.id) ? 'line-clamp-3 landscape:line-clamp-1' : ''}`}>
                    {renderWithLinks(cleanContent)}
                  </p>
                  {!expandedPosts.has(post.id) && cleanContent && cleanContent.length > 80 && (
                    <div className="text-espresso-300 text-[13px] mt-1 font-medium">{t('coffee_talk.btn_more', '... 더보기')}</div>
                  )}
                </div>

                {/* Shop Tag Thumbnail Card (Only shown if NO post image exists to host the floating tag) */}
                {post.store && !post.image && (
                    <div className="mt-4 bg-espresso-900 border border-espresso-700 rounded-[20px] overflow-hidden flex shadow-sm w-full transition-colors hover:border-amber-500/30 relative">
                         <button 
                             onClick={(e) => {
                                 e.stopPropagation();
                                 if (post.store) handleOpenMap(post.store.id, post.store.lat || 37.5665, post.store.lng || 126.9780, post.store.name);
                             }}
                             className="w-24 h-24 shrink-0 bg-espresso-800 relative focus:outline-none group z-10"
                         >
                             <img src={post.store.mainImageUrl || 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=400&q=80'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                             <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
                             <div className="absolute bottom-2 left-2 flex items-center justify-center p-1 bg-amber-500/20 rounded-full border border-amber-500/30 group-hover:bg-amber-500/40 transition-colors tooltip tooltip-right" data-tip="위치 확인하기">
                                 <MapPin size={14} className="text-amber-400 drop-shadow-md" />
                             </div>
                         </button>
                         <button 
                             onClick={(e) => {
                                 e.stopPropagation();
                                 setDetailShopData(post.store);
                             }}
                             className="p-3.5 flex flex-col justify-center flex-1 min-w-0 text-left hover:bg-espresso-800/30 transition-colors focus:outline-none focus:bg-espresso-800/30 active:bg-espresso-800/50"
                         >
                             {post.store.primaryCoffeeType && (
                                 <span className="text-[10px] font-bold text-amber-500/90 mb-1 uppercase tracking-wider">{post.store.primaryCoffeeType.replace('_', ' ')}</span>
                             )}
                             <h4 className="text-[15px] font-bold text-espresso-50 leading-tight truncate w-full">{post.store.name}</h4>
                             <p className="text-[12px] text-amber-500/80 mt-1 truncate font-medium w-full">{t('coffee_talk.btn_view_shop_detail', '매장 상세보기')}</p>
                         </button>
                         <div className="flex items-center justify-center pr-4 text-espresso-300 pointer-events-none absolute right-0 top-1/2 -translate-y-1/2">
                             <ChevronRight size={20} />
                         </div>
                    </div>
                )}

                {/* Poll Widget */}
                {post.poll && (
                    <div className="mt-4 bg-espresso-950 border border-indigo-500/20 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-l-2xl"></div>
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-[12px] font-bold text-espresso-50 flex items-center gap-1.5"><BarChart2 size={16} className="text-indigo-400"/> {post.poll.question}</p>
                        </div>
                        <div className="space-y-2">
                            {(() => {
                                const totalVotes = post.poll.options.reduce((sum: number, o: any) => sum + o._count.votes, 0);
                                const userVotedOptionId = post.poll.options.find((o: any) => o.votes?.some((v: any) => v.userId === currentUserId))?.id;
                                const isExpired = post.poll.expiresAt ? new Date() > new Date(post.poll.expiresAt) : false;

                                // Find max votes to highlight winner if expired
                                const maxVotes = isExpired && totalVotes > 0 ? Math.max(...post.poll.options.map((o: any) => o._count.votes)) : -1;

                                return post.poll.options.map((opt: any) => {
                                    const isVoted = opt.id === userVotedOptionId;
                                    const percent = totalVotes > 0 ? Math.round((opt._count.votes / totalVotes) * 100) : 0;
                                    const isWinner = isExpired && opt._count.votes === maxVotes && maxVotes > 0;
                                    const showResults = isExpired || userVotedOptionId;

                                    return (
                                        <button 
                                            key={opt.id}
                                            disabled={isExpired}
                                            onClick={(e) => { e.stopPropagation(); if(!isExpired) handleVote(post.id, opt.id); }}
                                            className={`w-full relative overflow-hidden rounded-xl border flex items-center justify-between px-3 py-2.5 transition-all text-left group 
                                                ${isExpired ? 'cursor-default' : ''}
                                                ${isWinner ? 'border-amber-500 bg-amber-500/10' : (isVoted && !isExpired ? 'border-indigo-500 bg-indigo-500/10' : 'border-espresso-700 bg-espresso-900')}
                                                ${!isExpired && !isVoted && !isWinner ? 'hover:border-espresso-600' : ''}`}
                                        >
                                            {/* Fill bar */}
                                            {showResults && (
                                                <div 
                                                    className={`absolute top-0 left-0 h-full transition-all duration-500 opacity-20 ${isWinner ? 'bg-amber-500' : (isVoted ? 'bg-indigo-500' : 'bg-zinc-500')}`} 
                                                    style={{ width: `${percent}%` }} 
                                                />
                                            )}
                                            <span className={`relative z-10 text-[13px] font-medium flex items-center gap-2 
                                                ${isWinner ? 'text-amber-400 font-bold' : (isVoted ? 'text-indigo-300 font-bold' : 'text-espresso-100 group-hover:text-espresso-50')}`}>
                                                {opt.text}
                                                {isWinner && <Crown size={14} />}
                                            </span>
                                            {showResults && (
                                                <div className="relative z-10 flex items-center gap-2">
                                                    <span className={`text-[11px] ${isWinner ? 'text-amber-400 font-bold' : (isVoted ? 'text-indigo-400 font-bold' : 'text-espresso-300')}`}>{percent}%</span>
                                                </div>
                                            )}
                                        </button>
                                    );
                                });
                            })()}
                        </div>
                        {(() => {
                            const totalVotes = post.poll.options.reduce((sum: number, o: any) => sum + o._count.votes, 0);
                            const isExpired = post.poll.expiresAt ? new Date() > new Date(post.poll.expiresAt) : false;
                            return (
                                <p className="text-[10px] text-espresso-300 text-right mt-3 font-medium">
                                    {isExpired ? t('coffee_talk.poll_closed', '종료된 투표 · ') : ''}{t('coffee_talk.poll_total_votes', '총 {{count}}명 참여', {count: totalVotes})}
                                </p>
                            );
                        })()}
                    </div>
                )}

                {/* Prescription Ticket Mini-Widget */}
                {post.recipeData && post.recipeData.type === 'prescription' && (
                  <div 
                      className="mt-4 -mx-2 sm:-mx-6 mb-2 cursor-pointer active:scale-[0.98] transition-transform" 
                      onClick={(e) => { e.stopPropagation(); setSelectedPrescription(post.recipeData); }}
                  >
                    <div className="transform scale-[0.85] sm:scale-95 origin-top relative h-[380px] overflow-hidden rounded-[2rem]">
                      <PrescriptionTicket
                          recommendation={{
                              bean: COFFEE_BEANS.find(b => b.name === post.recipeData.beanName) || { name: post.recipeData.beanName, roast: 'Blend/Single', region: 'Global' } as any,
                              brand: BRANDS.find(b => b.name === post.recipeData.brand) || { name: post.recipeData.brand } as any
                          }}
                          aiExplanation={post.recipeData.aiComment || ''}
                          isLoggedIn={true}
                          hideSave={true}
                          rating={post.recipeData.rating || undefined}
                          date={new Date(post.recipeData.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      />
                      {/* Dark mode overlay fade to mix with coffee talk's dark background smoothly */}
                      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#121214] to-transparent z-[60] pointer-events-none" />
                    </div>
                  </div>
                )}

                {/* Attached Course Mini-Widget */}
                {(post as any).attachedCourse && (
                    <div 
                        onClick={(e) => { e.stopPropagation(); navigate(`/map?courseId=${(post as any).attachedCourse.id}`); }}
                        className="mt-4 bg-espresso-900 border border-amber-500/30 hover:border-amber-500/80 rounded-2xl p-4 shadow-sm relative overflow-hidden cursor-pointer group active:scale-[0.98] transition-all"
                    >
                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 rounded-l-2xl shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
                        <div className="flex justify-between items-center relative z-10 w-full min-w-0">
                            <div className="flex flex-col flex-1 min-w-0 pr-4">
                                <p className="text-[11px] font-bold text-amber-500 mb-1.5 uppercase tracking-wide flex items-center gap-1.5 whitespace-nowrap"><Map size={14} className="opacity-80"/> Pilgrimage Course</p>
                                <h4 className="text-[15px] font-black text-espresso-50 leading-tight truncate">{(post as any).attachedCourse.name}</h4>
                                <p className="text-[11px] text-espresso-200 mt-1 flex items-center gap-1 truncate">
                                   총 <span className="font-bold text-amber-500">{(post as any).attachedCourse._count?.items || 0}</span>개의 성지가 등록된 루트
                                </p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 group-hover:scale-110 transition-all border border-amber-500/20">
                                <ChevronRight className="text-amber-500" size={20} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Recipe Mini-Widget */}
                {post.recipeData && post.recipeData.type !== 'prescription' && activeFilter !== 'shorts' && (
                  <div className="mt-4 bg-espresso-950 border border-espresso-700 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 rounded-l-2xl"></div>
                    <p className="text-[11px] font-bold text-emerald-500 mb-4 uppercase tracking-wide flex items-center gap-1.5"><Coffee size={14} className="opacity-80"/> Brewing Recipe</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-2 relative z-10">
                      {[
                        { icon: <Scale size={13} />, label: t('coffee_talk.recipe_dose', '원두량'), value: post.recipeData.dose },
                        { icon: <Droplets size={13} />, label: t('coffee_talk.recipe_yield', '추출량'), value: post.recipeData.yield },
                        { icon: <Thermometer size={13} />, label: t('coffee_talk.recipe_temp', '물 온도'), value: post.recipeData.temp },
                        { icon: <Timer size={13} />, label: t('coffee_talk.recipe_time', '추출 시간'), value: post.recipeData.time },
                        { icon: <Settings size={13} />, label: t('coffee_talk.recipe_grinder', '그라인더'), value: post.recipeData.grinder },
                        { icon: <Coffee size={13} />, label: t('coffee_talk.recipe_method', '추출 도구'), value: post.recipeData.method },
                      ].filter(item => item.value).map((item, idx) => (
                        <div key={idx} className="flex flex-col">
                          <span className="text-[11px] font-bold text-espresso-200 flex items-center gap-1.5 mb-1">{item.icon} {item.label}</span>
                          <span className="text-[14px] font-bold text-espresso-50 truncate pl-5">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tasting Note Mini-Widget */}
                {post.tastingNote && activeFilter !== 'shorts' && (
                  <div className="relative z-10 mt-3 bg-espresso-800/40 rounded-2xl px-4 py-3 border border-espresso-600/50">
                    <p className="text-[11px] font-bold text-amber-500 mb-2 uppercase tracking-wide">Taster's Note</p>
                    <div className="space-y-1.5">
                      {[
                        { label: t('coffee_talk.taste_acidity', '산미 (Acidity)'), val: post.tastingNote.acidity },
                        { label: t('coffee_talk.taste_sweetness', '단맛 (Sweetness)'), val: post.tastingNote.sweetness },
                        { label: t('coffee_talk.taste_bitterness', '쓴맛 (Bitterness)'), val: post.tastingNote.bitterness },
                        { label: t('coffee_talk.taste_aroma', '향/아로마 (Aroma)'), val: post.tastingNote.aroma },
                        { label: t('coffee_talk.taste_body', '바디감 (Body)'), val: post.tastingNote.body }
                      ].filter(item => typeof item.val === 'number' && item.val > 0).map(item => (
                        <div key={item.label} className="flex items-center gap-3 text-[11px]">
                          <span className="w-28 text-espresso-200 font-medium">{item.label}</span>
                          <div className="flex-1 h-1 bg-espresso-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-amber-500 rounded-full" 
                              style={{ width: `${(item.val / 5) * 100}%` }}
                            />
                          </div>
                          <span className="w-7 text-right font-mono text-espresso-100">{item.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <p className="text-[11px] font-medium text-espresso-300 mt-3">{post.timeAgo}</p>
              </div>
            </article>
            )}
            </React.Fragment>
          );
          })}
        </div>
      </PullToRefresh>

      {/* Write Post Speed Dial FAB */}
      <div className="fixed bottom-[90px] inset-x-0 mx-auto w-full max-w-md md:max-w-2xl z-50 flex flex-col items-end gap-3 px-4 pointer-events-none">
          {isFabOpen && (
              <>
                  <div 
                      className="fixed inset-0 z-40 bg-espresso-950/20 backdrop-blur-sm pointer-events-auto" 
                      onClick={() => setIsFabOpen(false)} 
                  />
                  <div className="z-50 flex flex-col items-end gap-3 mb-2 animate-in slide-in-from-bottom-5 fade-in duration-200 pointer-events-auto">
                      {currentUser?.role === 'OWNER' && (
                          <button 
                              onClick={() => {
                                  const token = localStorage.getItem('token');
                                  if (!token) {
                                      if (window.confirm(t('coffee_talk.alert_login_write', '로그인이 필요한 서비스입니다. 로그인 화면으로 이동하시겠습니까?'))) navigate('/profile');
                                      return;
                                  }
                                  setComposeMode('NOTICE');
                                  setIsRecipeMode(false);
                                  setIsAnnouncement(true);
                                  setIsWriteModalOpen(true);
                                  setIsFabOpen(false);
                              }}
                              className="flex items-center gap-3 group"
                          >
                              <span className="bg-espresso-800 text-amber-500 text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg border border-amber-500/50 pointer-events-none group-hover:scale-105 transition-transform">{t('coffee_talk.btn_write_notice', '📢 매장 공식 공지 (Notice)')}</span>
                              <div className="w-12 h-12 bg-amber-500 text-espresso-950 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.5)] border border-amber-400 group-hover:bg-amber-400 transition-colors">
                                  <Store size={20} />
                              </div>
                          </button>
                      )}
                      <button 
                          onClick={() => {
                              const token = localStorage.getItem('token');
                              if (!token) {
                                  if (window.confirm(t('coffee_talk.alert_login_write', '로그인이 필요한 서비스입니다. 로그인 화면으로 이동하시겠습니까?'))) navigate('/profile');
                                  return;
                              }
                              setComposeMode('SHORTS');
                              setIsAnnouncement(false);
                              setIsRecipeMode(false);
                              setIsWriteModalOpen(true);
                              setIsFabOpen(false);
                          }}
                          className="flex items-center gap-3 group"
                      >
                          <span className="bg-espresso-800 text-espresso-50 text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg border border-espresso-600 pointer-events-none group-hover:scale-105 transition-transform">{t('coffee_talk.btn_write_shorts', '🎥 커피 숏폼 / ASMR')}</span>
                          <div className="w-12 h-12 bg-espresso-800 text-rose-500 rounded-full flex items-center justify-center shadow-lg border border-espresso-600/50 hover:bg-espresso-700 transition-colors">
                              <Play size={20} className="ml-0.5" />
                          </div>
                      </button>
                      <button 
                          onClick={() => {
                              const token = localStorage.getItem('token');
                              if (!token) {
                                  if (window.confirm(t('coffee_talk.alert_login_write', '로그인이 필요한 서비스입니다. 로그인 화면으로 이동하시겠습니까?'))) navigate('/profile');
                                  return;
                              }
                              setComposeMode('TASTING');
                              setIsAnnouncement(false);
                              setIsRecipeMode(true);
                              setIsWriteModalOpen(true);
                              setIsFabOpen(false);
                          }}
                          className="flex items-center gap-3 group"
                      >
                          <span className="bg-espresso-800 text-espresso-50 text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg border border-espresso-600 pointer-events-none group-hover:scale-105 transition-transform">{t('coffee_talk.btn_write_tasting', '☕ 전문 테이스팅 노트')}</span>
                          <div className="w-12 h-12 bg-espresso-800 text-amber-500 rounded-full flex items-center justify-center shadow-lg border border-espresso-600/50 hover:bg-espresso-700 transition-colors">
                              <Coffee size={20} />
                          </div>
                      </button>
                      <button 
                          onClick={() => {
                              const token = localStorage.getItem('token');
                              if (!token) {
                                  if (window.confirm(t('coffee_talk.alert_login_write', '로그인이 필요한 서비스입니다. 로그인 화면으로 이동하시겠습니까?'))) navigate('/profile');
                                  return;
                              }
                              setComposeMode('GENERAL');
                              setIsAnnouncement(false);
                              setIsRecipeMode(false);
                              setIsWriteModalOpen(true);
                              setIsFabOpen(false);
                          }}
                          className="flex items-center gap-3 group"
                      >
                          <span className="bg-espresso-800 text-espresso-50 text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg border border-espresso-600 pointer-events-none group-hover:scale-105 transition-transform">{t('coffee_talk.btn_write_general', '📝 일반 사진/리뷰')}</span>
                          <div className="w-12 h-12 bg-espresso-800 text-espresso-100 rounded-full flex items-center justify-center shadow-lg border border-espresso-600/50 hover:bg-espresso-700 transition-colors">
                              <Camera size={20} />
                          </div>
                      </button>
                  </div>
              </>
          )}
          <button 
            onClick={() => setIsFabOpen(!isFabOpen)}
            className={`pointer-events-auto w-14 h-14 bg-gradient-to-tr from-amber-600 to-amber-400 text-espresso-50 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:scale-105 active:scale-95 transition-all z-50 ${isFabOpen ? 'rotate-45' : ''}`}>
            {isFabOpen ? <Plus size={28} /> : <Plus size={28} className="text-espresso-950" />}
          </button>
      </div>

      {/* Write Post Modal */}
      {isWriteModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-espresso-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`w-full max-w-lg sm:rounded-3xl rounded-t-3xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10 overflow-hidden border ${isPilgrimageLedgerCompose ? 'bg-[#0f0a05] border-amber-500/40 shadow-[0_-20px_40px_rgba(245,158,11,0.15)]' : 'bg-espresso-950 border-espresso-700 shadow-[0_-20px_40px_rgba(0,0,0,0.5)]'}`}>
                <div className={`flex items-center justify-between p-4 border-b ${isPilgrimageLedgerCompose ? 'border-amber-900/50 bg-[#1c1305]' : 'border-espresso-700'}`}>
                    <button onClick={() => { setIsWriteModalOpen(false); setEditPostId(null); setNewContent(''); setSelectedBgmTheme(''); setCustomBgmTitle(''); setIsCustomBgmInputActive(false); setNewImages([]); setNewImagePreviews([]); setExistingImages([]); setTaggedShop(null); setTaggedBean(''); setShortsCategory(''); setEquipmentTag(''); setIsRecipeMode(false); setRecipeData({dose:'',yield:'',temp:'',time:'',grinder:'',method:''}); setTastingNote({acidity:0,sweetness:0,body:0,bitterness:0,aroma:0}); setIsAnnouncement(false); setComposeMode('GENERAL'); setAttachedCourseId(null); setIsCourseSelectorOpen(false); }} className="font-medium text-[15px] text-espresso-200 hover:text-white p-2 transition-colors">{t('coffee_talk.btn_cancel', '취소')}</button>
                    <h2 className={`text-lg font-black tracking-tight flex items-center gap-1.5 ${isPilgrimageLedgerCompose ? 'text-amber-500 font-serif' : ''}`}>
                        {isPilgrimageLedgerCompose && <Crown size={18} className="text-amber-500 mb-0.5" />}
                        {editPostId ? t('coffee_talk.title_edit_post', '게시물 수정') : (isPilgrimageLedgerCompose ? t('coffee_talk.title_pilgrimage_compose', '성지순례 방명록 남기기') : t('coffee_talk.title_new_post', '새 글 작성'))}
                    </h2>
                    <button 
                        onClick={handleSubmitPost}
                        disabled={isSubmitting || !newContent}
                        className={`font-bold text-[15px] disabled:opacity-50 disabled:text-espresso-400 p-2 border rounded-xl px-4 transition-all ${isPilgrimageLedgerCompose ? 'text-[#0f0a05] bg-amber-500 border-amber-400 hover:bg-amber-400 disabled:bg-amber-900/50 disabled:border-transparent' : 'text-blue-500 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20'}`}
                    >
                        {isSubmitting ? t('coffee_talk.btn_uploading', '업로드중...') : (editPostId ? t('coffee_talk.btn_complete', '완료') : t('coffee_talk.btn_submit', '등록하기'))}
                    </button>
                </div>

                {isPilgrimageLedgerCompose && (
                    <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/5 to-transparent border-b border-amber-500/20 p-3 px-5 flex items-center gap-3 shrink-0">
                        <div className="bg-amber-500 text-[#0f0a05] rounded-full p-1.5 shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                            <Star size={14} className="fill-[#0f0a05]" />
                        </div>
                        <p className="text-[12px] font-bold text-amber-500/90 leading-tight">{t('coffee_talk.desc_pilgrimage_compose_1', '이 매장의 명예의 전당 장부에 영구적으로 기록됩니다.')}<br/>{t('coffee_talk.desc_pilgrimage_compose_2', '멋진 사진과 어울리는 리뷰를 남겨주세요!')}</p>
                    </div>
                )}
                
                <div className="overflow-y-auto p-4 pb-32 space-y-4">
                    {/* Media Upload */}
                    <div className="w-full border-2 border-dashed border-espresso-600 rounded-2xl p-4 hover:border-amber-500/50 transition-all flex flex-col gap-4 relative">
                        {(newImagePreviews.length > 0 || existingImages.length > 0) ? (
                            <div className="flex gap-3 overflow-x-auto pb-2 snap-x px-2">
                                {existingImages.map((src, i) => (
                                    <div key={`existing-${i}`} className="relative w-24 h-24 sm:w-32 sm:h-32 shrink-0 rounded-xl overflow-hidden snap-start border border-espresso-600">
                                        <MediaRenderer src={src} className="w-full h-full object-cover" autoPlay={false} />
                                        <button onClick={() => removeImage(i, true)} className="absolute top-1 right-1 bg-espresso-950/70 p-1 rounded-full text-espresso-50 hover:bg-red-500 transition-colors">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                                {newImagePreviews.map((src, i) => (
                                    <div key={`new-${i}`} className="relative w-24 h-24 sm:w-32 sm:h-32 shrink-0 rounded-xl overflow-hidden snap-start border border-espresso-600">
                                        <MediaRenderer src={src} className="w-full h-full object-cover" autoPlay={false} forceVideo={newImages[i]?.type.startsWith('video/')} />
                                        <button onClick={() => removeImage(i, false)} className="absolute top-1 right-1 bg-espresso-950/70 p-1 rounded-full text-espresso-50 hover:bg-red-500 transition-colors">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                                {(existingImages.length + newImages.length) < (composeMode === 'SHORTS' ? 1 : 10) && (
                                    <label className="w-24 h-24 sm:w-32 sm:h-32 shrink-0 rounded-xl border-2 border-dashed border-espresso-600 flex flex-col items-center justify-center cursor-pointer hover:border-amber-500 hover:text-amber-500 text-espresso-300 transition-colors snap-start bg-espresso-900/50">
                                        <Camera size={24} className="mb-1" />
                                        <span className="text-[10px] font-bold">{composeMode === 'SHORTS' ? t('coffee_talk.lbl_add_video', '영상 추가') : t('coffee_talk.lbl_add_media', '사진/영상 추가')}</span>
                                        <input type="file" accept={composeMode === 'SHORTS' ? "video/*" : "image/*,video/*"} multiple={composeMode !== 'SHORTS'} className="hidden" onChange={handleImageChange} />
                                    </label>
                                )}
                            </div>
                        ) : (
                            <label className={`flex flex-col items-center justify-center min-h-[140px] cursor-pointer group ${composeMode === 'SHORTS' ? 'bg-black/40 border border-white/10 rounded-xl p-4' : ''}`}>
                                <Camera size={32} className="text-espresso-300 mb-2 group-hover:text-amber-500 transition-colors" />
                                <span className="text-sm font-medium text-espresso-300 group-hover:text-amber-500 transition-colors">{composeMode === 'SHORTS' ? t('coffee_talk.desc_add_video', '로스팅, 추출 등 몰입감 있는 숏폼 비디오 한 개를 업로드하세요.') : t('coffee_talk.desc_add_media', '사진이나 동영상을 업로드하세요 (최대 10개)')}</span>
                                <input type="file" accept={composeMode === 'SHORTS' ? "video/*" : "image/*,video/*"} multiple={composeMode !== 'SHORTS'} className="hidden" onChange={handleImageChange} />
                            </label>
                        )}
                    </div>

                    {/* Content Input */}
                    <div className="relative">
                        <textarea 
                            value={newContent}
                            onPaste={(e) => e.stopPropagation()}
                            onChange={(e) => setNewContent(e.target.value)}
                            maxLength={composeMode === 'SHORTS' ? 1000 : undefined}
                            placeholder={composeMode === 'SHORTS' ? t('coffee_talk.ph_content_shorts', '영상을 설명하는 캡션을 1000자 이내로 입력하세요.') : t('coffee_talk.ph_content', '이 커피, 어떤 점이 특별했나요?')}
                            className={`w-full bg-espresso-900 border border-espresso-700 rounded-2xl p-4 pb-12 text-espresso-50 placeholder:text-espresso-300 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none ${composeMode === 'SHORTS' ? 'min-h-[160px]' : 'min-h-[240px]'}`}
                        />
                        {composeMode === 'SHORTS' && (
                            <p className="text-[10px] absolute right-4 top-2 text-espresso-400">{newContent.length} / 1000</p>
                        )}
                        <div className="absolute bottom-3 right-3 z-10 flex">
                            <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); setShowEmojiPicker(!showEmojiPicker); }}
                                className="p-2 text-espresso-300 hover:text-amber-500 transition-colors bg-espresso-950 border border-espresso-700 shadow-sm rounded-full"
                            >
                                <Smile size={20} />
                            </button>
                            {showEmojiPicker && (
                                <div className="absolute top-12 right-0 z-[100]">
                                    <div className="fixed inset-0 z-[90]" onClick={() => setShowEmojiPicker(false)} />
                                    <div className="relative z-[100] shadow-2xl rounded-2xl overflow-hidden border border-espresso-600">
                                        <EmojiPicker 
                                            onEmojiClick={(emojiData) => {
                                                setNewContent(prev => prev + emojiData.emoji);
                                            }}
                                            theme={Theme.DARK}
                                            emojiStyle={EmojiStyle.NATIVE}
                                            lazyLoadEmojis={true}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tagging / Tasting Note Controls */}
                    <div className="flex flex-col gap-3 mb-4">
                      {taggedShop ? (
                          <div className={`flex items-center rounded-xl overflow-hidden self-start ${isPilgrimageLedgerCompose ? 'bg-amber-500/10 text-amber-500 border border-amber-500/50 shadow-inner' : 'bg-amber-500/20 text-amber-500 border border-amber-500/30 transition-colors'}`}>
                              <button 
                                 onClick={() => !isPilgrimageLedgerCompose && setIsShopSearchOpen(true)}
                                 className={`flex items-center gap-2 px-4 py-2 font-bold ${isPilgrimageLedgerCompose ? 'cursor-default' : 'hover:bg-amber-500/10'}`}
                              >
                                {isPilgrimageLedgerCompose ? <Crown size={16} /> : <MapPin size={16} />}
                                {taggedShop.name}
                              </button>
                              {!isPilgrimageLedgerCompose && (
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setTaggedShop(null);
                                    }}
                                    className="px-3 py-2 hover:bg-amber-500/20 transition-colors border-l border-amber-500/20 text-amber-600 hover:text-amber-400"
                                    title={t('coffee_talk.btn_disconnect', '매장 연결 끊기')}
                                >
                                    <X size={16} />
                                </button>
                              )}
                          </div>
                      ) : (
                          <button 
                             onClick={() => setIsShopSearchOpen(true)}
                             className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors bg-espresso-900 border border-espresso-700 text-espresso-200 hover:bg-espresso-800 self-start"
                          >
                            <MapPin size={16} />{t('coffee_talk.ph_shop', '방문하신 카페가 어디인가요?')}
                          </button>
                      )}

                      {/* Bean Tag Input */}
                      <div className="relative w-full">
                          <Coffee size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-espresso-300" />
                          <input 
                              type="text" 
                              placeholder={t('coffee_talk.ph_bean', '어떤 원두(또는 로스터리)를 드셨나요? (선택)')}
                              value={taggedBean}
                              onChange={(e) => setTaggedBean(e.target.value)}
                              className="w-full bg-espresso-900 border border-espresso-700 rounded-xl py-2 pl-9 pr-4 text-sm text-espresso-50 placeholder:text-espresso-300 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                          />
                      </div>

                      {/* 감성 BGM 사운드 페어링 (Premium Theme Picker) */}
                      <div className="flex flex-col gap-2 p-3 bg-espresso-950/50 rounded-xl border border-amber-500/10 w-full mb-1">
                          <div className="flex items-center justify-between gap-2 mb-1">
                              <p className="text-[11px] font-bold text-amber-500 flex items-center gap-1.5"><Music size={12}/> {t('coffee_talk.bgm_pairing_title', '🎵 AI 감성 사운드 페어링 (배경음악 지정)')}</p>
                              <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                      type="button"
                                      onClick={(e) => {
                                          e.preventDefault();
                                          const nextActive = !isCustomBgmInputActive;
                                          setIsCustomBgmInputActive(nextActive);
                                          if (nextActive) {
                                              setSelectedBgmTheme(''); // 직접 입력 시 테마 선택 해제
                                          } else {
                                              setCustomBgmTitle('');
                                          }
                                      }}
                                      className={`px-2 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1 active:scale-95 transition-all shadow-sm border ${
                                          isCustomBgmInputActive 
                                              ? 'bg-amber-500 text-espresso-950 border-amber-400' 
                                              : 'bg-espresso-800 hover:bg-espresso-700 text-espresso-200 border-espresso-700'
                                      }`}
                                  >
                                      {t('coffee_talk.bgm_direct_input', '✍️ 직접 입력')}
                                  </button>
                                  <button
                                      type="button"
                                      onClick={(e) => {
                                          e.preventDefault();
                                          handleAiBgmAutoMatch();
                                          // AI 매칭 시 직접 입력 해제
                                          setCustomBgmTitle('');
                                          setIsCustomBgmInputActive(false);
                                      }}
                                      className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1 active:scale-95 transition-all shadow-sm"
                                  >
                                      <Sparkles size={10} className="text-amber-400 animate-pulse" /> {t('coffee_talk.bgm_ai_auto_match', 'AI 자동 매칭')}
                                  </button>
                              </div>
                          </div>

                          <AnimatePresence>
                              {isCustomBgmInputActive && (
                                  <motion.div 
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      exit={{ opacity: 0, height: 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="w-full relative overflow-hidden"
                                  >
                                      <input 
                                          type="text"
                                          value={customBgmTitle}
                                          onChange={(e) => {
                                              setCustomBgmTitle(e.target.value);
                                              setSelectedBgmTheme(''); // 직접 입력 중일 때는 테마 선택 해제
                                          }}
                                          placeholder={t('coffee_talk.bgm_ph_custom_title', '가수명 - 곡명 (예: 아이유 - 밤편지)')}
                                          className="w-full px-3 py-2 bg-espresso-900 border border-amber-500/30 rounded-xl text-xs font-semibold text-espresso-50 focus:border-amber-400 focus:outline-none placeholder-espresso-400 focus:ring-1 focus:ring-amber-400 transition-all shadow-inner my-1"
                                      />
                                  </motion.div>
                              )}
                          </AnimatePresence>

                          <div className="flex gap-2 overflow-x-auto pb-1.5 snap-x no-scrollbar">
                              {BGM_THEMES.map(theme => {
                                  const isSelected = selectedBgmTheme === theme.id;
                                  return (
                                      <button 
                                          key={theme.id}
                                          type="button"
                                          onClick={(e) => {
                                              e.preventDefault();
                                              setSelectedBgmTheme(isSelected ? '' : theme.id);
                                              // 장르 칩 선택 시 직접 입력 무력화
                                              setCustomBgmTitle('');
                                              setIsCustomBgmInputActive(false);
                                          }}
                                          className={`shrink-0 snap-center px-3 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 active:scale-95 ${
                                              isSelected 
                                                  ? 'bg-amber-500 text-espresso-950 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]' 
                                                  : 'bg-espresso-900 text-espresso-200 border-espresso-800 hover:border-amber-500/20'
                                          }`}
                                      >
                                          <Music size={11} className={isSelected ? 'animate-pulse' : 'opacity-70'} />
                                          {t(`coffee_talk.bgm_genre_${getBgmGenreKey(theme.id)}`, theme.label)}
                                      </button>
                                  );
                              })}
                          </div>
                      </div>

                      {/* Home Cafe Tags */}
                      <div className="w-full flex flex-wrap gap-2">
                          {[t('coffee_talk.tag_bean_review', '원두리뷰'), t('coffee_talk.tag_gear_boast', '장비자랑'), t('coffee_talk.tag_home_brewing', '홈브루잉'), t('coffee_talk.tag_coffee_recipe', '커피레시피'), t('coffee_talk.tag_home_cafe_life', '홈카페일상'), t('coffee_talk.tag_pairing', '페어링'), t('coffee_talk.tag_coffee_story', '커피이야기'), t('coffee_talk.tag_my_daily', '나의일상'), t('coffee_talk.tag_holy_place', '성지추천')].map(tag => (
                              <button
                                  key={tag}
                                  type="button"
                                  onClick={(e) => {
                                      e.preventDefault();
                                      if (newContent.includes(`#${tag}`)) {
                                          setNewContent(newContent.replace(new RegExp(`#${tag}(?=\\s|$)\\s*`, 'g'), '').trim());
                                      } else {
                                          setNewContent((newContent + ` #${tag}`).trim());
                                      }
                                  }}
                                  className={`px-3 py-1.5 rounded-full text-[12px] font-bold border transition-colors ${newContent.includes(`#${tag}`) ? 'bg-amber-500 text-espresso-950 border-amber-500' : 'bg-espresso-900 text-espresso-300 border-espresso-700 hover:border-amber-500/50'}`}
                              >
                                  #{tag}
                              </button>
                          ))}
                      </div>
                      
                      {/* Shorts specific tags */}
                      {composeMode === 'SHORTS' && (
                          <div className="flex flex-col gap-3 p-3 bg-espresso-950/50 rounded-xl border border-espresso-700/50 w-full">
                              <p className="text-[11px] font-bold text-espresso-400 mb-1">{t('coffee_talk.lbl_shorts_category', '🏷️ 숏폼 카테고리 & 사용 장비')}</p>
                              
                              <div className="flex flex-wrap gap-2">
                                  {[t('coffee_talk.cat_latte_art', '라떼아트 ☕'), t('coffee_talk.cat_espresso', '에스프레소 추출 💧'), t('coffee_talk.cat_hand_drip', '핸드드립 ☕'), t('coffee_talk.cat_roasting', '로스팅 🔥'), 'ASMR 🎧', t('coffee_talk.cat_vlog', '카페 브이로그 🏡')].map(cat => (
                                      <button 
                                          key={cat}
                                          onClick={(e) => { e.preventDefault(); setShortsCategory(shortsCategory === cat ? '' : cat); }}
                                          className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors border ${shortsCategory === cat ? 'bg-amber-500 text-[#0f0a05] border-amber-500' : 'bg-espresso-900 text-espresso-300 border-espresso-700 hover:border-amber-500/50'}`}
                                      >
                                          {cat}
                                      </button>
                                  ))}
                              </div>

                              <div className="relative w-full mt-1">
                                  <Settings size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-espresso-400" />
                                  <input 
                                      type="text" 
                                      placeholder={t('coffee_talk.ph_equipment', '사용 장비 (예: 라마르조코 리네아 미니, 디팅 KR804)')}
                                      value={equipmentTag}
                                      onChange={(e) => setEquipmentTag(e.target.value)}
                                      className="w-full bg-espresso-900 border border-espresso-700 rounded-lg py-1.5 pl-8 pr-3 text-[12px] text-espresso-50 placeholder:text-espresso-400 focus:outline-none focus:border-amber-500"
                                  />
                              </div>
                          </div>
                      )}
                      
                      {/* Utility Toggles (Poll & Course) */}
                      {!isPilgrimageLedgerCompose && composeMode !== 'SHORTS' && (
                          <div className="flex gap-2 w-full">
                              <button 
                                  onClick={() => setHasPoll(!hasPoll)}
                                  className={`flex flex-1 items-center justify-center gap-2 py-2.5 rounded-xl font-medium transition-all border ${hasPoll ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-espresso-900 border-espresso-700 text-espresso-200 hover:bg-espresso-800'}`}
                              >
                                  <BarChart2 size={16} /> {t('coffee_talk.btn_add_poll', '투표')}
                              </button>
                              
                              <button 
                                  onClick={() => {
                                      setIsCourseSelectorOpen(!isCourseSelectorOpen);
                                      if (!isCourseSelectorOpen) {
                                          setTimeout(() => {
                                              document.getElementById('course-selector-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                          }, 50);
                                      }
                                  }}
                                  className={`flex flex-1 items-center justify-center gap-2 py-2.5 rounded-xl font-medium transition-all border ${attachedCourseId ? 'bg-amber-500/20 text-amber-500 border-amber-500/30 shadow-sm' : 'bg-espresso-900 border-espresso-700 text-espresso-200 hover:bg-espresso-800'}`}
                              >
                                  <Map size={16} /> {t('coffee_talk.btn_add_course', '코스 첨부')}
                              </button>
                          </div>
                      )}

                      {/* Course Selector Draft UI */}
                      {isCourseSelectorOpen && (
                          <div id="course-selector-panel" className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 mb-2">
                              <p className="text-xs font-bold text-amber-500 mb-3 flex items-center gap-1.5"><Map size={14}/> {t('coffee_talk.title_select_course', '내 성지 코스 선택')}</p>
                              {myAvailableCourses.length > 0 ? (
                                  <div className="flex gap-3 overflow-x-auto pb-2 snap-x hide-scrollbar">
                                      {myAvailableCourses.map(course => (
                                          <div 
                                              key={course.id}
                                              onClick={() => setAttachedCourseId(attachedCourseId === course.id ? null : course.id)}
                                              className={`shrink-0 w-32 rounded-xl p-3 border transition-all snap-center cursor-pointer ${attachedCourseId === course.id ? 'bg-amber-500/20 border-amber-500' : 'bg-espresso-950 border-espresso-700 hover:border-amber-500/50'}`}
                                          >
                                              <p className="text-xs font-bold text-espresso-50 line-clamp-2 leading-snug">{course.name}</p>
                                              <p className="text-[10px] text-amber-500 mt-1.5 font-mono font-bold">{course._count?.items || 0} Places</p>
                                          </div>
                                      ))}
                                  </div>
                              ) : (
                                  <p className="text-[11px] text-espresso-300 text-center py-4 bg-espresso-950/50 rounded-xl">{t('coffee_talk.msg_empty_course', '목록이 비어있습니다. 프로필에서 코스를 만들어주세요.')}</p>
                              )}
                          </div>
                      )}

                      {/* Official Announcement Toggle (Host Only) */}
                      {currentUser?.role === 'OWNER' && composeMode !== 'GENERAL' && (
                          <div 
                              onClick={() => setIsAnnouncement(!isAnnouncement)}
                              className={`flex items-center w-full gap-3 py-3 px-4 rounded-[16px] font-bold transition-all border cursor-pointer select-none mb-2 ${isAnnouncement ? 'bg-amber-500/10 text-amber-500 border-amber-500/50 shadow-sm' : 'bg-espresso-950 border-espresso-700 text-espresso-400 hover:bg-espresso-900'} active:scale-[0.98]`}
                          >
                              {/* Custom Checkbox Graphic */}
                              <div className={`w-6 h-6 rounded-md flex items-center justify-center border-[2.5px] transition-colors shrink-0 ${isAnnouncement ? 'bg-amber-500 border-amber-500' : 'bg-espresso-900 border-espresso-600'}`}>
                                  {isAnnouncement && <Check size={16} className="text-espresso-950 flex-shrink-0" strokeWidth={4} />}
                              </div>
                              
                              <div className="flex flex-col flex-1 leading-tight text-left">
                                  <span className={`text-[15px] ${isAnnouncement ? 'text-amber-500 font-bold' : 'text-espresso-300 font-medium'}`}>
                                      {t('coffee_talk.lbl_official_notice', '📢 매장 공식 공지사항으로 등록')}
                                  </span>
                                  <span className={`text-[11px] mt-0.5 ${isAnnouncement ? 'text-amber-500/80 font-medium' : 'text-espresso-500'}`}>
                                      {isAnnouncement ? t('coffee_talk.desc_notice_on', '전체 피드에서 숨겨지며, 단골 소식 탭에만 강조 노출됩니다.') : t('coffee_talk.desc_notice_off', '체크 시 주변 이웃과 단골손님에게 전용 UI로 발송됩니다.')}
                                  </span>
                              </div>
                          </div>
                      )}
                    </div>

                    {/* Poll Draft UI */}
                    {hasPoll && (
                        <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-4 space-y-4 mb-4">
                            <input 
                                type="text"
                                placeholder={t('coffee_talk.ph_poll_question', '투표 질문을 입력하세요 (예: 이 원두 어떠셨나요?)')}
                                value={pollDraft.question}
                                onChange={e => setPollDraft({...pollDraft, question: e.target.value})}
                                className="w-full bg-espresso-950 border border-espresso-700 rounded-xl px-4 py-3 text-sm font-bold text-espresso-50 placeholder:text-espresso-300 focus:border-indigo-500 focus:outline-none"
                            />
                            <div className="space-y-2">
                                {pollDraft.options.map((opt, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-espresso-800 flex items-center justify-center text-xs text-espresso-200 shrink-0">{idx + 1}</div>
                                        <input 
                                            type="text"
                                            placeholder={t('coffee_talk.ph_poll_option', '항목 {{count}}', {count: idx + 1})}
                                            value={opt || ''}
                                            onChange={e => {
                                                const newOpts = [...pollDraft.options];
                                                newOpts[idx] = e.target.value;
                                                setPollDraft({...pollDraft, options: newOpts});
                                            }}
                                            className="flex-1 bg-espresso-950 border border-espresso-700 rounded-xl px-3 py-2 text-sm text-espresso-50 focus:border-indigo-500 focus:outline-none"
                                        />
                                        {pollDraft.options.length > 2 && (
                                            <button 
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    const newOpts = pollDraft.options.filter((_, i) => i !== idx);
                                                    setPollDraft({...pollDraft, options: newOpts});
                                                }}
                                                className="p-2 text-espresso-300 hover:text-red-400 transition-colors"
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            
                            <div className="flex items-center justify-between">
                                {(() => {
                                    const getPollExpiresAtString = (hours: number) => {
                                        const date = new Date(Date.now() + hours * 60 * 60 * 1000);
                                        const offset = date.getTimezoneOffset() * 60000;
                                        return (new Date(date.getTime() - offset)).toISOString().slice(0, 16);
                                    };
                                    const handlePollDateChange = (val: string) => {
                                        if (!val) return;
                                        const selectedDate = new Date(val);
                                        const diffMs = selectedDate.getTime() - Date.now();
                                        if (diffMs <= 0) {
                                            alert("종료일은 현재 시간보다 미래여야 합니다.");
                                            return;
                                        }
                                        const hours = Math.ceil(diffMs / (1000 * 60 * 60));
                                        setPollDraft(prev => ({ ...prev, durationHours: hours }));
                                    };
                                    return (
                                        <div className="relative flex items-center bg-espresso-950 border border-espresso-700 rounded-xl px-3 py-2 text-xs font-bold text-espresso-200">
                                            <Calendar size={14} className="text-indigo-400 mr-2 shrink-0" />
                                            <input 
                                                type="datetime-local"
                                                value={getPollExpiresAtString(pollDraft.durationHours)}
                                                min={new Date().toISOString().slice(0, 16)}
                                                onChange={(e) => handlePollDateChange(e.target.value)}
                                                className="bg-transparent text-espresso-100 outline-none cursor-pointer border-none p-0 text-[11px] font-bold select-none focus:ring-0 focus:outline-none"
                                                style={{ colorScheme: 'dark' }}
                                            />
                                            <span className="ml-2 text-[10px] text-indigo-400 font-bold shrink-0">
                                                ({pollDraft.durationHours >= 24 
                                                    ? `${Math.floor(pollDraft.durationHours / 24)}일 뒤 종료` 
                                                    : `${pollDraft.durationHours}시간 뒤 종료`})
                                            </span>
                                        </div>
                                    );
                                })()}

                                {pollDraft.options.length < 10 && (
                                    <button 
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setPollDraft(prev => ({...prev, options: [...prev.options, '']}));
                                        }}
                                        className="py-2 px-4 flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-400 bg-indigo-500/10 rounded-xl hover:bg-indigo-500/20 transition-colors"
                                    >
                                        <Plus size={14} /> {t('coffee_talk.btn_add_poll_option', '항목 추가')}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Recipe Inputs (if true) */}
                    {isRecipeMode && (
                        <div className="bg-espresso-900 border border-espresso-700 rounded-2xl p-4 space-y-4">
                            <p className="text-xs font-bold text-amber-500">{t('coffee_talk.title_recipe_detail', '레시피 상세 정보 (선택)')}</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-espresso-300 font-bold ml-1">{t('coffee_talk.lbl_recipe_dose', '원두량 (g)')}</label>
                                    <input type="text" placeholder={t('coffee_talk.ph_recipe_dose', '예: 20g')} value={recipeData.dose} onChange={e => setRecipeData({...recipeData, dose: e.target.value})} className="w-full bg-espresso-950 border border-espresso-700 rounded-xl px-3 py-2 text-sm text-espresso-50 focus:border-amber-500 focus:outline-none" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-espresso-300 font-bold ml-1">{t('coffee_talk.lbl_recipe_yield', '추출량 (g/ml)')}</label>
                                    <input type="text" placeholder={t('coffee_talk.ph_recipe_yield', '예: 300g')} value={recipeData.yield} onChange={e => setRecipeData({...recipeData, yield: e.target.value})} className="w-full bg-espresso-950 border border-espresso-700 rounded-xl px-3 py-2 text-sm text-espresso-50 focus:border-amber-500 focus:outline-none" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-espresso-300 font-bold ml-1">{t('coffee_talk.lbl_recipe_temp', '물 온도 (°C)')}</label>
                                    <input type="text" placeholder={t('coffee_talk.ph_recipe_temp', '예: 92°C')} value={recipeData.temp} onChange={e => setRecipeData({...recipeData, temp: e.target.value})} className="w-full bg-espresso-950 border border-espresso-700 rounded-xl px-3 py-2 text-sm text-espresso-50 focus:border-amber-500 focus:outline-none" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-espresso-300 font-bold ml-1">{t('coffee_talk.lbl_recipe_time', '추출 시간')}</label>
                                    <input type="text" placeholder={t('coffee_talk.ph_recipe_time', '예: 2분 30초')} value={recipeData.time} onChange={e => setRecipeData({...recipeData, time: e.target.value})} className="w-full bg-espresso-950 border border-espresso-700 rounded-xl px-3 py-2 text-sm text-espresso-50 focus:border-amber-500 focus:outline-none" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-espresso-300 font-bold ml-1">{t('coffee_talk.lbl_recipe_grinder', '그라인더 (선택)')}</label>
                                    <input type="text" placeholder={t('coffee_talk.ph_recipe_grinder', '예: 코만단테 25클릭')} value={recipeData.grinder} onChange={e => setRecipeData({...recipeData, grinder: e.target.value})} className="w-full bg-espresso-950 border border-espresso-700 rounded-xl px-3 py-2 text-sm text-espresso-50 focus:border-amber-500 focus:outline-none" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-espresso-300 font-bold ml-1">{t('coffee_talk.lbl_recipe_method', '추출 도구 (선택)')}</label>
                                    <input type="text" placeholder={t('coffee_talk.ph_recipe_method', '예: 하리오 V60')} value={recipeData.method} onChange={e => setRecipeData({...recipeData, method: e.target.value})} className="w-full bg-espresso-950 border border-espresso-700 rounded-xl px-3 py-2 text-sm text-espresso-50 focus:border-amber-500 focus:outline-none" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tasting Notes (Optional) */}
                    {isRecipeMode && (
                      <div className="bg-espresso-900 border border-espresso-700 rounded-2xl p-4 space-y-4">
                          <p className="text-xs font-bold text-espresso-200">{t('coffee_talk.title_taste_note', '테이스팅 노트 (선택)')}</p>
                          {[
                            { id: 'acidity', label: t('coffee_talk.lbl_taste_acidity', '산미') },
                            { id: 'sweetness', label: t('coffee_talk.lbl_taste_sweetness', '단맛') },
                            { id: 'body', label: t('coffee_talk.lbl_taste_body', '바디감') },
                            { id: 'bitterness', label: t('coffee_talk.lbl_taste_bitterness', '쓴맛') },
                            { id: 'aroma', label: t('coffee_talk.lbl_taste_aroma', '향/아로마') }
                        ].map(taste => (
                            <div key={taste.id} className="flex items-center gap-4">
                                <span className="w-16 text-sm text-espresso-300">{taste.label}</span>
                                <input 
                                    type="range" 
                                    min="0" max="5" 
                                    step="0.5"
                                    value={(tastingNote as any)[taste.id]}
                                    onChange={(e) => setTastingNote(prev => ({ ...prev, [taste.id]: parseFloat(e.target.value) }))}
                                    className="flex-1 accent-amber-500"
                                />
                                <span className="w-7 text-sm font-mono text-espresso-200 text-right">{(tastingNote as any)[taste.id]}</span>
                            </div>
                        ))}
                    </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Comment Bottom Sheet */}
      <CommentSheet 
          postId={activeCommentPostId!} 
          isOpen={!!activeCommentPostId} 
          post={posts.find(p => p.id === activeCommentPostId)}
          isLiked={activeCommentPostId ? isLiked[activeCommentPostId] : false}
          isBookmarked={activeCommentPostId ? isBookmarked[activeCommentPostId] : false}
          onLike={() => {
              const activePost = posts.find(p => p.id === activeCommentPostId);
              if (activePost) handleLike(activePost.id, activePost.likes);
          }}
          onBookmark={() => activeCommentPostId && setCollectionPostId(activeCommentPostId)}
          onShare={() => activeCommentPostId && handleShare(activeCommentPostId)}
          onCommentCountChange={(postId, newCount) => {
              setPosts(prev => prev.map(p => {
                  if (p.id === postId) {
                      return { ...p, comments: newCount };
                  }
                  return p;
              }));
              
              const cacheKey = activeFilter + '_' + sortOption;
              if (globalFeedCache[cacheKey]) {
                  globalFeedCache[cacheKey].posts = globalFeedCache[cacheKey].posts.map((p: any) => {
                      if (p.id === postId) {
                          return { ...p, comments: newCount };
                      }
                      return p;
                  });
              }
          }}
          onClose={() => {
              setActiveCommentPostId(null);
               // Option to trigger a refetch of post to update comment count
           }} 
       />

      {/* Shop Search Overlay */}
      <ShopSearch 
          isOpen={isShopSearchOpen}
          onClose={() => setIsShopSearchOpen(false)}
          onSelect={(shop) => {
              setTaggedShop(shop);
              setIsShopSearchOpen(false);
          }}
      />

      {/* Media Carousel Modal */}
      {activeCarouselUrls && (
          <MediaCarousel 
              mediaUrls={activeCarouselUrls} 
              onClose={() => setActiveCarouselUrls(null)} 
          />
      )}

            {/* Shorts Recipe & Tasting Note Bottom Sheet */}
      <AnimatePresence>
          {activeRecipeNotePost && (
              <>
                  <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-black/60 z-[300] backdrop-blur-sm"
                      onClick={() => setActiveRecipeNotePost(null)}
                  />
                  <motion.div
                      initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                      transition={{ type: "spring", damping: 25, stiffness: 200 }}
                      className="fixed bottom-0 left-0 right-0 z-[310] bg-espresso-950/90 backdrop-blur-xl border-t border-espresso-800 rounded-t-3xl p-6 pb-safe flex flex-col max-h-[85vh] overflow-y-auto"
                  >
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="font-bold text-white text-[18px]">레시피 & 테이스팅 노트</h3>
                          <button onClick={() => setActiveRecipeNotePost(null)} className="w-8 h-8 rounded-full bg-espresso-800 flex items-center justify-center text-espresso-200">
                              <X size={18} />
                          </button>
                      </div>
                      
                      {activeRecipeNotePost.recipeData && (
                          <div className="mb-6 bg-espresso-900/50 border border-emerald-500/20 rounded-2xl p-5">
                              <p className="text-[12px] font-bold text-emerald-500 mb-4 uppercase tracking-wide flex items-center gap-1.5"><Coffee size={15}/> Brewing Recipe</p>
                              <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                                  {[
                                      { icon: <Scale size={14} />, label: t('coffee_talk.recipe_dose', '원두량'), value: activeRecipeNotePost.recipeData.dose },
                                      { icon: <Droplets size={14} />, label: t('coffee_talk.recipe_yield', '추출량'), value: activeRecipeNotePost.recipeData.yield },
                                      { icon: <Thermometer size={14} />, label: t('coffee_talk.recipe_temp', '물 온도'), value: activeRecipeNotePost.recipeData.temp },
                                      { icon: <Timer size={14} />, label: t('coffee_talk.recipe_time', '추출 시간'), value: activeRecipeNotePost.recipeData.time },
                                      { icon: <Settings size={14} />, label: t('coffee_talk.recipe_grinder', '그라인더'), value: activeRecipeNotePost.recipeData.grinder },
                                      { icon: <Coffee size={14} />, label: t('coffee_talk.recipe_method', '추출 도구'), value: activeRecipeNotePost.recipeData.method },
                                  ].filter(item => item.value).map((item, idx) => (
                                      <div key={idx} className="flex flex-col">
                                          <span className="text-[12px] font-medium text-espresso-300 flex items-center gap-1.5 mb-1.5">{item.icon} {item.label}</span>
                                          <span className="text-[15px] font-bold text-espresso-50 pl-5">{item.value}</span>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}

                      {activeRecipeNotePost.tastingNote && (
                          <div className="bg-espresso-900/50 border border-amber-500/20 rounded-2xl p-5 mb-8">
                              <p className="text-[12px] font-bold text-amber-500 mb-4 uppercase tracking-wide">Taster's Note</p>
                              <div className="space-y-3">
                                  {[
                                      { label: t('coffee_talk.taste_acidity', '산미 (Acidity)'), val: activeRecipeNotePost.tastingNote.acidity },
                                      { label: t('coffee_talk.taste_sweetness', '단맛 (Sweetness)'), val: activeRecipeNotePost.tastingNote.sweetness },
                                      { label: t('coffee_talk.taste_bitterness', '쓴맛 (Bitterness)'), val: activeRecipeNotePost.tastingNote.bitterness },
                                      { label: t('coffee_talk.taste_aroma', '향/아로마 (Aroma)'), val: activeRecipeNotePost.tastingNote.aroma },
                                      { label: t('coffee_talk.taste_body', '바디감 (Body)'), val: activeRecipeNotePost.tastingNote.body }
                                  ].map((taste, idx) => (
                                      <div key={idx} className="flex items-center gap-3">
                                          <span className="w-[120px] text-[13px] font-medium text-espresso-300">{taste.label}</span>
                                          <div className="flex-1 h-2 bg-espresso-800 rounded-full overflow-hidden">
                                              <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full" style={{ width: `${(taste.val / 5) * 100}%` }} />
                                          </div>
                                          <span className="w-4 text-right text-[13px] font-bold text-espresso-100">{taste.val}</span>
                                      </div>
                                  ))}
                              </div>
                              {activeRecipeNotePost.tastingNote.flavorTags && (
                                  <div className="mt-5 pt-4 border-t border-espresso-800/50">
                                      <p className="text-[11px] font-bold text-espresso-400 mb-2">FLAVOR & AROMA</p>
                                      <div className="flex flex-wrap gap-2">
                                          {activeRecipeNotePost.tastingNote.flavorTags.split(',').map((tag: string, i: number) => (
                                              <span key={i} className="px-3 py-1 bg-espresso-800 text-amber-100 rounded-full text-[12px] font-medium border border-espresso-700">{tag.trim()}</span>
                                          ))}
                                      </div>
                                  </div>
                              )}
                          </div>
                      )}
                  </motion.div>
              </>
          )}
      </AnimatePresence>

      {/* Reward Tier Selection Modal */}
      {showRewardModal && selectedRewardTarget && rewardTiers && (
          <div className="fixed inset-0 z-[500] bg-espresso-950/50 flex flex-col items-center justify-center p-4">
              <div className="bg-espresso-900 rounded-2xl w-[90%] max-w-[320px] p-5 shadow-2xl border border-amber-500/20 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-espresso-50 text-[16px]">
                          {selectedRewardTarget.name}{t('coffee_talk.modal_reward_title', '님에게 보상하기')}
                      </h3>
                      <button onClick={() => setShowRewardModal(false)} className="text-espresso-200 p-1 hover:text-espresso-50 transition-colors">
                          <X size={20} />
                      </button>
                  </div>
                  <p className="text-[13px] text-espresso-200 mb-5 leading-relaxed break-keep">
                      {t('coffee_talk.modal_reward_desc', '유익한 게시글을 올린 {{name}}님에게 지급할 보상 등급을 선택해주세요.', {name: selectedRewardTarget.name})}
                  </p>
                  
                  <div className="space-y-2 mb-4">
                      {[
                          { name: rewardTiers.rewardTier1Name, amount: rewardTiers.rewardTier1Amount },
                          { name: rewardTiers.rewardTier2Name, amount: rewardTiers.rewardTier2Amount },
                          { name: rewardTiers.rewardTier3Name, amount: rewardTiers.rewardTier3Amount }
                      ].map((tier, idx) => {
                          const translatedName = tier.name === '참여' ? t('coffee_talk.tier1', '참여') : 
                                                 tier.name === '감사' ? t('coffee_talk.tier2', '감사') : 
                                                 tier.name === '최고' ? t('coffee_talk.tier3', '최고') : tier.name;
                          return (
                          <button
                              key={idx}
                              onClick={() => processReward(tier.amount, `${tier.name} 보상`)}
                              className="w-full flex items-center justify-between p-3.5 bg-espresso-950 border border-amber-900/30 rounded-xl hover:bg-amber-500/10 active:bg-amber-500/20 transition-colors group"
                          >
                              <span className="font-bold text-espresso-100 group-hover:text-amber-500 text-[14px]">{translatedName}</span>
                              <span className="font-black text-amber-500 flex items-center gap-1"><Coffee size={14} /> {tier.amount}{t('coffee_talk.modal_reward_unit', '콩')}</span>
                          </button>
                          );
                      })}
                  </div>
                  <p className="text-center text-[11px] text-espresso-300">{t('coffee_talk.modal_reward_warning', '보상 시 회원님의 커피콩이 즉시 차감됩니다.')}</p>
              </div>
          </div>
      )}

      {/* Comment Image Gallery Bottom Sheet */}
      <CommentImageGallerySheet 
          postId={galleryPostId || ''} 
          isOpen={!!galleryPostId} 
          onClose={() => setGalleryPostId(null)} 
      />

      {/* Collection Save Modal */}
      <CollectionSaveSheet 
          postId={collectionPostId || ''} 
          isOpen={!!collectionPostId} 
          onClose={() => setCollectionPostId(null)} 
          onSaveStateChange={(id, isSaved) => setIsBookmarked(prev => ({ ...prev, [id]: isSaved }))}
      />

      {/* User Public Profile Modal */}
      {selectedPublicUserId && (
          <UserPublicProfileModal 
              userId={selectedPublicUserId} 
              onClose={() => setSelectedPublicUserId(null)} 
              onOwnerDetected={(store) => setDetailShopData(store)}
          />
      )}

      <ShopDetailModal 
        isOpen={!!detailShopData} 
        onClose={() => setDetailShopData(null)} 
        shop={detailShopData} 
        currentUser={currentUser}
        onRewardClick={(shopInfo: any) => {
            setSelectedRewardTarget({ id: shopInfo.ownerId, name: shopInfo.name, entityId: shopInfo.id });
            setShowRewardModal(true);
        }}
      />

      {/* Full Screen Prescription Modal */}
      <AnimatePresence>
        {selectedPrescription && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedPrescription(null)} className="fixed inset-0 bg-espresso-950/80 backdrop-blur-sm z-[100]" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="fixed inset-x-0 bottom-0 top-[10vh] bg-espresso-950 rounded-t-[2rem] z-[105] overflow-hidden flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
               <div className="p-4 flex justify-between items-center border-b border-espresso-700 bg-espresso-900 shrink-0">
                  <h3 className="text-espresso-50 font-bold ml-2 text-[15px] flex items-center gap-2"><Coffee size={18} className="text-amber-500" /> {t('coffee_talk.title_prescription_detail', '처방전 상세 보기')}</h3>
                  <button onClick={() => setSelectedPrescription(null)} className="p-2 text-espresso-200 hover:text-espresso-50 hover:bg-espresso-800 rounded-full transition-colors"><X size={24} /></button>
               </div>
               <div className="flex-1 overflow-y-auto w-full max-w-lg mx-auto p-4 pb-12 hide-scrollbar">
                  <PrescriptionTicket
                      recommendation={{
                          bean: (() => {
                              try {
                                  const match = selectedPrescription.aiComment?.match(/<!-- BEANDATA: (.*?) -->/);
                                  if (match) return JSON.parse(match[1]);
                              } catch(e) {}
                              return COFFEE_BEANS.find(b => b.name === selectedPrescription.beanName) || { name: selectedPrescription.beanName, roast: 'Blend/Single', region: 'Global' } as any;
                          })(),
                          brand: BRANDS.find(b => b.name === selectedPrescription.brand) || { name: selectedPrescription.brand } as any
                      }}
                      aiExplanation={selectedPrescription.aiComment || ''}
                      isLoggedIn={true}
                      hideSave={true}
                      rating={selectedPrescription.rating || undefined}
                      date={new Date(selectedPrescription.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  />
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
