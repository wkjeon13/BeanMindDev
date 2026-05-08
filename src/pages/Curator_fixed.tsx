import { Coffee, Droplet, Pill, Beaker, ChevronRight, ChevronLeft, MapPin, Zap, ExternalLink, RefreshCw, Wind, Droplets, Flame, Search, Info, Save, Sunrise, Sun, Sunset, Moon, CloudRain, Cloud, Snowflake, ThermometerSun, ThermometerSnowflake, BatteryWarning, Brain, Sparkles, CheckCircle2, HeartPulse, Leaf, Activity, Stethoscope, Trophy, Flower2, Citrus, Cherry, Apple, CloudFog, Sprout, Music, Headphones, Mic2, Guitar, Radio, Tv, Speaker, Volume2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import { UserPreferences, CoffeeBean, Brand } from '../types';
import { COFFEE_BEANS, BRANDS } from '../data/coffeeData';
import SharedCoffeeMap from '../components/SharedCoffeeMap';
import GlobalAdBanner from '../components/GlobalAdBanner';
import NativeAdBanner from '../components/NativeAdBanner';
import { API_BASE, handleApiError } from '../utils/apiConfig';
import { useTranslation } from 'react-i18next';

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

const loadSave = <T,>(key: string, fallback: T): T => {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : fallback;
  } catch { return fallback; }
}

const safeGetSession = () => { try { return !!localStorage.getItem('token'); } catch { return false; } };

export default function App() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isLoggedIn = safeGetSession();
  const [step, setStep] = useState<number>(() => {
    try {
      const savedStep = localStorage.getItem('coffee_step');
      return savedStep ? parseInt(savedStep, 10) : 0;
    } catch {
      return 0;
    }
  });
  const [direction, setDirection] = useState(0); // 1: forward, -1: backward
  const [prefs, setPrefs] = useState<UserPreferences>(() => loadSave('coffee_prefs', {
    base: 'Drip',
    caffeine: 'Regular',
    equipment: 'Hand Drip',
    flavorNotes: [],
    tasteAcidity: 3,
    tasteSweetness: 3,
    tasteBitterness: 3,
    tasteBody: 3,
    season: 'Spring',
    timeOfDay: 'Night',
    condition: 'Relaxed',
    weather: 'Sunny',
    healthStatus: 'None',
    musicGenre: 'Any'
  }));
  const [recommendation, setRecommendation] = useState<{ bean: CoffeeBean; brand: Brand } | null>(() => loadSave('coffee_rec', null));
  const [subRecommendations, setSubRecommendations] = useState<{ bean: CoffeeBean; brand: Brand }[]>(() => loadSave('coffee_sub_rec', []));
  const [aiExplanation, setAiExplanation] = useState<string>(() => loadSave('coffee_exp', ""));
  const [nearbyShops, setNearbyShops] = useState<any[]>(() => loadSave('coffee_shops', []));
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(() => loadSave('coffee_loc', null));
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMapLoading, setIsMapLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [showLimitWarning, setShowLimitWarning] = useState(false);
  const [hideLimitWarningNextTime, setHideLimitWarningNextTime] = useState(false);
  const [prescriptionTitle, setPrescriptionTitle] = useState('');
  const [curationAd, setCurationAd] = useState<any>(() => loadSave('coffee_ad', null));
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-save logic for mobile persistence
  useEffect(() => {
    localStorage.setItem('coffee_step', JSON.stringify(step));
    localStorage.setItem('coffee_prefs', JSON.stringify(prefs));
    localStorage.setItem('coffee_rec', JSON.stringify(recommendation));
    localStorage.setItem('coffee_sub_rec', JSON.stringify(subRecommendations));
    localStorage.setItem('coffee_exp', JSON.stringify(aiExplanation));
    localStorage.setItem('coffee_shops', JSON.stringify(nearbyShops));
    localStorage.setItem('coffee_loc', JSON.stringify(userLocation));
    localStorage.setItem('coffee_ad', JSON.stringify(curationAd));
  }, [step, prefs, recommendation, subRecommendations, aiExplanation, nearbyShops, userLocation, curationAd]);

  // Auto-scroll to top when step changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [step]);

  // Auto-detect context on mount
  useEffect(() => {
    if (step > 0) return; // Only auto-detect if starting fresh

    const now = new Date();
    const month = now.getMonth();
    const hour = now.getHours();

    let detectedSeason: UserPreferences['season'] = 'Spring';
    if (month >= 2 && month <= 4) detectedSeason = 'Spring';
    else if (month >= 5 && month <= 7) detectedSeason = 'Summer';
    else if (month >= 8 && month <= 10) detectedSeason = 'Autumn';
    else detectedSeason = 'Winter';

    let detectedTime: UserPreferences['timeOfDay'] = 'Morning';
    if (hour >= 5 && hour < 12) detectedTime = 'Morning';
    else if (hour >= 12 && hour < 17) detectedTime = 'Afternoon';
    else if (hour >= 17 && hour < 21) detectedTime = 'Evening';
    else detectedTime = 'Night';

    setPrefs(prev => ({
      ...prev,
      season: detectedSeason,
      timeOfDay: detectedTime
    }));
  }, []);

  // Hydrate latest prescription on login OR restore anonymous prescription
  useEffect(() => {
    const checkSync = async () => {
      const needsSync = sessionStorage.getItem('bm_sync_presc');
      const token = localStorage.getItem('token');
      
      // CASE 1: User just logged in / returned with a pending anonymous prescription
      if (needsSync) {
        try {
          const parsed = JSON.parse(needsSync);
          if (parsed.recommendation) {
            // Instantly restore visual state
            setRecommendation(parsed.recommendation);
            setSubRecommendations(parsed.subRecommendations || []);
            setAiExplanation(parsed.aiExplanation || "");
            setNearbyShops(parsed.nearbyShops || []);
            setStep(4);
            
            // If they are logged in, auto-save to their account history
            if (isLoggedIn && token && !parsed.alreadyAlerted) {
                // Consume it only if we're successfully saving it
                sessionStorage.removeItem('bm_sync_presc'); 
                try {
                    const res = await fetch(`${API_BASE}/api/users/prescriptions`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({
                            title: t('curator.save_modal_ph') || "AI 맞춤 커피 처방전",
                            beanName: parsed.recommendation.bean.name,
                            brand: parsed.recommendation.brand.name,
                            aiComment: parsed.aiExplanation,
                            usePoints: false
                        })
                    });

                    if (res.status === 403) {
                        const isHiddenByUser = localStorage.getItem('bm_hide_limit_warning') === 'true';
                        if (!isHiddenByUser) {
                            setShowLimitWarning(true);
                        }
                        // Flag to prevent repetitive alerts
                        parsed.alreadyAlerted = true;
                        sessionStorage.setItem('bm_sync_presc', JSON.stringify(parsed));
                    }
                } catch(e) {
                    console.warn("Auto-save failed:", e);
                    sessionStorage.setItem('bm_sync_presc', needsSync);
                }
            }
            return; // State restored, exit checkSync.
          }
        } catch(e) { console.error("Failed to parse bm_sync_presc:", e); }
      }

      // CASE 2: User opened app fresh, is logged in, no pending sync data
      if (isLoggedIn && token) {
        try {
          const res = await fetch(`${API_BASE}/api/users/prescriptions`, { headers: { Authorization: `Bearer ${token}` } });
          if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0) {
              const latest = data[0];
              const matchedBean = (() => {
                  try {
                      const match = latest.aiComment?.match(/<!-- BEANDATA: (.*?) -->/);
                      if (match) return JSON.parse(match[1]);
                  } catch(e) {}
                  return COFFEE_BEANS.find(b => b.name === latest.beanName);
              })();
              const matchedBrand = BRANDS.find(b => b.name === latest.brand);
              if (matchedBean && matchedBrand) {
                setRecommendation({ bean: matchedBean, brand: matchedBrand });
                setAiExplanation(latest.aiComment);
                setStep(4);
              } else {
                setStep(0);
              }
            } else {
              setStep(0); // No past history
            }
          }
        } catch (e) { console.error("History fetch error:", e) }
      }
    };
    checkSync();
  }, [isLoggedIn, t]);

  // Continuously cache the complete generated result so we don't lose it if unmounted
  useEffect(() => {
    if (step === 4 && recommendation) {
       // Not logged in: the continuous cache effect will handle state preservation.
    }
  }, [step, recommendation, subRecommendations, aiExplanation, nearbyShops]);

  // Dynamic Ad Retrieval for Result Screen (Step 4)
  // Ensures that whenever the result screen is viewed (e.g., loaded from save or synced), we have an updated targeted ad.
  useEffect(() => {
    let isMounted = true;
    if (step === 4 && recommendation) {
      const targetCountryCode = i18n.language?.startsWith('en') ? 'US' : 'KR';
      fetch(`${API_BASE}/api/community/ads?tags=${encodeURIComponent(prefs.flavorNotes.join(','))}&country=${targetCountryCode}`)
        .then(res => res.json())
        .then(ads => {
          if (!isMounted) return;
          if (ads && ads.length > 0) {
              const targetAds = ads.filter((a: any) => a.placement === 'CURATOR_RESULT' || a.type === 'TEXT_LINK');
              if (targetAds.length > 0) {
                  setCurationAd(targetAds[0]);
                  localStorage.setItem('bm_curation_ad', JSON.stringify(targetAds[0]));
              } else {
                  setCurationAd(null);
                  localStorage.removeItem('bm_curation_ad');
              }
          } else {
              setCurationAd(null);
              localStorage.removeItem('bm_curation_ad');
          }
        }).catch(e => {
            if (isMounted) {
                setCurationAd(null);
                localStorage.removeItem('bm_curation_ad');
            }
        });
    }
    return () => { isMounted = false; };
  }, [step, recommendation, prefs.flavorNotes, i18n.language]);

  const startSurvey = () => { setDirection(1); setStep(1); };
  const nextStep = () => { setDirection(1); setStep(prev => prev + 1); };
  const prevStep = () => { setDirection(-1); setStep(prev => prev - 1); };

  const handleSavePrescription = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert(t('curator.alert_login_req'));
      return;
    }
    if (!recommendation) return;

    // Instantly kill any lingering background auto-save failure modal
    setShowLimitWarning(false);

    // Instead of window.prompt, open the custom modal
    setPrescriptionTitle('');
    setShowSavePrompt(true);
  };

  const executeSave = async (usePoints = false) => {
    const token = localStorage.getItem('token');
    if (!token || !recommendation) return;

    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE}/api/users/prescriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: prescriptionTitle.trim() || t('curator.save_modal_ph'),
          beanName: recommendation.bean.name,
          brand: recommendation.brand.name,
          aiComment: aiExplanation,
          usePoints
        })
      });
      if (response.ok) {
        alert(t('curator.alert_save_success'));
        setShowSavePrompt(false);
        // Wipe local caches explicitly
        sessionStorage.removeItem('bm_sync_presc');
        localStorage.removeItem('bm_sync_presc');
      } else if (response.status === 403) {
        const errorData = await response.json();
        const cost = errorData.cost || 100;
        
        if (errorData.pointBalance !== undefined && errorData.pointBalance < cost) {
            alert(t('curator.alert_no_points'));
            setShowSavePrompt(false);
            return;
        }

        if (window.confirm(t('curator.alert_limit_reached', { current: errorData.current, limit: errorData.limit }))) {
            executeSave(true);
        } else {
            setShowSavePrompt(false);
        }
      } else if (response.status === 400 && usePoints) {
        alert(t('curator.alert_no_points'));
        setShowSavePrompt(false);
      } else {
        alert(t('curator.alert_save_fail'));
      }
    } catch (err) {
      alert(t('curator.alert_server_error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleMatch = async () => {
    setDirection(1);
    setIsLoading(true);
    setIsMapLoading(true);
    setStep(4);
    setNearbyShops([]);
    
    // Optimistically clear stale ad to prevent ghosting while fetching
    setCurationAd(null);
    localStorage.removeItem('bm_curation_ad');

    // Pass proper ISO 3166-1 alpha-2 country code instead of language code
    const targetCountryCode = i18n.language?.startsWith('en') ? 'US' : 'KR';

    // Fetch context-aware ad for curation result
    fetch(`${API_BASE}/api/community/ads?tags=${encodeURIComponent(prefs.flavorNotes.join(','))}&country=${targetCountryCode}`)
      .then(res => res.json())
      .then(ads => {
        if (ads && ads.length > 0) {
            // Must strictly filter for the dedicated placement or TEXT_LINK type
            const targetAds = ads.filter((a: any) => a.placement === 'CURATOR_RESULT' || a.type === 'TEXT_LINK');
            if (targetAds.length > 0) {
                setCurationAd(targetAds[0]);
                localStorage.setItem('bm_curation_ad', JSON.stringify(targetAds[0]));
            } else {
                setCurationAd(null);
                localStorage.removeItem('bm_curation_ad');
            }
        } else {
            setCurationAd(null);
            localStorage.removeItem('bm_curation_ad');
        }
      }).catch(e => {
          setCurationAd(null);
          localStorage.removeItem('bm_curation_ad');
      });

    let currentLatitude = 37.5665; // Seoul default fallback
    let currentLongitude = 126.9780;
    let weatherInfo = "";
    let countryName = "South Korea";

    const userObj = localStorage.getItem('user');
    const userProfile = userObj ? JSON.parse(userObj) : null;
    const userAgeGroup = userProfile?.ageGroup || "알 수 없음";
    const userGender = userProfile?.gender || "알 수 없음";
    const userFavCafe = userProfile?.favoriteCafe || "없음";

    try {
      if (!("geolocation" in navigator)) throw new Error("Geolocation not supported");
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 2500, maximumAge: 300000 });
      });
      currentLatitude = position.coords.latitude;
      currentLongitude = position.coords.longitude;
      setUserLocation({ lat: currentLatitude, lng: currentLongitude });
    } catch (error) {
      console.warn("Location fallback used:", error);
      setUserLocation({ lat: currentLatitude, lng: currentLongitude });
    }

    // Set weather based entirely on user preference as requested
    weatherInfo = prefs.weather;

    let countryPromise: Promise<any> | null = null;
    const genai = getAi();

    // Launch Country API (Fast, Free) in parallel
    countryPromise = fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${currentLatitude}&longitude=${currentLongitude}&localityLanguage=en`)
        .then(res => res.json())
        .then(data => data.countryName || "South Korea")
        .catch(e => {
            console.error("Country detection failed:", e);
            return "South Korea";
        });

    const scoredBeans = COFFEE_BEANS.map(bean => {
      let score = 0;
      score += (5 - Math.abs(prefs.tasteAcidity - bean.acidity)) * 1.5;
      score += (5 - Math.abs(prefs.tasteSweetness - bean.sweetness)) * 1.5;
      score += (5 - Math.abs(prefs.tasteBitterness - bean.bitterness)) * 1.5;
      score += (5 - Math.abs(prefs.tasteBody - bean.body)) * 1.5;
      const commonNotes = bean.flavorNotes.filter(note => prefs.flavorNotes.includes(note));
      score += commonNotes.length * 2;
      if (prefs.season === 'Summer' && bean.acidity >= 4) score += 1;
      if (prefs.season === 'Winter' && bean.body >= 4) score += 1;
      const combinedWeather = `${weatherInfo} ${prefs.weather}`.toLowerCase();
      if (combinedWeather.includes('hot') || combinedWeather.includes('sunny')) {
        if (bean.acidity >= 4) score += 2;
      }
      if (combinedWeather.includes('rain') || combinedWeather.includes('cold') || combinedWeather.includes('snow')) {
        if (bean.body >= 4) score += 2;
      }
      if (prefs.timeOfDay === 'Morning' && bean.roastLevel === 'Medium') score += 1;
      if (prefs.timeOfDay === 'Night' && bean.roastLevel === 'Light') score += 1;
      if (prefs.condition === 'Tired' && bean.body >= 4) score += 2;
      if (prefs.condition === 'Refreshing' && bean.acidity >= 4) score += 2;

      // Health Status logic
      if (prefs.healthStatus === 'CaffeineSensitive' && prefs.caffeine !== 'Decaf') {
        score -= 10;
      }
      if (prefs.healthStatus === 'StomachSensitive' && bean.acidity >= 3) {
        score -= 5;
      }
      if (prefs.healthStatus === 'Diabetes') {
        // Emphasize beans that are delicious without sugar (high sweetness score naturally, or clean processing)
        if (bean.sweetness >= 4) score += 3;
        if (bean.processing === 'Washed') score += 2;
      }
      if (prefs.healthStatus === 'HighCholesterol') {
        // Emphasize filter/drip coffee which filters out cafestol (cholesterol-raising compound) over Espresso
        if (prefs.base === 'Espresso') score -= 5; // Drip is much better
        if (prefs.equipment === 'Hand Drip' || prefs.equipment === 'French Press' === false) score += 3;
      }

      // Demographic & Brand Base Heuristics
      if (userFavCafe === '스타벅스' && bean.roastLevel === 'Dark') score += 2;
      if (userFavCafe === '스타벅스' && bean.body >= 4) score += 1;
      if (userFavCafe === '블루보틀' && bean.roastLevel === 'Light') score += 2;
      if (userFavCafe === '블루보틀' && bean.acidity >= 4) score += 1;
      
      const isYoung = userAgeGroup === '10대 이하' || userAgeGroup === '20대' || userAgeGroup === '30대';
      if (isYoung && bean.acidity >= 4) score += 1; // MZ 
      if (!isYoung && bean.body >= 4) score += 1; // 40~50+

      return { bean, score };
    }).sort((a, b) => b.score - a.score);

    const bestBean = scoredBeans[0].bean;
    const bestBrand = BRANDS.find(b => b.beans.includes(bestBean.id)) || BRANDS[0];
    setRecommendation({ bean: bestBean, brand: bestBrand });
    
    const subBeans = scoredBeans.slice(1, 3).map(sb => ({
      bean: sb.bean,
      brand: BRANDS.find(b => b.beans.includes(sb.bean.id)) || BRANDS[0]
    }));
    setSubRecommendations(subBeans);

    // Launch Map search in parallel background to backend
    const fetchMapsAsync = async () => {
      if (currentLatitude && currentLongitude) {
        try {
          const token = localStorage.getItem('token');
          const headers: any = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;

          const mapsResponse = await fetch(`${API_BASE}/api/ai-features/map-shops`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                  currentLatitude,
                  currentLongitude,
                  language: i18n.language?.startsWith('en') ? 'en' : 'kr'
              })
          });
          
          if (!mapsResponse.ok) await handleApiError(mapsResponse);

          const result = await mapsResponse.json();
          const parsedData = result.shops || [];
          const chunks = result.chunks || [];

          let anchorLat = currentLatitude !== undefined ? currentLatitude : 37.5665;
          let anchorLng = currentLongitude !== undefined ? currentLongitude : 126.9780;
          
          for (const s of parsedData) {
              const rawLat = s.lat !== undefined ? s.lat : s.latitude;
              const rawLng = s.lng !== undefined ? s.lng : s.longitude;
              if (rawLat !== undefined && rawLng !== undefined && !isNaN(parseFloat(rawLat)) && !isNaN(parseFloat(rawLng))) {
                  anchorLat = parseFloat(rawLat);
                  anchorLng = parseFloat(rawLng);
                  break;
              }
          }

          const shops: any[] = [];
          parsedData.forEach((shop: any) => {
            let uri = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.name)}`;
            if (chunks) {
              const matchChunk = chunks.find((c: any) => c.maps && (shop.name.toLowerCase().includes(c.maps.title.toLowerCase()) || c.maps.title.toLowerCase().includes(shop.name.toLowerCase())));
              if (matchChunk) {
                uri = matchChunk.maps.uri;
              }
            }
            let finalLat = shop.lat !== undefined ? shop.lat : shop.latitude;
            let finalLng = shop.lng !== undefined ? shop.lng : shop.longitude;
            
            if (finalLat === undefined || isNaN(parseFloat(finalLat))) {
                finalLat = anchorLat;
            }
            if (finalLng === undefined || isNaN(parseFloat(finalLng))) {
                finalLng = anchorLng;
            }

            shops.push({ name: shop.name, lat: finalLat, lng: finalLng, uri });
          });

          let validShops = shops.map(s => ({
              ...s,
              lat: parseFloat(s.lat),
              lng: parseFloat(s.lng)
          }));
          
          validShops = validShops.map(s => {
              const distance = (currentLatitude && currentLongitude) 
                  ? getDistanceFromLatLonInKm(currentLatitude, currentLongitude, s.lat, s.lng) 
                  : 0;
              return { ...s, distance };
          });

          let finalShops = validShops.slice(0, 5);  
          setNearbyShops(finalShops);
          sessionStorage.setItem('bm_curator_shops_v3', JSON.stringify(finalShops));
          (window as any)._allCuratedShops = validShops;
        } catch (error) {
          console.error("Maps Grounding Error:", error);
        } finally {
          setIsMapLoading(false);
        }
      } else {
          setIsMapLoading(false);
      }
    };

    // Trigger map fetch strictly after a small delay to yield primary EventLoop execution 
    // to the React renderer so the AI text streaming feels smooth and fast.
    setTimeout(() => {
      fetchMapsAsync();
    }, 1000);

    // End blocking Loading Spinner IMMEDIATELY for Curator UI Result
    setIsLoading(false);
    setAiExplanation(""); // Prepare for streaming typing effect

    try {
      if (countryPromise) {
          // Absolute maximum wait of 2000ms for external Reverse API
          const timeout = new Promise<any>(resolve => setTimeout(() => resolve('South Korea'), 2000));
          countryName = await Promise.race([countryPromise, timeout]);
      }

      const targetLanguage = i18n.language?.startsWith('en') ? 'English' : 'Korean';
      
      const payload = {
          targetLanguage,
          countryName,
          prefs,
          userAgeGroup,
          userGender,
          userFavCafe,
          weatherInfo,
          bestBean,
          bestBrand
      };

      const token = localStorage.getItem('token');
      const genRes = await fetch(`${API_BASE}/api/curation/generate`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify(payload)
      });

      if (!genRes.ok) await handleApiError(genRes);

      const { jobId } = await genRes.json();
      
      const loadingPhrases = targetLanguage === 'English' 
        ? ["Analyzing your taste profile...", "Checking the weather context...", "Finding the perfect coffee bean...", "Writing your curation..."]
        : ["고객님의 취향을 분석 중입니다...", "현재 날씨와 기분을 매칭 중입니다...", "가장 완벽한 원두를 찾는 중입니다...", "최종 처방전을 작성 중입니다..."];
      
      let phraseIndex = 0;
      setAiExplanation(loadingPhrases[0]);
      
      const phraseInterval = setInterval(() => {
          phraseIndex = (phraseIndex + 1) % loadingPhrases.length;
          setAiExplanation(loadingPhrases[phraseIndex]);
      }, 3000);

      let resultText = "";
      while (true) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          const statusRes = await fetch(`${API_BASE}/api/curation/status/${jobId}`);
          
          if (!statusRes.ok) {
              let errorMsg = "Worker failed to generate prescription";
              try { const errData = await statusRes.json(); errorMsg = errData.error || errorMsg; } catch(e) {}
              throw new Error(errorMsg);
          }

          const statusData = await statusRes.json();
          if (statusData.status === 'completed') {
              resultText = statusData.result?.text || "";
              break;
          } else if (statusData.status === 'failed') {
              throw new Error("Worker failed to generate prescription");
          }
      }

      clearInterval(phraseInterval);

      setAiExplanation("");
      let currentIndex = 0;
      const typeInterval = setInterval(() => {
          if (currentIndex < resultText.length - 1) { // Process larger chunks to simulate human typing better without lagging the main thread too hard
              const chunk = resultText.substring(currentIndex, currentIndex + 3);
              setAiExplanation((prev) => prev + chunk);
              currentIndex += 3;
          } else if (currentIndex < resultText.length) {
              setAiExplanation((prev) => prev + resultText.charAt(currentIndex));
              currentIndex++;
          } else {
              clearInterval(typeInterval);
          }
      }, 10);

    } catch (error: any) {
      console.error("AI Error:", error);
      setAiExplanation(`고객님의 취향과 현재 상황을 분석하여 가장 잘 어울리는 원두를 선정했습니다. \n *(Error: ${error.message})*`);
    }

    try {
      if (localStorage.getItem('token')) {
        fetch(`${API_BASE}/api/users/ai-usage`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }).catch(e => console.warn(e));
      } else {
        const vId = localStorage.getItem('visitor_id');
        if (vId) {
          fetch(`${API_BASE}/api/analytics/ai-usage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ visitorId: vId })
          }).catch(e => console.warn(e));
        }
      }
    } catch (e) {
      console.warn("Telemetry error:", e);
    }
  };

  const reset = () => {
    setDirection(-1);
    setStep(0);
    setRating(0);
    setRecommendation(null);
    setSubRecommendations([]);
    setAiExplanation("");
    setNearbyShops([]);
  };

  // Mobile Slide Animation Variants (Transitions removed per user request)
  const pageVariants: any = {
    initial: {
      opacity: 0,
      scale: 0.98
    },
    animate: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.15, ease: "easeOut" }
    },
    exit: {
      opacity: 0,
      scale: 0.98,
      transition: { duration: 0.1 }
    }
  };

  return (
    <div className="flex-1 w-full bg-espresso-950 overflow-hidden flex flex-col text-espresso-50 font-sans relative selection:bg-amber-900 selection:text-cyan-100">
      <div className="flex-1 w-full max-w-md mx-auto relative flex flex-col bg-espresso-950 overflow-hidden shadow-2xl shadow-black/40">

        
        {/* Dynamic BrewQuiz Background (Steps 1-3) */}
        <AnimatePresence>
          {step > 0 && step < 4 && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              transition={{ duration: 0.8 }}
              className="absolute inset-0 z-0 pointer-events-none"
            >
              <img src="https://images.unsplash.com/photo-1559525839-b184a4d698c7?q=80&w=1000&auto=format&fit=crop" alt="Coffee Aesthetic" className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-screen print:hidden" />
              <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0c]/40 via-[#0a0a0c]/80 to-[#0a0a0c]"></div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* BrewQuiz Header */}
        {step > 0 && step < 4 && (
          <div className="px-6 pt-safe mt-[max(env(safe-area-inset-top),32px)] mb-2 z-20 shrink-0 flex flex-col items-center relative">
            <h1 className="text-[28px] font-black tracking-wide text-espresso-50 leading-tight text-center tracking-tight uppercase shadow-black drop-shadow-xl">
              YOUR DAILY<br/>COFFEE BREW
            </h1>
            <p className="text-[15px] text-espresso-100 mt-2 text-center drop-shadow-md font-medium">
               How's your day starting?
            </p>
          </div>
        )}

        <div className={`${step < 4 ? 'flex' : 'hidden'} flex-1 relative overflow-x-hidden overflow-y-auto hide-scrollbar z-10 flex-col ${step > 0 ? 'pb-32' : 'pb-12'}`} ref={scrollRef}>
            
            {/* Step 0: Welcome */}
            {step === 0 && (
              <div className="flex-1 flex flex-col justify-center items-center p-6 animate-in fade-in duration-700">
                <div className="w-24 h-24 bg-espresso-900/5 rounded-full flex items-center justify-center mb-8 border border-espresso-600 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                  <Coffee size={40} className="text-espresso-50" />
                </div>
                <h1 
                  className="text-5xl font-serif font-bold tracking-tight text-espresso-50 leading-[1.1] text-center"
                  dangerouslySetInnerHTML={{ __html: t('curator.intro_title') }}
                />
                <p 
                  className="text-base text-espresso-200 max-w-xs mx-auto mt-6 mb-8 leading-relaxed break-keep text-center"
                  dangerouslySetInnerHTML={{ __html: t('curator.intro_desc') }}
                />
                
                <GlobalAdBanner placement="HOME_HERO" className="mb-6 max-w-xs mx-auto w-full" />
                
                <div className="w-full max-w-xs">
                  <button onClick={startSurvey} className="bg-gradient-to-r from-amber-500 to-blue-500 text-espresso-50 w-full text-lg font-bold shadow-[0_0_20px_rgba(34,211,238,0.3)] py-5 rounded-2xl active:scale-95 transition-transform uppercase tracking-widest">
                    {t('curator.intro_start') || "START"}
                  </button>
                </div>
              </div>
            )}

            {/* Step 1: Context */}
            {step === 1 && (
              <div className="p-4 space-y-6 animate-in fade-in duration-500 pb-20 w-full max-w-sm mx-auto">
                <section className="w-full">
                  <h3 className="text-[13px] text-espresso-100 font-extrabold uppercase tracking-[0.2em] pl-4 mb-2 drop-shadow-md">TIME</h3>
                  <div className="w-full flex items-center justify-between bg-espresso-900/[0.04] backdrop-blur-xl border border-espresso-700/50 rounded-[2.5rem] py-3 px-3 shadow-2xl">
                    {['Morning', 'Afternoon', 'Evening', 'Night'].map((time) => {
                      const iconMap: any = { Morning: <Sunrise size={24}/>, Afternoon: <Sun size={24}/>, Evening: <Sunset size={24}/>, Night: <Moon size={24}/> };
                      const isSel = prefs.timeOfDay === time;
                      return (
                        <button key={time} onClick={() => setPrefs({...prefs, timeOfDay: time as any})}
                          className={`shrink-0 flex flex-col items-center justify-center gap-2 max-w-[70px] flex-1 group transition-opacity ${isSel ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}>
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${isSel ? 'bg-amber-500/10 border-[1.5px] border-amber-500 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-transparent border-[1.5px] border-transparent'}`}>
                              <span className={`transition-transform ${isSel ? 'text-amber-500 scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'text-espresso-100 group-hover:scale-110'}`}>{iconMap[time]}</span>
                          </div>
                          <span className={`text-[12px] uppercase tracking-wider text-center ${isSel ? 'text-amber-500 font-bold' : 'text-espresso-200 font-semibold'}`}>{t(`curator.t_${time.toLowerCase()}`)}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="w-full">
                  <h3 className="text-[13px] text-espresso-100 font-extrabold uppercase tracking-[0.2em] pl-4 mb-2 drop-shadow-md">WEATHER</h3>
                  <div className="w-full flex overflow-x-auto hide-scrollbar gap-2 items-center snap-x snap-mandatory bg-espresso-900/[0.04] backdrop-blur-xl border border-espresso-700/50 rounded-[2.5rem] py-3 px-3 shadow-2xl">
                    {['Sunny', 'Rainy', 'Cloudy', 'Snowy', 'Hot', 'Cold'].map((weather) => {
                      const iconMap: any = { Sunny: <Sun size={24}/>, Rainy: <CloudRain size={24}/>, Cloudy: <Cloud size={24}/>, Snowy: <Snowflake size={24}/>, Hot: <ThermometerSun size={24}/>, Cold: <ThermometerSnowflake size={24}/> };
                      const isSel = prefs.weather === weather;
                      return (
                        <button key={weather} onClick={() => setPrefs({...prefs, weather: weather as any})}
                          className={`shrink-0 snap-center flex flex-col items-center justify-center gap-2 w-[70px] group transition-opacity ${isSel ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}>
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${isSel ? 'bg-amber-500/10 border-[1.5px] border-amber-500 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-transparent border-[1.5px] border-transparent'}`}>
                              <span className={`transition-transform ${isSel ? 'text-amber-500 scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'text-espresso-100 group-hover:scale-110'}`}>{iconMap[weather]}</span>
                          </div>
                          <span className={`text-[12px] uppercase tracking-wider text-center ${isSel ? 'text-amber-500 font-bold' : 'text-espresso-200 font-semibold'}`}>{t(`curator.w_${weather.toLowerCase()}`)}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="w-full">
                  <h3 className="text-[13px] text-espresso-100 font-extrabold uppercase tracking-[0.2em] pl-4 mb-2 drop-shadow-md">MOOD</h3>
                  <div className="w-full flex items-center justify-between bg-espresso-900/[0.04] backdrop-blur-xl border border-espresso-700/50 rounded-[2.5rem] py-3 px-3 shadow-2xl">
                    {['Tired', 'Focused', 'Relaxed', 'Refreshing'].map((cond) => {
                      const iconMap: any = { Tired: <BatteryWarning size={24}/>, Focused: <Brain size={24}/>, Relaxed: <Flower2 size={24}/>, Refreshing: <Sparkles size={24}/> };
                      const isSel = prefs.condition === cond;
                      return (
                        <button key={cond} onClick={() => setPrefs({...prefs, condition: cond as any})}
                          className={`shrink-0 flex flex-col items-center justify-center gap-2 max-w-[70px] flex-1 group transition-opacity ${isSel ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}>
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${isSel ? 'bg-amber-500/10 border-[1.5px] border-amber-500 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-transparent border-[1.5px] border-transparent'}`}>
                              <span className={`transition-transform ${isSel ? 'text-amber-500 scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'text-espresso-100 group-hover:scale-110'}`}>{iconMap[cond]}</span>
                          </div>
                          <span className={`text-[12px] uppercase tracking-wider text-center ${isSel ? 'text-amber-500 font-bold' : 'text-espresso-200 font-semibold'}`}>{t(`curator.c_${cond.toLowerCase()}`)}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="w-full">
                  <h3 className="text-[13px] text-espresso-100 font-extrabold uppercase tracking-[0.2em] pl-4 mb-2 drop-shadow-md">HEALTH</h3>
                  <div className="w-full flex overflow-x-auto hide-scrollbar gap-2 items-center snap-x snap-mandatory bg-espresso-900/[0.04] backdrop-blur-xl border border-espresso-700/50 rounded-[2.5rem] py-3 px-3 shadow-2xl">
                    {['None', 'CaffeineSensitive', 'StomachSensitive', 'Diabetes', 'HighCholesterol'].map((h) => {
                      const labelMap: any = { None: 'h_none', CaffeineSensitive: 'h_caffeine', StomachSensitive: 'h_stomach', Diabetes: 'h_diabetes', HighCholesterol: 'h_cholesterol' };
                      const iconMap: any = { None: <CheckCircle2 size={24}/>, CaffeineSensitive: <HeartPulse size={24}/>, StomachSensitive: <Leaf size={24}/>, Diabetes: <Activity size={24}/>, HighCholesterol: <Stethoscope size={24}/> };
                      const isSel = prefs.healthStatus === h;
                      return (
                        <button key={h} onClick={() => setPrefs({...prefs, healthStatus: h as any})}
                          className={`shrink-0 snap-center flex flex-col items-center justify-center gap-2 w-[80px] group transition-opacity ${isSel ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}>
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${isSel ? 'bg-amber-500/10 border-[1.5px] border-amber-500 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-transparent border-[1.5px] border-transparent'}`}>
                              <span className={`transition-transform ${isSel ? 'text-amber-500 scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'text-espresso-100 group-hover:scale-110'}`}>{iconMap[h]}</span>
                          </div>
                          <span className={`text-[12px] uppercase tracking-wider text-center px-1 break-keep leading-tight ${isSel ? 'text-amber-500 font-bold' : 'text-espresso-200 font-semibold'}`}>{t(`curator.${labelMap[h]}`)}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            {/* Step 2: Basic */}
            {step === 2 && (
              <div className="p-4 space-y-6 animate-in fade-in duration-500 pb-20 w-full max-w-sm mx-auto">
                <section className="w-full">
                  <h3 className="text-[13px] text-espresso-100 font-extrabold uppercase tracking-[0.2em] pl-4 mb-2 drop-shadow-md">STYLE</h3>
                  <div className="w-full flex items-center justify-center gap-8 bg-espresso-900/[0.04] backdrop-blur-xl border border-espresso-700/50 rounded-[2.5rem] py-4 px-6 shadow-2xl">
                    {[ {v:'Espresso', l:'s_espresso', i: <Coffee size={28}/>}, {v:'Drip', l:'s_drip', i: <Wind size={28}/>} ].map((item) => {
                      const isSel = prefs.base === item.v;
                      return (
                        <button key={item.v} onClick={() => setPrefs({...prefs, base: item.v as any})}
                          className={`flex flex-col items-center justify-center gap-3 w-[100px] group transition-opacity ${isSel ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}>
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${isSel ? 'bg-amber-500/10 border-[1.5px] border-amber-500 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-transparent border-[1.5px] border-transparent'}`}>
                              <span className={`transition-transform ${isSel ? 'text-amber-500 scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'text-espresso-100 group-hover:scale-110'}`}>{item.i}</span>
                          </div>
                          <span className={`text-[12px] uppercase tracking-widest text-center whitespace-pre-line ${isSel ? 'text-amber-500 font-bold' : 'text-espresso-200 font-semibold'}`}>{t(`curator.${item.l}`).replace('/', '\n')}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="w-full">
                  <h3 className="text-[13px] text-espresso-100 font-extrabold uppercase tracking-[0.2em] pl-4 mb-2 drop-shadow-md">TASTE PROFILE</h3>
                  <div className="w-full bg-espresso-900/[0.04] backdrop-blur-xl border border-espresso-700/50 rounded-[2.5rem] py-6 px-5 shadow-2xl space-y-6">
                  {[
                    { key: 'tasteAcidity', title: 't_acidity_title', desc: 't_acidity_desc', color: 'bg-amber-500', range: [t('curator.scale_less'), t('curator.scale_more')] },
                    { key: 'tasteSweetness', title: 't_sweetness_title', desc: 't_sweetness_desc', color: 'bg-amber-500', range: [t('curator.scale_less'), t('curator.scale_more')] },
                    { key: 'tasteBitterness', title: 't_bitterness_title', desc: 't_bitterness_desc', color: 'bg-amber-500', range: [t('curator.scale_less'), t('curator.scale_more')] },
                    { key: 'tasteBody', title: 't_body_title', desc: 't_body_desc', color: 'bg-amber-500', range: [t('curator.scale_light'), t('curator.scale_heavy')], center: '균형' }
                  ].map((attr) => (
                    <div key={attr.key} className="w-full relative">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[13px] uppercase tracking-wide text-espresso-50">{t(`curator.${attr.title}`)}</span>
                        </div>
                        <div className="text-[15px] font-black text-amber-500 shadow-amber-500">{prefs[attr.key as keyof UserPreferences]}</div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                         <span className="text-[12px] text-espresso-300 font-extrabold uppercase w-10 shrink-0">{attr.range[0]}</span>
                         <input 
                           type="range" min="1" max="5" step="0.5"
                           value={prefs[attr.key as keyof UserPreferences] as number}
                           onChange={(e) => setPrefs({...prefs, [attr.key]: parseFloat(e.target.value)})}
                           className="w-full h-1 bg-espresso-900/20 rounded-full appearance-none cursor-pointer accent-amber-500 shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                         />
                         <span className="text-[12px] text-espresso-300 font-extrabold uppercase w-10 shrink-0 text-right">{attr.range[1]}</span>
                      </div>
                    </div>
                  ))}
                  </div>
                </section>

                <section className="w-full">
                  <h3 className="text-[13px] text-espresso-100 font-extrabold uppercase tracking-[0.2em] pl-4 mb-2 drop-shadow-md">CAFFEINE</h3>
                  <div className="w-full flex items-center justify-center gap-8 bg-espresso-900/[0.04] backdrop-blur-xl border border-espresso-700/50 rounded-[2.5rem] py-4 px-6 shadow-2xl">
                    {[ {v:'Regular', l:'caff_reg', i: <Coffee size={28}/>}, {v:'Decaf', l:'caff_decaf', i: <Moon size={28}/>} ].map((item) => {
                      const isSel = prefs.caffeine === item.v;
                      return (
                        <button key={item.v} onClick={() => setPrefs({...prefs, caffeine: item.v as any})}
                          className={`flex flex-col items-center justify-center gap-3 w-[100px] group transition-opacity ${isSel ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}>
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${isSel ? 'bg-amber-500/10 border-[1.5px] border-amber-500 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-transparent border-[1.5px] border-transparent'}`}>
                              <span className={`transition-transform ${isSel ? 'text-amber-500 scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'text-espresso-100 group-hover:scale-110'}`}>{item.i}</span>
                          </div>
                          <span className={`text-[12px] uppercase tracking-widest text-center ${isSel ? 'text-amber-500 font-bold' : 'text-espresso-200 font-semibold'}`}>{t(`curator.${item.l}`)}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            {/* Step 3: Deep Dive */}
            {step === 3 && (
              <div className="p-4 space-y-6 animate-in fade-in duration-500 pb-20 w-full max-w-sm mx-auto">
                <section className="w-full">
                  <div className="flex justify-between items-end mb-2 pl-4 pr-2">
                     <h3 className="text-[13px] text-espresso-100 font-extrabold uppercase tracking-[0.2em] drop-shadow-md">FLAVOR (MAX 3)</h3>
                  </div>
                  <div className="w-full flex overflow-x-auto hide-scrollbar gap-2 items-center snap-x snap-mandatory bg-espresso-900/[0.04] backdrop-blur-xl border border-espresso-700/50 rounded-[2.5rem] py-3 px-3 shadow-2xl">
                    {[
                      {v:'Chocolate', l:'f_chocolate', i: <Coffee size={24}/>}, {v:'Nutty', l:'f_nutty', i: <Coffee size={24}/>}, 
                      {v:'Caramel', l:'f_caramel', i: <Droplets size={24}/>}, {v:'Floral', l:'f_floral', i: <Flower2 size={24}/>}, 
                      {v:'Lemon', l:'f_lemon', i: <Citrus size={24}/>}, {v:'Berry', l:'f_berry', i: <Cherry size={24}/>},
                      {v:'Orange', l:'f_orange', i: <Sun size={24}/>}, {v:'Smoky', l:'f_smoky', i: <Flame size={24}/>}, 
                      {v:'Earthy', l:'f_earthy', i: <Sprout size={24}/>}, {v:'Peach', l:'f_peach', i: <Apple size={24}/>},
                      {v:'Lychee', l:'f_lychee', i: <CloudFog size={24}/>}
                    ].map((f) => {
                      const isSel = prefs.flavorNotes.includes(f.v);
                      return (
                        <button key={f.v} 
                          onClick={() => {
                            const newNotes = isSel ? prefs.flavorNotes.filter(n => n !== f.v) : [...prefs.flavorNotes, f.v].slice(0,3);
                            setPrefs({...prefs, flavorNotes: newNotes});
                          }}
                          className={`shrink-0 snap-center flex flex-col items-center justify-center gap-2 w-[70px] group transition-opacity ${isSel ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}>
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${isSel ? 'bg-amber-500/10 border-[1.5px] border-amber-500 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-transparent border-[1.5px] border-transparent'}`}>
                              <span className={`transition-transform ${isSel ? 'text-amber-500 scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'text-espresso-100 group-hover:scale-110'}`}>{f.i}</span>
                          </div>
                          <span className={`text-[12px] uppercase tracking-wider text-center ${isSel ? 'text-amber-500 font-bold' : 'text-espresso-200 font-semibold'}`}>{t(`curator.${f.l}`)}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="w-full">
                  <h3 className="text-[13px] text-espresso-100 font-extrabold uppercase tracking-[0.2em] pl-4 mb-2 drop-shadow-md">EQUIPMENT</h3>
                  <div className="w-full flex overflow-x-auto hide-scrollbar gap-2 items-center snap-x snap-mandatory bg-espresso-900/[0.04] backdrop-blur-xl border border-espresso-700/50 rounded-[2.5rem] py-3 px-3 shadow-2xl">
                    {[ {v:'Hand Drip', l:'e_handdrip', i: <Droplet size={24}/>}, {v:'Espresso', l:'e_espresso', i: <Coffee size={24}/>}, {v:'Capsule', l:'e_capsule', i: <Pill size={24}/>}, {v:'Moka Pot', l:'e_mokapot', i: <Flame size={24}/>}, {v:'French Press', l:'e_frenchpress', i: <Beaker size={24}/>}].map((e) => {
                      const isSel = prefs.equipment === e.v;
                      return (
                        <button key={e.v} onClick={() => setPrefs({...prefs, equipment: e.v as any})}
                          className={`shrink-0 snap-center flex flex-col items-center justify-center gap-2 w-[74px] group transition-opacity ${isSel ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}>
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${isSel ? 'bg-amber-500/10 border-[1.5px] border-amber-500 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-transparent border-[1.5px] border-transparent'}`}>
                              <span className={`transition-transform ${isSel ? 'text-amber-500 scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'text-espresso-100 group-hover:scale-110'}`}>{e.i}</span>
                          </div>
                          <span className={`text-[12px] uppercase tracking-wider text-center leading-tight ${isSel ? 'text-amber-500 font-bold' : 'text-espresso-200 font-semibold'}`}>{t(`curator.${e.l}`)}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="w-full">
                  <h3 className="text-[13px] text-espresso-100 font-extrabold uppercase tracking-[0.2em] pl-4 mb-2 drop-shadow-md">MUSIC</h3>
                  <div className="w-full flex overflow-x-auto hide-scrollbar gap-2 items-center snap-x snap-mandatory bg-espresso-900/[0.04] backdrop-blur-xl border border-espresso-700/50 rounded-[2.5rem] py-3 px-3 shadow-2xl">
                    {[ 
                      {v:'Any', l:'m_any', i: <Music size={24}/>}, {v:'K-pop', l:'m_kpop', i: <Mic2 size={24}/>}, 
                      {v:'Pop', l:'m_pop', i: <Headphones size={24}/>}, {v:'Rock', l:'m_rock', i: <Guitar size={24}/>}, 
                      {v:'Hip Hop', l:'m_hiphop', i: <Speaker size={24}/>}, {v:'Jazz', l:'m_jazz', i: <Radio size={24}/>},
                      {v:'Classical', l:'m_classical', i: <Tv size={24}/>}, {v:'EDM', l:'m_edm', i: <Volume2 size={24}/>},
                      {v:'R&B', l:'m_rnb', i: <Music size={24}/>}, {v:'Country', l:'m_country', i: <Music size={24}/>},
                      {v:'Reggae', l:'m_reggae', i: <Music size={24}/>}
                     ].map((item) => {
                      const isSel = prefs.music === item.v;
                      return (
                        <button key={item.v} onClick={() => setPrefs({...prefs, music: item.v as any})}
                          className={`shrink-0 snap-center flex flex-col items-center justify-center gap-2 w-[70px] group transition-opacity ${isSel ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}>
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${isSel ? 'bg-amber-500/10 border-[1.5px] border-amber-500 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-transparent border-[1.5px] border-transparent'}`}>
                              <span className={`transition-transform ${isSel ? 'text-amber-500 scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'text-espresso-100 group-hover:scale-110'}`}>{item.i}</span>
                          </div>
                          <span className={`text-[12px] uppercase tracking-wider text-center ${isSel ? 'text-amber-500 font-bold' : 'text-espresso-200 font-semibold'}`}>{item.l === 'm_any' ? t(`curator.${item.l}`) : item.v.toUpperCase()}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}
          </div>

        {/* Step 4: Loading & Result */}
        {step === 4 && (
              <div className={`flex-1 flex flex-col animate-in fade-in duration-700 ${isLoading ? 'justify-center overflow-hidden' : 'overflow-x-hidden overflow-y-auto hide-scrollbar'}`}>
                {isLoading ? (
                   <div className="flex flex-col items-center justify-center p-8 text-center space-y-6 -mt-32">
                     <div className="relative">
                       <div className="w-20 h-20 border-4 border-espresso-700 border-t-amber-600 rounded-full animate-spin"></div>
                       <div className="absolute inset-0 flex items-center justify-center text-amber-600">
                         <Brain size={28} className="animate-pulse" />
                       </div>
                     </div>
                     <div>
                       <h2 className="text-2xl font-bold text-espresso-50 mb-2">{t('curator.status_analyzing')}</h2>
                       <p className="text-espresso-200 text-sm">{t('curator.status_desc')}</p>
                     </div>
                   </div>
                ) : recommendation ? (
                  <div className="px-6 pt-safe pb-32 space-y-8">
                     
                     {/* Premium Header Card */}
                     <div className="bg-gradient-to-br from-zinc-900 to-black border border-espresso-700 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden group">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-amber-600/10 blur-3xl rounded-full -mr-10 -mt-10"></div>
                       
                       <div className="flex items-start justify-between relative z-10 mb-4">
                           <div className="inline-block px-3 py-1 bg-amber-600/20 text-amber-500 text-[11px] font-bold tracking-widest uppercase rounded-full border border-amber-600/30">
                             Perfect Match
                           </div>
                           
                           {curationAd && (
                               <div className="w-32 h-10 md:h-12 flex justify-end transform origin-top-right">
                                   <NativeAdBanner ad={{...curationAd, size: 'SMALL'}} />
                               </div>
                           )}
                       </div>

                       <h1 className="text-3xl sm:text-4xl font-serif font-bold text-espresso-50 leading-tight mb-2 relative z-10">
                         {recommendation.bean.name}
                       </h1>
                       <div className="flex items-center gap-2 text-espresso-200 text-sm mb-6 relative z-10">
                         <Coffee size={14} className="text-amber-600" />
                         <span>Roasted by <strong className="text-espresso-50">{recommendation.brand.name}</strong></span>
                       </div>

                       <div className="flex flex-wrap gap-2 relative z-10">
                         <span className="bg-espresso-800/80 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-medium border border-espresso-600 text-espresso-100">
                           {recommendation.bean.roastLevel} Roast
                         </span>
                       </div>
                     </div>

                     {/* Sub Recommendations */}
                     {subRecommendations && subRecommendations.length > 0 && (
                       <div className="grid grid-cols-2 gap-3 mt-4">
                         {subRecommendations.map((sub, idx) => (
                           <div key={idx} className="bg-espresso-900/60 border border-espresso-700 rounded-2xl p-4 flex flex-col justify-between">
                             <div>
                               <div className="text-[10px] text-espresso-300 font-bold uppercase tracking-wider mb-1">
                                 {idx === 0 
                                     ? (i18n.language.startsWith('en') ? "2nd Pick" : "2순위 추천") 
                                     : (i18n.language.startsWith('en') ? "3rd Pick" : "3순위 추천")}
                               </div>
                               <h3 className="text-espresso-50 font-bold text-sm leading-tight mb-1">
                                 {sub.bean.name}
                               </h3>
                             </div>
                             <div className="flex items-center gap-1.5 text-espresso-300 text-[11px] mt-2">
                               <Coffee size={10} className="text-amber-700" />
                               <span className="truncate">{sub.brand.name}</span>
                             </div>
                           </div>
                         ))}
                       </div>
                     )}

                     {/* Main Content Area (Partially Visible / Blurred if not logged in) */}
                     <div className="relative">
                       {/* Top Part of AI Comment (Always Visible, but clamped if not logged in) */}
                        <div className={`bg-espresso-900/40 p-6 rounded-[2rem] border border-espresso-700/50 prose prose-invert prose-p:text-espresso-100 prose-headings:text-espresso-50 max-w-none ${!isLoggedIn ? 'max-h-[180px] overflow-hidden relative' : ''}`}>
                          <ReactMarkdown
                            components={{
                              strong: ({ node, ...props }) => <strong {...props} className="text-amber-500 font-bold bg-amber-500/10 px-1 py-0.5 rounded" />,
                              a: ({ node, ...props }) => {
                                const href = props.href || '';
                                const safeHref = href.startsWith('http') ? href : `https://${href}`;
                                return <a {...props} href={safeHref} target="_blank" rel="noopener noreferrer" className="text-pink-400 font-bold underline decoration-pink-500/30 hover:decoration-pink-500 underline-offset-2 transition-all px-1" />;
                              }
                            }}
                          >
                            {aiExplanation}
                          </ReactMarkdown>
                         {!isLoggedIn && (
                           <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#1b1b1e] to-transparent z-10"></div>
                         )}
                       </div>

                       <div className={!isLoggedIn ? "blur-[6px] pointer-events-none select-none opacity-40 mt-6" : "mt-8"}>
                         {/* Radar/Bar Taste Profile UI */}
                         <div className="bg-espresso-900/40 p-6 rounded-[2rem] border border-espresso-700/50 space-y-5">
                           <h3 className="text-lg font-bold text-espresso-50 mb-2">Taste Profile</h3>
                           {[ 
                             { label: t('curator.t_acidity_title'), val: recommendation.bean.acidity, color: 'bg-amber-500' },
                             { label: t('curator.t_sweetness_title'), val: recommendation.bean.sweetness, color: 'bg-rose-500' },
                             { label: t('curator.t_bitterness_title'), val: recommendation.bean.bitterness, color: 'bg-zinc-500' },
                             { label: t('curator.t_body_title'), val: recommendation.bean.body, color: 'bg-amber-600' }
                           ].map(t => (
                             <div key={t.label}>
                               <div className="flex justify-between text-xs font-medium text-espresso-200 mb-1.5">
                                 <span>{t.label}</span>
                                 <span>{t.val} / 5</span>
                               </div>
                               <div className="h-2 w-full bg-espresso-800 rounded-full overflow-hidden">
                                 <div className={`h-full ${t.color} rounded-full`} style={{width: `${(t.val/5)*100}%`}}></div>
                               </div>
                             </div>
                           ))}
                         </div>

                         {/* Map Skeleton Loader */}
                         {isMapLoading && (
                           <div className="bg-blue-950/20 p-6 mt-8 rounded-[2rem] border border-blue-900/30 animate-pulse">
                             <div className="h-6 w-48 bg-blue-900/40 rounded-full mb-6"></div>
                             <div className="space-y-3">
                               {[1, 2, 3].map((i) => (
                                 <div key={i} className="h-14 w-full bg-blue-900/20 rounded-xl border border-blue-800/10"></div>
                               ))}
                             </div>
                             <div className="mt-4 flex justify-center">
                               <div className="h-4 w-32 bg-blue-900/30 rounded-full"></div>
                             </div>
                           </div>
                         )}

                         {/* Nearby Specialty Shops Map Call-to-action */}
                         {!isMapLoading && nearbyShops && nearbyShops.length > 0 && (
                           <div className="bg-blue-950/20 p-6 mt-8 rounded-[2rem] border border-blue-900/30">
                             <h3 className="text-lg font-bold text-blue-400 mb-3 flex items-center gap-2">
                               <MapPin size={20} /> {t('curator.recommended_shops') || "Nearby Roasteries"}
                             </h3>
                             <div className="space-y-3 mb-6">
                               {nearbyShops.slice(0, 5).map((shop, i) => (
                                 <a key={i} href={shop.uri} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-blue-900/10 hover:bg-blue-900/30 rounded-xl border border-blue-800/30 transition-colors">
                                   <div className="min-w-0 pr-4">
                                     <div className="font-medium text-espresso-50 truncate">{shop.name}</div>
                                     <div className="text-[11px] text-espresso-300">
                                       {shop.distance !== undefined && shop.distance !== null ? (
                                         shop.distance < 1 
                                         ? t('curator.distance_m', {value: Math.round(shop.distance * 1000)})
                                         : t('curator.distance_km', {value: shop.distance.toFixed(1)})
                                       ) : ""}
                                     </div>
                                   </div>
                                   <ExternalLink size={16} className="text-blue-500 shrink-0" />
                                 </a>
                               ))}
                             </div>
                             <button 
                               onClick={() => {
                                 const latToPass = userLocation?.lat || 37.5665;
                                 const lngToPass = userLocation?.lng || 126.9780;
                                 navigate('/map', { 
                                     state: { 
                                         autoLocateLat: latToPass, 
                                         autoLocateLng: lngToPass,
                                         curatorShops: (window as any)._allCuratedShops || nearbyShops
                                     }
                                 });
                               }} 
                               className="w-full py-3 bg-blue-600/20 text-blue-400 font-bold rounded-xl text-sm hover:bg-blue-600/30 transition-colors border border-blue-600/30"
                             >
                               {t('curator.view_more_map')}
                             </button>
                           </div>
                         )}
                       </div>

                       {/* Login Overlay (Visible only to non-logged-in users) */}
                       {!isLoggedIn && (
                         <div className="absolute inset-0 flex flex-col items-center justify-center p-6 z-20">
                           <div className="bg-espresso-900/80 backdrop-blur-xl p-8 rounded-[2rem] border border-espresso-600/50 text-center space-y-4 shadow-2xl max-w-sm w-full mx-auto transform translate-y-[-10%]">
                             <div className="w-16 h-16 mx-auto bg-espresso-800/80 rounded-full flex flex-col items-center justify-center mb-4 ring-1 ring-zinc-700/50 shadow-inner">
                               <Coffee size={24} className="text-espresso-200" />
                             </div>
                             <h3 className="text-[17px] font-bold text-espresso-50 leading-snug">{t('curator.login_for_details')}</h3>
                             <div className="text-sm text-espresso-100 w-full mb-6 flex flex-col items-center">
                               <span>{t('profile.login_need_desc')}</span>
                             </div>
                             <button onClick={() => navigate('/profile')} className="w-full py-4 bg-gradient-to-r from-zinc-800 to-zinc-800 hover:from-amber-900/20 hover:to-blue-900/20 text-amber-500 font-bold rounded-[1.25rem] transition-all border border-espresso-600 hover:border-amber-600/50 shadow-[0_0_15px_rgba(34,211,238,0)] hover:shadow-[0_0_15px_rgba(34,211,238,0.15)] flex justify-center items-center gap-2">
                               {t('app.nav_login')} <ChevronRight size={18} />
                             </button>
                           </div>
                         </div>
                       )}
                     </div>

                     {/* Result Actions */}
                     <div className="flex flex-col gap-3 pt-4">
                       {isLoggedIn && (
                         <button onClick={handleSavePrescription} className="w-full py-4 bg-gradient-to-r from-amber-700 to-blue-600 hover:to-blue-500 text-espresso-50 font-bold rounded-[1.25rem] shadow-[0_0_20px_rgba(34,211,238,0.3)] flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                           <Save size={18} /> {t('curator.save_prescription')}
                         </button>
                       )}
                       <button onClick={reset} className="w-full py-4 bg-espresso-800 hover:bg-espresso-700 text-espresso-100 font-bold rounded-[1.25rem] transition-all active:scale-[0.98] border border-espresso-600">
                         {t('curator.btn_restart')}
                       </button>
                     </div>

                  </div>
                ) : (
                  <div className="p-8 text-center text-espresso-200 mt-20">Error analyzing your profile. Please try again.</div>
                )}
              </div>
            )}

        {/* Global Bottom Action Bar for Steps 1-3 */}
        {step > 0 && step < 4 && (
          <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-espresso-950 via-espresso-950 to-transparent pt-16 pb-safe-bottom z-50 px-6 pointer-events-none">
            <div className="flex flex-col items-center pointer-events-auto">
              <span className="text-[12px] text-espresso-200 uppercase tracking-widest font-bold mb-2 drop-shadow-md">TAP to proceed</span>
              
              {/* Nav Dots */}
              <div className="flex justify-center gap-1.5 mb-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${step === i ? 'w-1.5 bg-amber-500 shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'w-1.5 bg-espresso-700'}`} />
                ))}
              </div>
              
              {/* Next Button */}
              <button 
                onClick={step === 3 ? handleMatch : nextStep} 
                className="w-full max-w-[260px] py-[18px] bg-amber-500 text-espresso-50 font-extrabold uppercase tracking-widest text-[14px] rounded-[1.5rem] shadow-[0_0_30px_rgba(34,211,238,0.3)] active:scale-95 transition-transform mb-4"
              >
                {step === 3 ? t('curator.btn_finish') : "NEXT QUESTION"}
              </button>

              {/* Bottom edge navigation */}
              <div className="w-full max-w-[280px] mb-2 flex justify-between items-center">
                <button 
                  onClick={prevStep} 
                  className={`text-[12px] uppercase tracking-wider font-bold active:scale-95 px-4 py-2 transition-colors ${step === 1 ? 'opacity-0 pointer-events-none' : 'text-espresso-300 hover:text-espresso-50'}`}
                >
                  &lt; Back
                </button>
                <button 
                  onClick={reset}
                  className="text-[12px] uppercase tracking-wider font-bold text-espresso-300 hover:text-espresso-50 active:scale-95 px-4 py-2 transition-colors"
                >
                  Quit
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Hide scrollbar styles locally if not configured in tailwind */}
{/* Hide scrollbar styles locally if not configured in tailwind */}
{/* Hide scrollbar styles locally if not configured in tailwind */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .pb-safe-bottom { padding-bottom: max(env(safe-area-inset-bottom), 1rem); }
        .pt-safe { padding-top: max(env(safe-area-inset-top), 0.5rem); }
      `}} />

      {/* Save Title Prompt Modal */}
        {showSavePrompt && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-espresso-950/60 backdrop-blur-sm flex items-center justify-center p-4 px-6"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-espresso-900 border border-espresso-700 w-full max-w-sm rounded-[2rem] p-6 shadow-xl shadow-black/40 flex flex-col relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-600/5 to-fuchsia-500/5 pointer-events-none" />
              <h3 className="text-xl font-serif font-bold text-espresso-50 mb-2 relative z-10 drop-shadow-sm">{t('curator.save_modal_title')}</h3>
              <p className="text-[13px] text-espresso-200 mb-5 leading-relaxed relative z-10" dangerouslySetInnerHTML={{ __html: t('curator.save_modal_desc') }} />

              <input
                type="text"
                autoFocus
                placeholder={t('curator.save_modal_ph')}
                value={prescriptionTitle}
                onChange={(e) => setPrescriptionTitle(e.target.value)}
                className="w-full bg-espresso-900/50 border border-espresso-700 rounded-[1.25rem] px-4 py-3.5 text-[15px] font-medium text-espresso-50 placeholder:text-espresso-300 focus:outline-none focus:ring-1 focus:ring-amber-600 focus:border-amber-600 mb-6 relative z-10 shadow-inner"
                onKeyDown={(e) => { if (e.key === 'Enter') executeSave(); }}
              />

              <div className="flex gap-3 relative z-10">
                <button
                  onClick={() => setShowSavePrompt(false)}
                  className="flex-1 py-3.5 rounded-[1.25rem] font-bold text-[14px] text-espresso-200 bg-espresso-800/50 border border-espresso-600 hover:bg-espresso-800 hover:text-espresso-50 transition-colors"
                >
                  {t('curator.btn_cancel')}
                </button>
                <button
                  onClick={() => executeSave()} disabled={isSaving}
                  className="flex-[2] py-3.5 rounded-[1.25rem] font-bold text-[14px] text-espresso-50 bg-gradient-to-r from-amber-700 to-blue-600 hover:to-blue-500 transition-colors disabled:opacity-70 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                >
                  {isSaving ? t('curator.status_saving') : t('curator.btn_save')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Custom Auto-Save Limit Warning Modal */}
        {showLimitWarning && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-espresso-950/60 backdrop-blur-sm flex items-center justify-center p-4 px-6"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-espresso-900 border border-espresso-700 w-full max-w-sm rounded-[2rem] p-6 shadow-xl shadow-black/40 flex flex-col relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-600/5 to-fuchsia-500/5 pointer-events-none" />
              
              <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mb-4 relative z-10 border border-amber-500/30">
                <Coffee size={24} className="text-amber-500" />
              </div>
              
              <h3 className="text-xl font-serif font-bold text-espresso-50 mb-3 relative z-10 drop-shadow-sm">자동 저장 실패 안내</h3>
              <p className="text-[14px] text-espresso-200 mb-6 leading-relaxed relative z-10 break-keep">
                무료 제공 한도가 모두 소진되어 앱 재시작 시 이전 처방전을 백그라운드에서 자동 저장하지 못했습니다.<br/><br/>
                화면 하단의 <strong className="text-amber-500">수동 저장</strong> 버튼을 클릭하여 포인트를 사용해 안전하게 보관해 주세요.
              </p>

              {/* Checkbox for \"Do not show again\" */}
              <div 
                className="flex items-center gap-3 mb-6 relative z-10 cursor-pointer group w-max" 
                onClick={() => setHideLimitWarningNextTime(!hideLimitWarningNextTime)}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${hideLimitWarningNextTime ? 'bg-amber-500 border-amber-500' : 'border-espresso-500 group-hover:border-amber-400'}`}>
                  {hideLimitWarningNextTime && <CheckCircle2 size={16} className="text-espresso-900" />}
                </div>
                <span className="text-[14px] font-medium text-espresso-300 group-hover:text-espresso-100 transition-colors">다시 보지 않기</span>
              </div>

              <div className="flex relative z-10">
                <button
                  onClick={() => {
                    if (hideLimitWarningNextTime) {
                        localStorage.setItem('bm_hide_limit_warning', 'true');
                    }
                    setShowLimitWarning(false);
                  }}
                  className="w-full py-4 rounded-[1.25rem] font-bold text-[15px] letter-spacing-wide text-espresso-50 bg-espresso-800 border-2 border-espresso-600 hover:bg-espresso-700 hover:border-espresso-500 active:scale-95 transition-all"
                >
                  확인
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
