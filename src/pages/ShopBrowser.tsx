import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ErrorBoundary from '../components/ErrorBoundary';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Search, Map as MapIcon, ChevronLeft, ChevronRight, Globe, List, Navigation, SlidersHorizontal, X, BadgeCheck, Bean, Coffee, CakeSlice, Sparkles } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ShopDetailModal from '../components/ShopDetailModal';
import SharedCoffeeMap from '../components/SharedCoffeeMap';
import { API_BASE, getDeviceCountryCode } from '../utils/apiConfig';

// Cache for AI search results to prevent redundant expensive API calls across page navigations
const getFullImageUrl = (url: string | null | undefined) => {
    if (!url) return '';
    if (url.startsWith('/mock-bucket')) return 'https://images.unsplash.com/photo-1554118811-1e0d58224f24';
    if (url.startsWith('/') && !url.startsWith('//')) return `${API_BASE}${url}`;
    return url;
};
const getInitialCache = () => {
    try { return JSON.parse(sessionStorage.getItem('bm_ai_cache_dict_v2') || '{}'); } 
    catch { return {}; }
};
const aiShopCache: Record<string, any[]> = getInitialCache();

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
      ; 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
    return R * c; // Distance in km
}

export default function ShopBrowser() {
    const navigate = useNavigate();
    const location = useLocation();
    const { t, i18n } = useTranslation();
    const [shops, setShops] = useState<any[]>(() => {
        try {
            const saved = sessionStorage.getItem('bm_shops');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });
    const [bookmarks, setBookmarks] = useState<Set<string>>(() => {
        try {
            const saved = sessionStorage.getItem('bm_bookmarks');
            return saved ? new Set(JSON.parse(saved)) : new Set();
        } catch { return new Set(); }
    });

    const [userLocation, setUserLocation] = useState<[number, number] | null>(() => {
        try {
            const saved = sessionStorage.getItem('bm_user_loc');
            return saved ? JSON.parse(saved) : null;
        } catch { return null; }
    });
    const [mapCenter, setMapCenter] = useState<[number, number]>(() => {
        try {
            const saved = sessionStorage.getItem('bm_map_center');
            return saved ? JSON.parse(saved) : [37.5665, 126.9780];
        } catch { return [37.5665, 126.9780]; }
    });
    const [mapBounds, setMapBounds] = useState<{ minLat: number; maxLat: number; minLng: number; maxLng: number } | null>(null);
    const [mapBoundsToFit, setMapBoundsToFit] = useState<{ minLat: number; maxLat: number; minLng: number; maxLng: number, ts: number } | null>(null);

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoading, setIsLoading] = useState(() => {
        const urlParams = new URLSearchParams(location.search);
        return shops.length === 0 || !!urlParams.get('courseId');
    });
    const [isForking, setIsForking] = useState(false);
    const [forkedCourseIds, setForkedCourseIds] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('bm_forked_courses');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });
    
    const [aiShops, setAiShops] = useState<any[]>(() => {
        try {
            const saved = sessionStorage.getItem('bm_ai_shops');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });
    const [isAiLoading, setIsAiLoading] = useState(false);
    
    // AI Auto Extract Toggle
    const [isAiAutoExtractEnabled, setIsAiAutoExtractEnabled] = useState(false);
    const isAiAutoExtractRef = React.useRef(false);
    useEffect(() => {
        isAiAutoExtractRef.current = isAiAutoExtractEnabled;
    }, [isAiAutoExtractEnabled]);
    
    // Map Ads State
    const [mapAds, setMapAds] = useState<any[]>([]);
    
    const [searchQuery, setSearchQuery] = useState(() => sessionStorage.getItem('bm_search_query') || '');
    const [isSearching, setIsSearching] = useState(false);
    const [isCourseMode, setIsCourseMode] = useState(() => {
        const urlParams = new URLSearchParams(location.search);
        return !!urlParams.get('courseId');
    });
    const [activeCourseConfig, setActiveCourseConfig] = useState<any>(null);
    
    // Fetch Map Ads
    useEffect(() => {
        const fetchAds = async () => {
            try {
                const token = localStorage.getItem('token');
                const headers: any = {};
                if (token) headers['Authorization'] = `Bearer ${token}`;
                const res = await fetch(`${API_BASE}/api/ads/serve?tab=MAP&lang=${i18n.language || 'en'}`, { headers });
                if (res.ok) {
                    const data = await res.json();
                    if (data.ad) {
                        setMapAds([data.ad]);
                    }
                }
            } catch(e) {}
        };
        fetchAds();
    }, [i18n.language]);

    // Sync state and load course data if navigating via Course URL
    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        const urlCourseId = urlParams.get('courseId');
        const urlShopId = urlParams.get('shopId');
        const isPassport = urlParams.get('passport') === 'true';
        
        if (isPassport) {
            setIsCourseMode(true);
            setIsLoading(true);
            
            const fetchPassportShops = async () => {
                try {
                    const headers: any = {};
                    const token = localStorage.getItem('token');
                    if (token) headers['Authorization'] = `Bearer ${token}`;

                    const res = await fetch(`${API_BASE}/api/users/checkins`, { headers });
                    if (res.ok) {
                        const data = await res.json();
                        const checkinShops = data.map((checkin: any) => checkin.store).filter(Boolean);
                        
                        setActiveCourseConfig({ name: '성지순례 여권 (My Passport)', description: '내가 방문 인증을 완료한 성지들입니다.' });
                        setShops(checkinShops);
                        
                        if (checkinShops.length > 0) {
                            if (urlShopId) {
                                const targetShop = checkinShops.find((s: any) => s.id === urlShopId);
                                if (targetShop && targetShop.lat && targetShop.lng) {
                                    setMapCenter([targetShop.lat, targetShop.lng]);
                                    sortAnchor.current = [targetShop.lat, targetShop.lng];
                                    setSearchedShopId(targetShop.id);
                                    setFocusedShopId(targetShop.id);
                                }
                            } else {
                                let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
                                checkinShops.forEach((s: any) => {
                                    if (s.lat && s.lng) {
                                        if (s.lat < minLat) minLat = s.lat;
                                        if (s.lat > maxLat) maxLat = s.lat;
                                        if (s.lng < minLng) minLng = s.lng;
                                        if (s.lng > maxLng) maxLng = s.lng;
                                    }
                                });
                                
                                setMapCenter([checkinShops[0].lat, checkinShops[0].lng]);
                                sortAnchor.current = [checkinShops[0].lat, checkinShops[0].lng];
                                
                                if (minLat !== 90 && checkinShops.length > 1) {
                                    setMapBoundsToFit({ minLat: minLat - 0.005, maxLat: maxLat + 0.005, minLng: minLng - 0.005, maxLng: maxLng + 0.005, ts: Date.now() });
                                }
                            }
                        }
                    } else {
                        setIsCourseMode(false);
                    }
                } catch (e) {
                    console.error("Failed to load passport checkins for map mode:", e);
                    setIsCourseMode(false);
                } finally {
                    setIsLoading(false);
                }
            };
            
            fetchPassportShops();
        } else if (urlCourseId) {
            setIsCourseMode(true);
            setIsLoading(true);
            
            const fetchCourseDetails = async () => {
                try {
                    const headers: any = {};
                    const token = localStorage.getItem('token');
                    if (token) headers['Authorization'] = `Bearer ${token}`;

                    const res = await fetch(`${API_BASE}/api/community/courses/${urlCourseId}`, { headers });
                    if (res.ok) {
                        const courseData = await res.json();
                        setActiveCourseConfig(courseData);
                        
                        const courseShops = courseData.items?.map((item: any) => item.store).filter(Boolean) || [];
                        setShops(courseShops);
                        
                        if (courseShops.length > 0) {
                            if (urlShopId) {
                                const targetShop = courseShops.find((s: any) => s.id === urlShopId);
                                if (targetShop && targetShop.lat && targetShop.lng) {
                                    setMapCenter([targetShop.lat, targetShop.lng]);
                                    sortAnchor.current = [targetShop.lat, targetShop.lng];
                                    setSearchedShopId(targetShop.id);
                                    setFocusedShopId(targetShop.id);
                                }
                            } else {
                                let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
                                courseShops.forEach((s: any) => {
                                    if (s.lat && s.lng) {
                                        if (s.lat < minLat) minLat = s.lat;
                                        if (s.lat > maxLat) maxLat = s.lat;
                                        if (s.lng < minLng) minLng = s.lng;
                                        if (s.lng > maxLng) maxLng = s.lng;
                                    }
                                });
                                
                                setMapCenter([courseShops[0].lat, courseShops[0].lng]);
                                sortAnchor.current = [courseShops[0].lat, courseShops[0].lng];
                                
                                if (minLat !== 90 && courseShops.length > 1) {
                                    setMapBoundsToFit({ minLat: minLat - 0.005, maxLat: maxLat + 0.005, minLng: minLng - 0.005, maxLng: maxLng + 0.005, ts: Date.now() });
                                }
                            }
                        }
                    } else {
                        setIsCourseMode(false);
                    }
                } catch (e) {
                    console.error("Failed to load course details for map mode:", e);
                    setIsCourseMode(false);
                } finally {
                    setIsLoading(false);
                }
            };
            
            fetchCourseDetails();
        } else {
            setIsCourseMode(false);
            setActiveCourseConfig(null);
        }
    }, [location.search]);
    
    const activeCoffeeTalkTargetRef = React.useRef<string | null>(null);
    
    // Stable sort anchor to prevent carousel jumping when the 사용자 interacts with the map natively
    const sortAnchor = React.useRef<[number, number] | null>(null);
    if (!sortAnchor.current && mapCenter) sortAnchor.current = mapCenter;

    const [searchedShopId, setSearchedShopId] = useState<string | null>(() => sessionStorage.getItem('bm_searched_id') || null);
    const [isComposing, setIsComposing] = useState(false);
    
    // Filter states
    const [sourceFilter, setSourceFilter] = useState<'ALL' | 'DB' | 'AI'>('ALL');
    const [isSourceFilterOpen, setIsSourceFilterOpen] = useState(false);
    const [curatorPickOnly, setCuratorPickOnly] = useState(false);

    // Modal & Scroll states
    const [selectedShop, setSelectedShop] = useState<any>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [focusedShopId, setFocusedShopId] = useState<string | null>(null);

    // Bottom Sheet Drag State
    const [sheetHeight, setSheetHeight] = useState(47); // Initial 47%
    const sheetDragStartY = React.useRef<number | null>(null);
    const sheetStartHeight = React.useRef<number>(47);

    const handleSheetPointerDown = (e: React.PointerEvent) => {
        sheetDragStartY.current = e.clientY;
        sheetStartHeight.current = sheetHeight;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handleSheetPointerMove = (e: React.PointerEvent) => {
        if (sheetDragStartY.current === null) return;
        const deltaY = sheetDragStartY.current - e.clientY;
        if (window.innerHeight) {
            const deltaPercent = (deltaY / window.innerHeight) * 100;
            let newHeight = sheetStartHeight.current + deltaPercent;
            // Constrain
            if (newHeight < 15) newHeight = 15;
            if (newHeight > 85) newHeight = 85;
            setSheetHeight(newHeight);
        }
    };

    const handleSheetPointerUp = (e: React.PointerEvent) => {
        if (sheetDragStartY.current === null) return;
        sheetDragStartY.current = null;
        try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch(ex) {}
        // Snap physics
        if (sheetHeight < 30) {
            setSheetHeight(15);
        } else if (sheetHeight > 70) {
            setSheetHeight(85);
        } else {
            setSheetHeight(47);
        }
    };

    const userInteractionRef = React.useRef(0);

    const handleInteraction = () => {
        userInteractionRef.current = Date.now();
    };

    const handleFeedScroll = (e: React.UIEvent<HTMLDivElement>) => {
        // Prevent layout shifts (virtual keyboard dismiss, DOM mount) from hijacking the map bounds
        if (Date.now() - userInteractionRef.current > 1000) return;

        const container = e.currentTarget;
        const containerRect = container.getBoundingClientRect();
        const containerCenterY = containerRect.top + containerRect.height / 2;
        
        let closestId: string | null = null;
        let minDistance = Infinity;

        const cards = container.querySelectorAll('[id^="feed-card-"]');
        let firstCardId: string | null = null;

        cards.forEach((card, index) => {
            if (index === 0) firstCardId = card.id.replace('feed-card-', '');
            
            const rect = card.getBoundingClientRect();
            if (rect.bottom < containerRect.top || rect.top > containerRect.bottom) return;

            const cardCenterY = rect.top + rect.height / 2;
            const distance = Math.abs(containerCenterY - cardCenterY);
            
            if (distance < minDistance) {
                minDistance = distance;
                closestId = card.id.replace('feed-card-', '');
            }
        });

        // CRITICAL SCROLL SPY FIX:
        // When the feed is at the absolute top (scrollTop ~ 0), the mathematical center of a tall Flex wrapper
        // often falls upon the SECOND or THIRD child element, automatically yanking map focus to disjointed cards.
        // If we are at the top margin, force lock onto the first visible card.
        if (container.scrollTop < 20 && firstCardId) {
            closestId = firstCardId;
        }

        if (closestId && closestId !== focusedShopId) {
            setFocusedShopId(closestId);
        }
    };

    const isAutoPanningRef = React.useRef(false);
    const autoPanTimerRef = React.useRef<any>(null);
    const lastPannedShopId = React.useRef<string | null>(null);

    // Auto-pan map when a new shop becomes focused via scroll or click
    useEffect(() => {
        // If we already panned to this exact shop, do not pan again just because 'shops' array updated (e.g. from user dragging the map)
        if (focusedShopId && focusedShopId === lastPannedShopId.current) return;
        
        if (!focusedShopId) {
            lastPannedShopId.current = null;
            return;
        }

        if (focusedShopId && !isSearching && !isLoading && !isAiLoading) {
            const displayShops = sourceFilter === 'AI' ? [] : shops;
            const displayAiShops = sourceFilter === 'DB' ? [] : aiShops;
            const allAvailableShops = [...displayShops, ...displayAiShops];
            
            const shopToPan = allAvailableShops.find(s => s.id === focusedShopId);
            if (shopToPan && shopToPan.lat && shopToPan.lng) {
                // Determine actual map center right now.
                // mapCenter state might not be fully accurate down to tiny decimals if user drug the map slightly, 
                // but setting mapCenter will trigger MapControllerComponent's flyTo safely.
                const parsedLat = parseFloat(shopToPan.lat as any);
                const parsedLng = parseFloat(shopToPan.lng as any);
                
                if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
                    isAutoPanningRef.current = true;
                    setMapCenter([parsedLat, parsedLng]);
                    
                    lastPannedShopId.current = focusedShopId;
                    
                    // Release the lock after 1.5s, clearing any previous concurrent locks
                    if (autoPanTimerRef.current) clearTimeout(autoPanTimerRef.current);
                    autoPanTimerRef.current = setTimeout(() => { isAutoPanningRef.current = false; }, 1500);
                }
            }
        }
    }, [focusedShopId, sourceFilter, shops, aiShops]); // Deliberately lightweight dep array

        // Save persist state continuously
    useEffect(() => {
        try {
            sessionStorage.setItem('bm_search_query', searchQuery);
            // Optionally truncate shops to prevent QuotaExceeded errors with massive base64 media payloads
            const safeShops = shops.slice(0, 50).map(s => {
                const copy = { ...s };
                if (copy.media && typeof copy.media === 'string') delete copy.media; // Drop heavy fields for session cache
                return copy;
            });
            sessionStorage.setItem('bm_shops', JSON.stringify(safeShops));
            sessionStorage.setItem('bm_ai_shops', JSON.stringify(aiShops));
            sessionStorage.setItem('bm_bookmarks', JSON.stringify(Array.from(bookmarks)));
            
            if (searchedShopId) sessionStorage.setItem('bm_searched_id', searchedShopId);
            else sessionStorage.removeItem('bm_searched_id');
            
            if (mapCenter) sessionStorage.setItem('bm_map_center', JSON.stringify(mapCenter));
        } catch (e) {
            console.warn('SessionStorage quota exceeded, caching skipped:', e);
            sessionStorage.clear(); // Emergency flush
        }
    }, [searchQuery, shops, aiShops, searchedShopId, mapCenter, bookmarks]);

    const isLoggedIn = !!localStorage.getItem('token');

    // Handle incoming Map Focus state from CoffeeTalk (Merged into main location effect below to prevent race conditions)
    const fetchShopsAndBookmarks = async (lat?: number, lng?: number, filterType?: string, bounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number }, preserveTargetName?: string) => {
        if (shops.length === 0) setIsLoading(true);
        setIsRefreshing(true);
        try {
            // Fetch shops by coordinates if available
            let url = `${API_BASE}/api/shops`;
            const params = new URLSearchParams();
            if (bounds) {
                params.append('minLat', bounds.minLat.toString());
                params.append('maxLat', bounds.maxLat.toString());
                params.append('minLng', bounds.minLng.toString());
                params.append('maxLng', bounds.maxLng.toString());
            } else if (lat !== undefined && lng !== undefined) {
                params.append('lat', lat.toString());
                params.append('lng', lng.toString());
            }
            if (filterType && filterType !== 'ALL') {
                params.append('type', filterType);
            }
            
            // Add language parameter
            const currentLang = i18n.language ? i18n.language.substring(0, 2) : 'ko';
            params.append('lang', currentLang);
            
            // Add device countryCode to filter out unmatched regions when no bounds are provided
            params.append('countryCode', getDeviceCountryCode());

            if (params.toString()) {
                url += `?${params.toString()}`;
            }
            const fetchOptions: RequestInit = {};
            const token = localStorage.getItem('token');
            if (isLoggedIn && token) {
                fetchOptions.headers = { 'Authorization': `Bearer ${token}` };
            }

            const shopsRes = await fetch(url, fetchOptions);
            let fetchedShops: any[] = [];
            if (shopsRes.ok) {
                fetchedShops = await shopsRes.json();
                
                // CRITICAL FIX: If we actively navigated from CoffeeTalk, preserve the mock-injected target shop
                // otherwise the debounced bounds fetch will permanently wipe it from the UI.
                setShops(prev => {
                    let nextShops = [...fetchedShops];
                    
                    // Prevent currently focused shop from disappearing if it falls slightly out of the DB query limit
                    // or if it is a PENDING shop that was explicitly loaded via a direct /api/shops/:id fetch.
                    if (focusedShopId) {
                        const focusedShop = prev.find(s => s.id === focusedShopId);
                        if (focusedShop && !nextShops.some(s => s.id === focusedShopId)) {
                            nextShops = [focusedShop, ...nextShops];
                        }
                    }

                    if (preserveTargetName) {
                        const targetMock = prev.find(s => s.name === preserveTargetName && s.id.startsWith('target-'));
                        const backendHasIt = nextShops.some(s => s.name === preserveTargetName);
                        
                        if (targetMock && !backendHasIt) {
                            nextShops = [...nextShops, targetMock];
                        }
                    }
                    
                    return nextShops;
                });
            }

            if (isLoggedIn && bookmarks.size === 0) { // Fetch bookmarks only once
                const token = localStorage.getItem('token');
                const bmsRes = await fetch(`${API_BASE}/api/users/bookmarks`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (bmsRes.ok) {
                    const bmsData = await bmsRes.json();
                    setBookmarks(new Set(bmsData.map((b: any) => b.storeId)));
                }
            }
            
            return fetchedShops;
        } catch (err) {
            console.error('Failed to load shops', err);
            return [];
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    const [isLocating, setIsLocating] = useState(false);

    const locateUser = () => {
        setIsCourseMode(false);
        try { navigate(location.pathname, { replace: true }); } catch (e) {}
        if (!("geolocation" in navigator)) {
            alert(t('map.loc_not_supported'));
            const fallbLat = 37.5665;
            const fallbLng = 126.9780;
            setUserLocation([fallbLat, fallbLng]);
            setMapCenter([fallbLat, fallbLng]);
            sortAnchor.current = [fallbLat, fallbLng];
            setSearchQuery('');
            setSearchedShopId(null);
            fetchShopsAndBookmarks(fallbLat, fallbLng);
            fetchAiShops(`latitude ${fallbLat.toFixed(2)}, longitude ${fallbLng.toFixed(2)}`);
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
                setUserLocation(coords);
                setMapCenter(coords); // Center map on user
                sortAnchor.current = coords; // CRITICAL: Release the previous search pivot!
                activeCoffeeTalkTargetRef.current = null; // Release strict target lock
                setSearchQuery(''); // Unbind text search query visually
                setSearchedShopId(null); // Clear search highlight rings
                sessionStorage.setItem('bm_user_loc', JSON.stringify(coords));
                sessionStorage.setItem('bm_map_center', JSON.stringify(coords));
                fetchShopsAndBookmarks(coords[0], coords[1]);
                const cacheLat = coords[0].toFixed(2);
                const cacheLng = coords[1].toFixed(2);
                fetchAiShops(`latitude ${cacheLat}, longitude ${cacheLng}`);
                setIsLocating(false);
            },
            (error) => {
                console.error("Error getting location:", error);
                if (userLocation === null) {
                    // Only default to Seoul if we never had a location
                    const fallbLat = 37.5665;
                    const fallbLng = 126.9780;
                    setUserLocation([fallbLat, fallbLng]);
                    setMapCenter([fallbLat, fallbLng]);
                    sortAnchor.current = [fallbLat, fallbLng];
                    setSearchQuery('');
                    setSearchedShopId(null);
                    fetchShopsAndBookmarks(fallbLat, fallbLng);
                    fetchAiShops(`latitude ${fallbLat.toFixed(2)}, longitude ${fallbLng.toFixed(2)}`);
                }
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    };

    // Initialize Map and Read Navigation State (Only runs once)
    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        if (urlParams.get('courseId')) {
            // Priority -1: Course Loader (handled by the location.search useEffect)
            return;
        }

        const state = (location.state as any) || {};

        // Priority 0: Map Mode Override
        if (state && state.mapMode) {
            setIsCourseMode(state.mapMode === 'Course');
            navigate(location.pathname, { replace: true, state: { ...state, mapMode: undefined } });
        }

        // Priority 1: Navigation from Coffee Talk, Bookmarks or Passport (Targeted Focus)
        if (state && (state.targetShopId || (state.targetLat && state.targetLng))) {
            const targetLat = parseFloat(state.targetLat);
            const targetLng = parseFloat(state.targetLng);
            const targetName = state.targetName;

            if (targetName) {
                activeCoffeeTalkTargetRef.current = targetName;
            }
            
            if ((isNaN(targetLat) || isNaN(targetLng)) && !state.targetShopId) {
                console.warn('Target coordinates invalid and no Shop ID provided. Falling back to GPS.');
                locateUser();
                window.history.replaceState({}, document.title);
                return;
            }

            if (!isNaN(targetLat) && !isNaN(targetLng)) {
                setMapCenter([targetLat, targetLng]);
                sortAnchor.current = [targetLat, targetLng]; 
            }
            
            const initFromCoffeeTalk = async () => {
                try {
                    let fetchedShops: any[] = [];
                    if (!isNaN(targetLat) && !isNaN(targetLng)) {
                        fetchedShops = await fetchShopsAndBookmarks(targetLat, targetLng, undefined, undefined, targetName);
                    }
                    
                    let matchingShop = null;
                    if (state.targetShopId && fetchedShops && Array.isArray(fetchedShops)) {
                        matchingShop = fetchedShops.find((s: any) => s.id === state.targetShopId);
                    }
                    
                    // CRITICAL FIX: If regional fetch missed it due to cached coordinates, fetch explicitly!
                    if (!matchingShop && state.targetShopId) {
                        try {
                            const fbRes = await fetch(`${API_BASE}/api/shops/${state.targetShopId}`);
                            if (fbRes.ok) {
                                matchingShop = await fbRes.json();
                                if (matchingShop && matchingShop.lat) {
                                    setMapCenter([parseFloat(matchingShop.lat), parseFloat(matchingShop.lng)]);
                                }
                            }
                        } catch(e) {}
                    }

                    if (!matchingShop && targetName && fetchedShops && Array.isArray(fetchedShops)) {
                        matchingShop = fetchedShops.find((s: any) => s.name === targetName);
                    }
                    
                    if (matchingShop) {
                        setSearchedShopId(matchingShop.id);
                        setFocusedShopId(matchingShop.id);
                        activeCoffeeTalkTargetRef.current = null; // Found native DB match, release mock lock

                        // Prevent ScrollSpy from overwriting the pin by making this the first card!
                        setShops(prev => {
                            const matchIdx = prev.findIndex(s => s.id === matchingShop.id);
                            if (matchIdx >= 0) {
                                const copy = [...prev];
                                copy.splice(matchIdx, 1);
                                copy.unshift(matchingShop);
                                return copy;
                            } else {
                                // If it wasn't in the regional search at all, inject it directly at the top!
                                return [matchingShop, ...prev];
                            }
                        });

                        // Force browser to physically scroll to the card, mitigating any history scroll restoration bugs
                        setTimeout(() => {
                            const shopCard = document.getElementById(`feed-card-${matchingShop.id}`);
                            if (shopCard) {
                                try {
                                    shopCard.scrollIntoView({ behavior: 'auto', block: 'center' });
                                } catch (e) {
                                    try { shopCard.scrollIntoView(); } catch (err) {}
                                }
                            }
                        }, 300);
                    } else {
                        if (targetName) setSearchQuery(targetName);
                        
                        const mockId = `target-${Date.now()}`;
                        const mockShop = {
                            id: mockId,
                            name: targetName || t('map.selected_location'),
                            lat: targetLat,
                            lng: targetLng,
                            address: t('map.selected_store'),
                            status: 'ACTIVE',
                            primaryCoffeeType: 'GENERAL',
                            isGeneric: true
                        };

                        setShops(prev => {
                            if (prev.some(s => s.name === targetName)) return prev;
                            return [mockShop, ...prev]; // Ensure it is the first card so ScrollSpy locks onto it
                        });

                        setSearchedShopId(mockId);
                        setFocusedShopId(mockId);

                        setTimeout(() => {
                            const shopCard = document.getElementById(`feed-card-${mockId}`);
                            if (shopCard) {
                                try { shopCard.scrollIntoView({ behavior: 'auto', block: 'center' }); } catch(e) {}
                            }
                        }, 300);
                    }
                } catch (e) {
                    console.error("Coffee talk target initialization failed", e);
                } finally {
                    window.history.replaceState({}, document.title);
                }
            };
            
            initFromCoffeeTalk();
            return;
        }

        // Priority 2: Navigation from AI Curator
        if (state && state.autoLocateLat && state.autoLocateLng) {
            const initFromCurator = async () => {
                const lat = parseFloat(state.autoLocateLat);
                const lng = parseFloat(state.autoLocateLng);
                setUserLocation([lat, lng]);
                setMapCenter([lat, lng]);
                sortAnchor.current = [lat, lng]; 
                fetchShopsAndBookmarks(lat, lng);
                
                const cacheLat = lat.toFixed(2);
                const cacheLng = lng.toFixed(2);

                if (state.curatorShops && Array.isArray(state.curatorShops)) {
                    sessionStorage.setItem('bm_curator_shops_v3', JSON.stringify(state.curatorShops));
                    
                    const mappedShops = state.curatorShops.slice(0, 5).map((shop: any, idx: number) => ({
                        id: `ai-curator-${idx}-${Date.now()}`,
                        name: shop.name,
                        lat: parseFloat(shop.lat),
                        lng: parseFloat(shop.lng),
                        uri: shop.uri,
                        isGeneric: true
                    }));
                    setAiShops(mappedShops);
                } else {
                    setAiShops([]);
                }
                
                await fetchAiShops(`latitude ${cacheLat}, longitude ${cacheLng}`);
                window.history.replaceState({}, document.title);
            };
            initFromCurator();
            return;
        } 
        
        // Priority 3: Normal Load
        const hasSavedState = sessionStorage.getItem('bm_shops');
        if (!hasSavedState) {
            locateUser();
        }
    }, [location.state]);

    const isFirstRender = React.useRef(true);

    useEffect(() => {
        isFirstRender.current = false;
        if (isLoading && shops.length === 0) {
            const hasSavedState = sessionStorage.getItem('bm_shops');
            if (hasSavedState && JSON.parse(hasSavedState).length === 0) {
                setIsLoading(false);
            }
        }
    }, []);

    // Refetch when the map is dragged to a new center or bounds change
    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        if (isCourseMode || urlParams.get('courseId')) return; // Disable automatic background fetching while viewing a specific course route
        
        const isActiveSearch = searchQuery.trim().length > 0;
        if (mapCenter && !isFirstRender.current && !isSearching && !isLoading && !isAutoPanningRef.current && !isActiveSearch) {
            const timeoutId = setTimeout(() => {
                if (!isAutoPanningRef.current) {
                    const coffeeTalkTarget = activeCoffeeTalkTargetRef.current || undefined;
                    fetchShopsAndBookmarks(mapCenter[0], mapCenter[1], undefined, mapBounds || undefined, coffeeTalkTarget);
                }
            }, 500);
            return () => clearTimeout(timeoutId);
        }
    }, [mapCenter, mapBounds, isCourseMode, location.search]);

    // Force Curator shops to persist globally across ALL aiShops lists 
    // even during cache hits
    useEffect(() => {
        try {
            const memStr = sessionStorage.getItem('bm_curator_shops_v3');
            if (memStr && aiShops && aiShops.length > 0) {
                const curated = JSON.parse(memStr);
                if (Array.isArray(curated) && curated.length > 0) {
                    setAiShops((prev: any[]) => {
                        const curatedNames = new Set(curated.map(c => c.name.toLowerCase().replace(/\s+/g, '')));
                        
                        // 1. Remove old memory nodes and any generic nodes that share a name with curated shops
                        const filteredPrev = prev.filter(s => {
                            if (s.isMem) return false;
                            const normName = s.name.toLowerCase().replace(/\s+/g, '');
                            if (curatedNames.has(normName)) return false;
                            return true;
                        });
                        
                        // 2. Build the ideal memory shops array with guaranteed spread offsets and stable IDs
                        const idealMemShops = curated.map((cs: any, idx: number) => {
                            const latOffset = idx * 0.0002;
                            const lngOffset = (idx % 2 === 0 ? 1 : -1) * (idx * 0.0002);
                            return {
                                id: `ai-mem-global-${idx}-${cs.name.replace(/\s+/g, '')}`, // Stable UI ID to prevent React re-renders mapping churn
                                name: cs.name,
                                lat: parseFloat(cs.lat) + latOffset,
                                lng: parseFloat(cs.lng) + lngOffset,
                                uri: cs.uri,
                                isGeneric: true,
                                isMem: true
                            };
                        });
                        
                        // 3. Prevent infinite re-render loops by verifying if prev is already perfectly matching
                        // We check if the existing memory nodes exactly match the target memory nodes in count and stable ID.
                        const currentMemNodes = prev.filter(s => s.isMem);
                        let needsUpdate = false;
                        
                        if (currentMemNodes.length !== idealMemShops.length) needsUpdate = true;
                        if (!needsUpdate && prev.length !== idealMemShops.length + filteredPrev.length) needsUpdate = true;
                        if (!needsUpdate && prev.length > 0 && idealMemShops.length > 0 && prev[0].id !== idealMemShops[0].id) needsUpdate = true;
                        
                        if (!needsUpdate) return prev;
                        
                        const finalArr = [...idealMemShops, ...filteredPrev];
                        console.log("[Global Mem Hook] Overriding array. New size:", finalArr.length);
                        return finalArr;
                    });
                }
            }
        } catch (e) {
            console.warn("Global Memory Append Failed", e);
        }
    }, [aiShops]); // Run it whenever aiShops changes, the deduplication guarantees it halts

    const toggleBookmark = async (storeId: string) => {
        if (!isLoggedIn) {
            alert(t('map.login_required'));
            navigate('/profile');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/api/users/bookmarks/${storeId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const result = await response.json();
                const newBookmarks = new Set(bookmarks);
                if (result.isBookmarked) {
                    newBookmarks.add(storeId);
                } else {
                    newBookmarks.delete(storeId);
                }
                setBookmarks(newBookmarks);
            }
        } catch (err) {
            alert(t('map.bookmark_fail'));
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const query = searchQuery.trim();
        setIsCourseMode(false);
        try { navigate(location.pathname, { replace: true }); } catch (e) {}

        // If no query is entered, we just search around the current map center
        if (!query) {
            if (mapCenter) fetchShopsAndBookmarks(mapCenter[0], mapCenter[1]);
            return;
        }

        setIsSearching(true);
        activeCoffeeTalkTargetRef.current = null; // Release strict target lock
        setFocusedShopId(null); // Instantly sever the auto-pan ghost link to previous results

        // 1. Search our DB for shops matching name or bean
        let finalShops: any[] = [];
        let centerToUse = mapCenter;
        let foundTextMatch = false;
        let bboxForAi = '';

        const fetchOptions: RequestInit = {};
        const token = localStorage.getItem('token');
        if (isLoggedIn && token) {
            fetchOptions.headers = { 'Authorization': `Bearer ${token}` };
        }

        try {
            let url = `${API_BASE}/api/shops?q=${encodeURIComponent(query)}`;
            const currentLang = i18n.language ? i18n.language.substring(0, 2) : 'ko';
            url += `&lang=${currentLang}`;

            const res = await fetch(url, fetchOptions);
            if (res.ok) {
                const searchResults = await res.json();
                if (searchResults && searchResults.length > 0) {
                    finalShops = [...searchResults];
                    const firstMatch = searchResults.find((s: any) => s.lat && s.lng);
                    if (firstMatch) {
                        centerToUse = [firstMatch.lat, firstMatch.lng];
                        setSearchedShopId(firstMatch.id);
                    } else {
                        setSearchedShopId(searchResults[0].id);
                    }
                    foundTextMatch = true;
                }
            }
        } catch (err) {
            console.warn('DB search failed', err);
        }

        if (!foundTextMatch) {
            setSearchedShopId(null);
        }

        // 2. Fallback to Geocoding API for region/address search
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
            if (response.ok) {
                const results = await response.json();
                if (results && results.length > 0) {
                    let bestResult = results[0];
                    // Prioritize actual regions/neighborhoods over tiny transit stations
                    const regionLike = results.find((r: any) => 
                        (r.class === 'boundary' || r.class === 'place') && 
                        (r.type === 'administrative' || r.type === 'city' || r.type === 'suburb' || r.type === 'town' || r.type === 'borough' || r.type === 'neighbourhood')
                    );
                    
                    // Detect major transit hubs and Korean regional suffixes reliably
                    const isGeographicKeyword = /(역|동|구|시|도|군|읍|면|거리|길)$/.test(query.trim());
                    
                    const isMajorPOI = results.find((r: any) => 
                        (r.class === 'railway' && (r.type === 'station' || r.type === 'subway' || r.type === 'stop')) ||
                        (r.class === 'highway' && r.type === 'bus_stop') ||
                        (r.class === 'amenity' && r.type === 'bus_station') ||
                        (r.class === 'place' && r.type === 'square')
                    );

                    if (regionLike || isMajorPOI || isGeographicKeyword) {
                        bestResult = regionLike || isMajorPOI || results[0];
                        
                        // SMART INTENT RANKING: 
                        // If the DB captured a partial name match (e.g. query="강남역", DB="매머드커피 강남역점"),
                        // but OSM explicitly confirms "강남역" is a major geographic place or subway station,
                        // DEMOTE the DB match and prioritize the region UNLESS the cafe name is literally exactly "강남역".
                        if (foundTextMatch && finalShops.length > 0) {
                            const topDbName = finalShops[0].name.toLowerCase().replace(/\s+/g, '');
                            const normalizedQuery = query.toLowerCase().replace(/\s+/g, '');
                            
                            if (topDbName !== normalizedQuery) {
                                foundTextMatch = false; // Demote DB priority
                                setSearchedShopId(null);
                                // Intentionally retained finalShops (Do not flush!)
                                // This preserves DB items matched purely by text or PII address that lack valid 
                                // geographic latitude/longitudes to be found by the subsequent BBOX query.
                            }
                        }

                        if (!foundTextMatch) {
                            // Clear any misleading "Searched Store" red pin that might have survived
                            setSearchedShopId(null);
                        }
                    }

                    const lat = parseFloat(bestResult.lat);
                    const lng = parseFloat(bestResult.lon);
                    // OpenStreetMap provides 'boundingbox': [minLat, maxLat, minLon, maxLon]
                    let bboxParams = '';
                    if (bestResult.boundingbox) {
                        let minLat = parseFloat(bestResult.boundingbox[0]);
                        let maxLat = parseFloat(bestResult.boundingbox[1]);
                        let minLon = parseFloat(bestResult.boundingbox[2]);
                        let maxLon = parseFloat(bestResult.boundingbox[3]);
                        
                        // PAD THE BOUNDING BOX BY 0.009 DEGREES (~1km)
                        // Adjusted to strictly confine the search viewport to a 1km radius as requested by user.
                        const pad = 0.009;
                        minLat -= pad;
                        maxLat += pad;
                        minLon -= pad;
                        maxLon += pad;

                        // CLAMP MAXIMUM SPAN (approx 2.2km)
                        // Prevents huge province/city searches (like "Seoul") from zooming out into outer space
                        // Keeps the zoom explicitly tight to local bounds.
                        const maxSpan = 0.02;
                        if (maxLat - minLat > maxSpan) {
                            minLat = lat - maxSpan / 2;
                            maxLat = lat + maxSpan / 2;
                        }
                        if (maxLon - minLon > maxSpan) {
                            minLon = lng - maxSpan / 2;
                            maxLon = lng + maxSpan / 2;
                        }
                        
                        bboxParams = `&minLat=${minLat}&maxLat=${maxLat}&minLng=${minLon}&maxLng=${maxLon}`;
                        bboxForAi = `Latitude between ${minLat} and ${maxLat}, Longitude between ${minLon} and ${maxLon}`;
                        
                        setMapBoundsToFit({ minLat, maxLat, minLng: minLon, maxLng: maxLon, ts: Date.now() });
                    }
                    
                    if (!foundTextMatch) {
                        centerToUse = [lat, lng];
                        // NEW: Inject a mock anchor marker for the searched region to visually guide the user
                        const mockId = `target-region-${Date.now()}`;
                        const displayName = bestResult.name || (bestResult.display_name ? bestResult.display_name.split(',')[0] : query);
                        const mockShop = {
                            id: mockId,
                            name: displayName,
                            lat: lat,
                            lng: lng,
                            address: bestResult.display_name,
                            status: 'ACTIVE',
                            primaryCoffeeType: 'GENERAL',
                            isGeneric: true
                        };
                        finalShops.push(mockShop);
                        setSearchedShopId(mockId);
                    }

                    // Fetch regional shops by Bounding Box (Do not pass regionQuery to prevent strict address string filtering conflicts)
                    let regionUrl = `${API_BASE}/api/shops?lat=${lat}&lng=${lng}${bboxParams}`;
                    const currentLang = i18n.language ? i18n.language.substring(0, 2) : 'ko';
                    regionUrl += `&lang=${currentLang}`;

                    const regionRes = await fetch(regionUrl, fetchOptions);
                    if (regionRes.ok) {
                        const regionShops = await regionRes.json();
                        const existingIds = new Set(finalShops.map((s: any) => s.id));
                        for (const rs of regionShops) {
                            if (!existingIds.has(rs.id)) {
                                finalShops.push(rs);
                                existingIds.add(rs.id);
                            }
                        }
                    }
                } else if (!foundTextMatch) {
                    // Don't alert here yet, wait for AI to try.
                }
            }
        } catch (err: any) {
            console.error('Geocoding search failed:', err);
            // DEBUG ALERT for Android network policies
            alert(t('map.error_region_fetch') + err.message);
        } finally {
            setShops(finalShops); // Clear previous shops if none found, or display new ones
            setMapCenter(centerToUse);
            sortAnchor.current = centerToUse; // Update the stable sort anchor on active search!
            // DO NOT immediately fire mapBounds effect; let the animation end via SharedCoffeeMap pan bounds.
            
            // Always trigger AI search for the region even if local DB returned 0 shops.
            // If OSM failed too, centerToUse relies on the AI reverse-centering.
            const isOsmFailure = !foundTextMatch && centerToUse === mapCenter;
            fetchAiShops(query, bboxForAi, isOsmFailure, centerToUse);
            
            setIsSearching(false);
        }
    };

    const fetchAiShops = async (region: string, bbox?: string, forceCenterMap?: boolean, targetCenter?: [number, number]) => {
        if (!isAiAutoExtractRef.current) return;

        const cacheKey = region.trim().toLowerCase() + (bbox ? `_bbox` : '');
        if (aiShopCache[cacheKey]) {
            setAiShops(prev => {
                const existingIds = new Set(prev.map(s => s.id));
                const newShops = aiShopCache[cacheKey].filter(s => !existingIds.has(s.id));
                return [...prev, ...newShops];
            });
            return;
        }

        try {
            const promptStr = `List up to 30 specialty coffee shops ${queryContext}. Maximize the number of results up to 30.`;

            const mapsResponse = await fetch(`${API_BASE}/api/ai-features/map-shops`, {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ promptStr })
            });
            
            if (!mapsResponse.ok) throw new Error("Backend Map API Failed");
            
            const mapData = await mapsResponse.json();
            const parsedData = mapData.shops || [];
            const chunks = mapData.chunks;

            const genericShops: any[] = [];
            
            if (Array.isArray(parsedData)) {
                parsedData.forEach((shop, idx) => {
                    if (!shop || !shop.name) return;
                    
                    let finalLat = shop.lat !== undefined ? shop.lat : shop.latitude;
                    let finalLng = shop.lng !== undefined ? shop.lng : shop.longitude;
                    
                    // Gemini frequently omits coordinates to save tokens when listing 30 shops.
                    // If coordinates are missing, fallback to the target text-search location, then map center.
                    if (finalLat === undefined || isNaN(parseFloat(finalLat))) {
                        finalLat = targetCenter ? targetCenter[0] : (mapCenter ? mapCenter[0] : 37.5665);
                    }
                    if (finalLng === undefined || isNaN(parseFloat(finalLng))) {
                        finalLng = targetCenter ? targetCenter[1] : (mapCenter ? mapCenter[1] : 126.9780);
                    }

                    let uri = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.name)}`;
                    if (chunks) {
                        const matchChunk = chunks.find((c: any) => c.maps && (shop.name.toLowerCase().includes(c.maps.title.toLowerCase()) || c.maps.title.toLowerCase().includes(shop.name.toLowerCase())));
                        if (matchChunk) uri = matchChunk.maps.uri;
                    }

                    // Prevent marker stacking: If Gemini returned identical coordinates for all regional shops, add a micro-offset
                    // Use a very tight grid (0.0003 degrees ≈ 30m) to escape DB pin shadows without flying into oceans/rivers
                    const latOffset = (idx % 5) * 0.0003 * (idx % 2 === 0 ? 1 : -1);
                    const lngOffset = Math.floor(idx / 5) * 0.0003 * (idx % 3 === 0 ? 1 : -1);

                    genericShops.push({ 
                        id: `ai-${idx}-${Date.now()}`, 
                        name: shop.name, 
                        lat: parseFloat(finalLat) + latOffset, 
                        lng: parseFloat(finalLng) + lngOffset, 
                        uri, 
                        isGeneric: true 
                    });
                });
            }
            
            // Reverse-Centering Fallback: If DB didn't find the location but AI did, move map to first AI pin
            if (forceCenterMap && genericShops.length > 0) {
                setMapCenter([genericShops[0].lat, genericShops[0].lng]);
            } else if (forceCenterMap && genericShops.length === 0) {
                alert(t('map.search_no_result'));
            }
            
            // Ensure duplicate pins aren't appended if we simply panned the map slightly
            setAiShops((prev) => {
                const existingIds = new Set(prev.map(s => s.id));
                const newShops = genericShops.filter(s => !existingIds.has(s.id));
                const combined = [...prev, ...newShops];
                
                // Save ONLY the pure generic shops to the persistent cache dictionary, 
                // NOT the combined UI state which might include transient Curator pins!
                aiShopCache[cacheKey] = genericShops;
                sessionStorage.setItem('bm_ai_cache_dict_v2', JSON.stringify(aiShopCache));
                
                return combined;
            });
        } catch (error) {
            console.error("AI Maps Search Error:", error);
        } finally {
            setIsAiLoading(false); // End loading UX
        }
    };

    // Consistent mock coordinate generator based on shop ID (Centered around Seoul: 37.5665, 126.9780)
    const getShopCoordinates = (id: string, index: number) => {
        // Simple hash to create a pseudo-random but consistent offset
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            hash = id.charCodeAt(i) + ((hash << 5) - hash);
        }
        const latOffset = (hash % 100) * 0.001;
        const lngOffset = ((hash >> 3) % 100) * 0.001;

        return [37.5665 + latOffset - 0.05, 126.9780 + lngOffset - 0.05] as [number, number];
    };

    const checkDbClaimed = (shop: any) => {
        if (shop.isGeneric) return false;
        const isUnclaimed = !shop.mainImageUrl && !shop.markerImageUrl && (!shop.media || shop.media.length === 0);
        return !isUnclaimed;
    };

    const displayShops = sourceFilter === 'AI' ? [] : [...shops].sort((a, b) => {
        const aClaimed = checkDbClaimed(a);
        const bClaimed = checkDbClaimed(b);
        if (aClaimed && !bClaimed) return -1;
        if (!aClaimed && bClaimed) return 1;
        return 0; // maintain original relative order (e.g. distance)
    });
    const displayAiShops = sourceFilter === 'DB' ? [] : aiShops;

    // Deduplicate: Hide transient AI Search pins (blue) if a permanent DB pin (red) already exists with a similar name
    const normalizedDbNames = displayShops.map(s => (s.name || '').replace(/\s+/g, '').toLowerCase());
    const filteredAiShops = displayAiShops.filter(aiShop => {
        const aiName = (aiShop.name || '').replace(/\s+/g, '').toLowerCase();
        if (!aiName) return false;
        // If the AI name is a substring of a DB name, or a DB name is a substring of the AI name, treat as duplicate
        const isDuplicate = normalizedDbNames.some(dbName => dbName.includes(aiName) || aiName.includes(dbName));
        return !isDuplicate;
    });

    let combinedShops = [...displayShops, ...filteredAiShops];

    // Restrict feed strictly to 10km radius if a search anchor exists
    if (sortAnchor.current && !isCourseMode) {
        const pivot = sortAnchor.current;
        combinedShops = combinedShops.filter(shop => {
            const lat = typeof shop.lat === 'number' ? shop.lat : parseFloat(shop.lat as any) || 0;
            const lng = typeof shop.lng === 'number' ? shop.lng : parseFloat(shop.lng as any) || 0;
            // AMNESTY FIX:
            // Crucial patch for newly registered Host shops that lack valid geographic coordinates (lat/lng = null).
            // If we return `false` here, they permanently disappear from the Map whenever Curator enforces a strict 10km anchor.
            // By returning `true`, we grant them amnesty, passing them to the SharedCoffeeMap renderer
            // which handles coordinate-less shops by automatically projecting their pins via randomized hash offsets around the user's focus center.
            if (!lat || !lng) return true; 
            return getDistanceFromLatLonInKm(pivot[0], pivot[1], lat, lng) <= 10;
        });
    }

    if (curatorPickOnly && !isCourseMode) {
        combinedShops = combinedShops.filter(s => (s.matchRate != null && s.matchRate >= 80) || s.isMem === true);
    }

    // Prevent background scrolling when detail modal or source filter is open map side
    useEffect(() => {
        if (isDetailModalOpen) {
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = 'auto'; };
        }
    }, [isDetailModalOpen]);

    const handleForkCourse = async () => {
        if (!activeCourseConfig) return;
        if (!isLoggedIn) {
            alert('코스 가져오기는 로그인 후 이용할 수 있습니다.');
            return;
        }
        
        setIsForking(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/community/courses/${activeCourseConfig.id}/fork`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                const newForkeds = [...forkedCourseIds, activeCourseConfig.id];
                setForkedCourseIds(newForkeds);
                localStorage.setItem('bm_forked_courses', JSON.stringify(newForkeds));
                alert('내 성지 여권으로 코스를 성공적으로 가져왔습니다!');
            } else {
                const data = await res.json();
                alert(data.error || '코스 가져오기에 실패했습니다.');
            }
        } catch (e) {
            console.error(e);
            alert('네트워크 오류가 발생했습니다.');
        } finally {
            setIsForking(false);
        }
    };

    const handleMapClick = (lat: number, lng: number) => {
        setIsCourseMode(false);
        setIsSearching(true);
        setSearchQuery('');
        setMapCenter([lat, lng]);
        sortAnchor.current = [lat, lng];

        const mockId = `target-region-${Date.now()}`;
        const mockShop = {
            id: mockId,
            name: t('shared_map.lbl_search_center', '검색 중심'),
            lat: lat,
            lng: lng,
            address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            status: 'ACTIVE',
            primaryCoffeeType: 'GENERAL',
            isGeneric: true
        };
        
        fetchShopsAndBookmarks(lat, lng).then(fetched => {
            const hasMock = fetched.some((s: any) => s.id === mockId);
            if (!hasMock) {
                setShops([...fetched, mockShop]);
            } else {
                setShops(fetched);
            }
            setSearchedShopId(mockId);
            setIsSearching(false);
        });

        fetchAiShops(`latitude ${lat.toFixed(4)}, longitude ${lng.toFixed(4)}`, undefined, false, [lat, lng]);
    };

    return (
        <ErrorBoundary>
        <div className="h-[100dvh] flex flex-col pt-safe-top pb-[80px] sm:pb-0 overflow-hidden bg-[#0d0d0f] font-sans absolute inset-0 w-full" style={{ touchAction: 'none' }}>
            <header className="px-6 pb-4 pt-safe flex flex-col bg-[#121215] border-b border-white/10 shrink-0 sticky top-0 z-[50] gap-4 shadow-xl shadow-black/40">
                <div className="flex items-center justify-between">
                    <h1 className="font-serif font-bold text-2xl text-espresso-50 tracking-tight">{t('map.title')}</h1>
                </div>
                
                <div className="flex gap-2 relative z-[60]">
                    <form onSubmit={handleSearch} className="relative flex-1">
                        <Search className="absolute left-[14px] top-1/2 -translate-y-1/2 text-espresso-300 pointer-events-none z-10" size={18} />
                        <input
                            type="search"
                            enterKeyHint="search"
                            autoComplete="off"
                            placeholder={t('map.search_ph')}
                            className={`w-full bg-[#1c1c21] border border-white/10 text-espresso-50 placeholder:text-espresso-400 h-11 pl-10 ${searchQuery.length > 0 || isSearching ? 'pr-10' : 'pr-4'} rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none text-[13px] font-medium appearance-none shadow-inner block relative pointer-events-auto`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onCompositionStart={() => setIsComposing(true)}
                            onCompositionEnd={() => setIsComposing(false)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !isComposing) {
                                    handleSearch(e);
                                }
                            }}
                            style={{ WebkitAppearance: 'none', caretColor: '#1e3a8a' }} 
                        />
                        {isSearching ? (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-500"></div>
                            </div>
                        ) : searchQuery.length > 0 && (
                            <button 
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setSearchQuery('');
                                    locateUser();
                                }}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-espresso-400 hover:text-amber-500 transition-colors p-1 bg-espresso-800/50 rounded-full"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </form>
                    
                    <button 
                        onClick={() => {
                            if (!isLoggedIn) {
                                alert(t('map.login_required'));
                                navigate('/profile');
                                return;
                            }
                            setCuratorPickOnly(!curatorPickOnly);
                        }}
                        className={`px-3 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 font-bold text-[12px] whitespace-nowrap gap-1.5 shadow-sm ${curatorPickOnly ? 'bg-rose-500/10 border-rose-500/50 text-rose-400' : 'bg-[#1c1c21] border-white/10 text-espresso-200 hover:text-espresso-50 hover:border-white/20'}`}
                    >
                        <Heart size={14} className={curatorPickOnly ? 'fill-rose-500 text-rose-500' : 'text-espresso-400'} />
                        80%+ Match
                    </button>
                    
                    <button 
                        onClick={() => setIsSourceFilterOpen(!isSourceFilterOpen)}
                        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-colors shadow-sm ${isSourceFilterOpen || sourceFilter !== 'ALL' ? 'bg-amber-900/40 border-amber-600/50 text-amber-500' : 'bg-[#1c1c21] border-white/10 text-espresso-200 hover:text-espresso-50 hover:border-white/20'}`}
                    >
                        <SlidersHorizontal size={18} />
                    </button>
                    
                    <AnimatePresence>
                        {isSourceFilterOpen && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="absolute right-0 top-14 w-48 bg-[#1f1f23] border border-espresso-600/50 rounded-xl shadow-2xl z-[100] py-1 flex flex-col overflow-hidden"
                            >
                                <button onClick={() => { setSourceFilter('ALL'); setIsSourceFilterOpen(false); }} className={`px-4 py-3 text-left text-sm font-medium hover:bg-espresso-800 ${sourceFilter === 'ALL' ? 'text-amber-500' : 'text-espresso-50'}`}>{t('map.filter_all')}</button>
                                <button onClick={() => { setSourceFilter('DB'); setIsSourceFilterOpen(false); }} className={`px-4 py-3 text-left text-sm font-medium hover:bg-espresso-800 border-t border-espresso-700 ${sourceFilter === 'DB' ? 'text-amber-500' : 'text-espresso-50'}`}>{t('map.filter_db')}</button>
                                <button onClick={() => { setSourceFilter('AI'); setIsSourceFilterOpen(false); }} className={`px-4 py-3 text-left text-sm font-medium hover:bg-espresso-800 border-t border-espresso-700 ${sourceFilter === 'AI' ? 'text-amber-500' : 'text-espresso-50'}`}>{t('map.filter_ai')}</button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </header>

            <div className={`flex-1 relative overflow-hidden block bg-espresso-950 transition-none`}>
                {/* 1. Map Section */}
                <div className={`absolute inset-0 z-0 bg-espresso-950`}>
                    <SharedCoffeeMap
                        mode="explore"
                        shops={combinedShops}
                        courseShops={activeCourseConfig?.items?.map((i: any) => i.store).filter(Boolean)}
                        userLocation={userLocation}
                        mapCenter={mapCenter}
                        setMapCenter={setMapCenter}
                        setMapBounds={setMapBounds}
                        boundsToFit={mapBoundsToFit}
                        searchedShopId={searchedShopId}
                        focusedShopId={focusedShopId}
                        isRefreshing={isRefreshing}
                        mapAds={mapAds}
                        bottomPadding={isCourseMode ? '10.5rem' : (focusedShopId && combinedShops.find(s => s.id === focusedShopId) ? '10.5rem' : '3.5rem')}
                        onShopClick={(shop) => { 
                            if (isCourseMode) {
                                setSelectedShop(shop);
                                setIsDetailModalOpen(true);
                            } else {
                                setFocusedShopId(shop.id);
                            }
                        }}
                        onPopupClick={(shop) => {
                            setSelectedShop(shop);
                            setIsDetailModalOpen(true);
                        }}
                        onBookmarkToggle={toggleBookmark}
                        bookmarkedIds={bookmarks}
                        onLocateMe={locateUser}
                        isLocating={isLocating}
                        isCourseMode={isCourseMode}
                        onMapClick={handleMapClick}
                    />

                    {/* Floating AI Auto Extract Toggle Button */}
                    {!isCourseMode && (
                        <button
                            onClick={() => setIsAiAutoExtractEnabled(prev => !prev)}
                            title={isAiAutoExtractEnabled ? t('map.disable_ai_auto', 'AI 자동 추출 끄기') : t('map.enable_ai_auto', 'AI 자동 추출 켜기')}
                            className={`absolute right-4 z-[400] w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
                                isAiAutoExtractEnabled 
                                    ? 'bg-amber-500 text-espresso-950 shadow-amber-500/30' 
                                    : 'bg-espresso-900 text-amber-500/50 border border-espresso-700/80 hover:text-amber-500/80'
                            }`}
                            style={{ bottom: `calc(${focusedShopId && combinedShops.find(s => s.id === focusedShopId) ? '10.5rem' : '3.5rem'} + 3.5rem)` }}
                        >
                            <Sparkles size={22} className={isAiAutoExtractEnabled ? "animate-pulse" : ""} strokeWidth={2} />
                        </button>
                    )}
                    
                    {/* Floating AI Loading Indicator */}
                    <AnimatePresence>
                        {isAiLoading && (
                            <motion.div 
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="absolute top-4 left-4 z-[1000] flex justify-center pointer-events-none"
                            >
                                <div className="bg-espresso-900/90 backdrop-blur-md text-amber-500 border border-espresso-700/80 px-4 py-3 rounded-full flex items-center gap-2 shadow-xl shadow-black/40 overflow-hidden max-w-full">
                                    <div className="flex gap-1 shrink-0">
                                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce"></span>
                                    </div>
                                    <span className="font-bold text-[12px] sm:text-[13px] tracking-tight truncate whitespace-nowrap">{t('map.ai_extracting')}</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Active Course Shared Banner Overlay */}
                    <AnimatePresence>
                        {isCourseMode && activeCourseConfig && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                className="absolute bottom-6 left-4 right-4 z-[1000] pointer-events-auto"
                            >
                                <div className="bg-espresso-950/90 backdrop-blur-xl border border-amber-500/50 rounded-2xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex flex-col gap-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">{t('map.badge_user_shared_course')}</span>
                                            </div>
                                            <h3 className="font-bold text-espresso-50 text-[16px] truncate leading-tight">{activeCourseConfig.name}</h3>
                                            <p className="text-[12px] text-espresso-300 truncate mt-0.5">by <b>{activeCourseConfig.user?.nickname || t('map.lbl_anonymous')}</b></p>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                navigate(location.pathname, { replace: true });
                                                locateUser();
                                            }}
                                            className="w-8 h-8 rounded-full bg-espresso-900 border border-espresso-700 flex items-center justify-center text-espresso-300 hover:text-espresso-50 transition-colors shrink-0"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                    
                                    {(!isLoggedIn || (activeCourseConfig.userId !== (() => {
                                        try {
                                            const t = localStorage.getItem('token');
                                            return t ? JSON.parse(atob(t.split('.')[1])).id : null;
                                        } catch { return null; }
                                    })() && !forkedCourseIds.includes(activeCourseConfig.id))) && (
                                        <button 
                                            onClick={handleForkCourse}
                                            disabled={isForking}
                                            className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-espresso-950 font-black text-[13px] rounded-xl transition-colors shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
                                        >
                                            {isForking ? (
                                                <div className="w-4 h-4 border-2 border-espresso-950 border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <><Heart size={16} fill="currentColor" className="text-rose-500" /> {t('map.btn_save_my_route')}</>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <AnimatePresence>
                        {isAiLoading && (
                            <motion.div 
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="absolute top-4 left-4 z-[1000] flex justify-center pointer-events-none"
                            >
                                <div className="bg-espresso-900/90 backdrop-blur-md text-amber-500 border border-espresso-700/80 px-4 py-3 rounded-full flex items-center gap-2 shadow-xl shadow-black/40 overflow-hidden max-w-full">
                                    <div className="flex gap-1 shrink-0">
                                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce"></span>
                                    </div>
                                    <span className="font-bold text-[12px] sm:text-[13px] tracking-tight truncate whitespace-nowrap">{t('map.ai_extracting')}</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* 2. Smart Bottom Panel (Selected Shop Summary) */}
                {!isCourseMode && (
                <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none pb-safe">
                    <div className="px-4 pb-4">
                        <AnimatePresence mode="wait">
                            {focusedShopId && combinedShops.find(s => s.id === focusedShopId) ? (() => {
                                const shop = combinedShops.find(s => s.id === focusedShopId)!;
                                const isBookmarked = bookmarks.has(shop.id);
                                let parsedMainImageUrl = shop.mainImageUrl;
                                if (typeof parsedMainImageUrl === 'string' && parsedMainImageUrl.startsWith('[')) {
                                    try { const parsed = JSON.parse(parsedMainImageUrl); if (Array.isArray(parsed) && parsed.length > 0) parsedMainImageUrl = parsed[0]; } catch (e) {}
                                }
                                const fallbackMedia = shop.media?.find((m: any) => m.type === 'IMAGE' || m.type === 'VIDEO');
                                const fallbackSrc = fallbackMedia ? fallbackMedia.url : 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80&w=800';
                                const mainImageSrc = parsedMainImageUrl || fallbackSrc;
                                const tags = [shop.shortDesc || "Specialty", shop.primaryCoffeeType, shop.isGeneric ? "Google Maps" : "Beanmind Partner"]
                                    .filter(t => t && t !== 'GENERAL')
                                    .map(tagStr => typeof tagStr === 'string' && tagStr.includes('AI가 발굴한') ? t('shared_map.ai_discovered_shop', 'AI가 발굴한 카페/명소') : tagStr);

                                return (
                                    <motion.div
                                        key={`panel-${shop.id}`}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 20 }}
                                        transition={{ duration: 0.3 }}
                                        className="pointer-events-auto bg-[#1a1a1f] border border-espresso-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col w-full max-w-md mx-auto md:mx-0 md:ml-4 relative cursor-pointer active:scale-[0.98] transition-transform"
                                        onClick={() => { setSelectedShop(shop); setIsDetailModalOpen(true); }}
                                    >
                                        <div className="flex items-center p-3 gap-3">
                                            {/* Thumbnail & Rating */}
                                            <div className="flex flex-col items-center gap-1.5 shrink-0">
                                                <div className="w-14 h-14 rounded-full overflow-hidden border border-espresso-700/50 bg-espresso-900 relative">
                                                    {(typeof mainImageSrc === 'string' && (mainImageSrc.toLowerCase().endsWith('.mp4') || mainImageSrc.toLowerCase().endsWith('.mov'))) ? (
                                                        <video src={getFullImageUrl(mainImageSrc)} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                                                    ) : (
                                                        <img src={getFullImageUrl(mainImageSrc as string)} alt={shop.name} className="w-full h-full object-cover" />
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-center">
                                                    {(shop.reviewCount ?? 0) > 0 ? (
                                                        <span className="text-amber-500 font-bold text-[11px]">★ {shop.averageRating?.toFixed(1) || '0.0'}</span>
                                                    ) : (
                                                        <span className="text-amber-600/80 border border-amber-600/30 bg-amber-600/5 px-1 rounded text-[10px]">{t('map.new_store')}</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Info & Match Rate */}
                                            <div className="flex-1 min-w-0 flex items-stretch">
                                                {/* Info (Left) */}
                                                <div className="flex-1 min-w-0 flex flex-col justify-center pr-2">
                                                    <div className="flex items-center justify-between mb-0.5 gap-2">
                                                        <div className="flex items-center min-w-0 gap-1">
                                                            <h3 className="font-sans font-bold text-espresso-50 text-[15px] truncate">{shop.name}</h3>
                                                            {!shop.isGeneric && (
                                                                <BadgeCheck size={16} className="text-amber-500 shrink-0" strokeWidth={2.5} />
                                                            )}
                                                        </div>
                                                        <button onClick={(e) => { e.stopPropagation(); toggleBookmark(shop.id); }} className={`p-1 -mr-1 transition-transform active:scale-90 ${isBookmarked ? 'text-rose-500' : 'text-espresso-400'}`}>
                                                            <Heart size={16} fill={isBookmarked ? "currentColor" : "none"} strokeWidth={2} />
                                                        </button>
                                                    </div>
                                                    
                                                    {(!shop.isGeneric && (shop.signatureBean || shop.signatureMenu || shop.dessertPairing)) ? (
                                                        <div className="flex flex-col gap-1.5 mt-1">
                                                            {(shop.signatureBean || shop.signatureMenu) && (
                                                                <div className="flex flex-col gap-1.5 text-[11.5px] text-espresso-200">
                                                                    {shop.signatureBean && (
                                                                        <div className="flex items-start gap-2 min-w-0">
                                                                            <Bean size={14} className="text-amber-500 shrink-0 mt-[1.5px]" strokeWidth={2.5} />
                                                                            <span className="leading-snug">{shop.signatureBean === '스페셜티/시그니처 향미' ? t('map.fallback_specialty', '스페셜티/시그니처 향미') : shop.signatureBean}</span>
                                                                        </div>
                                                                    )}
                                                                    {shop.signatureMenu && (
                                                                        <div className="flex items-start gap-2 min-w-0">
                                                                            <Coffee size={14} className="text-amber-500 shrink-0 mt-[1.5px]" strokeWidth={2.5} />
                                                                            <span className="leading-snug">{shop.signatureMenu === '대표 메뉴 (상세 미정)' ? t('map.fallback_menu', '대표 메뉴 (상세 미정)') : shop.signatureMenu}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {shop.dessertPairing && (
                                                                <div className="flex items-start gap-2 text-[11.5px] text-espresso-200 min-w-0 mt-0.5">
                                                                    <CakeSlice size={14} className="text-amber-500 shrink-0 mt-[1.5px]" strokeWidth={2.5} />
                                                                    <span className="leading-snug">{shop.dessertPairing === '추천 정보 없음' ? t('map.fallback_pairing', '추천 정보 없음') : shop.dessertPairing}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        // Fallback for generic or empty shops
                                                        <div className="mt-0.5 flex flex-col gap-1 relative">
                                                            <p className="text-[11px] text-espresso-400 italic line-clamp-2">
                                                                "{shop.aiSummary || shop.recentReview || (shop.reviews && shop.reviews[0]?.comment) || (shop.isGeneric ? t('map.ai_generic_desc', 'AI 추천 스페셜티 샵') : t('map.partner_desc', '빈마인드 공식 매장'))}"
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Match Rate (Right) */}
                                                <div className="flex flex-col items-center justify-center pl-3 ml-1 shrink-0 border-l border-espresso-800/50 min-w-[56px] relative">
                                                    <div className="flex flex-col items-center">
                                                        <div className="text-[9px] text-amber-500/70 font-bold uppercase tracking-widest mb-0.5">Match</div>
                                                        {shop.matchRate != null && shop.matchRate > 0 ? (
                                                            <div className="text-xl font-black text-amber-400 leading-none tracking-tighter">
                                                                {shop.matchRate}<span className="text-[10px] text-amber-500/80 ml-[1px]">%</span>
                                                            </div>
                                                        ) : (
                                                            <div className="text-xl font-black text-espresso-600 leading-none tracking-tighter mt-1">
                                                                -<span className="text-[10px] text-espresso-600/80 ml-[1px]">%</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })() : (
                                <motion.div
                                    key="panel-empty"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="pointer-events-auto bg-[#121215]/90 backdrop-blur-md border border-espresso-800/50 rounded-full px-5 py-2.5 shadow-lg flex items-center justify-between w-max mx-auto md:mx-0 md:ml-6"
                                >
                                    <span className="text-[12px] font-medium text-espresso-200">
                                        {combinedShops.length > 0 
                                            ? t('map.msg_found_shops', '주변 매장 {{count}}곳 발견됨', { count: combinedShops.length })
                                            : t('map.msg_no_shops', '이 지역에는 등록된 매장이 없습니다.')}
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
                )}
            </div>

            {/* Render the Shop Detail Modal */}
            <ShopDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => { setIsDetailModalOpen(false); setSelectedShop(null); }}
                shop={selectedShop}
            />
        </div>
        </ErrorBoundary>
    );
}
