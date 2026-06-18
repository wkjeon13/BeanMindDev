import { create } from 'zustand';
import { UserPreferences, CoffeeBean, Brand } from '../types';
import { COFFEE_BEANS, BRANDS } from '../data/coffeeData';
import { API_BASE } from '../utils/apiConfig';
import { Geolocation } from '@capacitor/geolocation';
import { clearHomeCache } from '../pages/Home';

export const getUserId = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.id || 'anon';
    }
  } catch {}
  return 'anon';
};

const loadSave = <T,>(baseKey: string, fallback: T): T => {
  try {
    const key = `${baseKey}_${getUserId()}`;
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : fallback;
  } catch { return fallback; }
}

const saveLocal = (baseKey: string, value: any) => {
    try {
        localStorage.setItem(`${baseKey}_${getUserId()}`, JSON.stringify(value));
    } catch {}
}

function findBestLocalBeans(prefs: any) {
  const targetAcidity = prefs.tasteAcidity ?? 3;
  const targetSweetness = prefs.tasteSweetness ?? 3;
  const targetBitterness = prefs.tasteBitterness ?? 3;
  const targetBody = prefs.tasteBody ?? 3;

  const scoredBeans = COFFEE_BEANS.map(bean => {
    const dAcidity = bean.acidity - targetAcidity;
    const dSweetness = bean.sweetness - targetSweetness;
    const dBitterness = bean.bitterness - targetBitterness;
    const dBody = bean.body - targetBody;
    const distance = dAcidity*dAcidity + dSweetness*dSweetness + dBitterness*dBitterness + dBody*dBody;
    return { bean, distance };
  });

  scoredBeans.sort((a, b) => a.distance - b.distance);

  const bestBean = scoredBeans[0].bean;
  const secondBean = scoredBeans[1].bean;

  const bestBrand = BRANDS.find(b => b.beans.includes(bestBean.id)) || BRANDS[0];
  const secondBrand = BRANDS.find(b => b.beans.includes(secondBean.id)) || BRANDS[1];

  return {
    matchRec: { bean: bestBean, brand: bestBrand },
    subRecs: [
      { bean: secondBean, brand: secondBrand },
      { bean: scoredBeans[2]?.bean || COFFEE_BEANS[2], brand: BRANDS.find(b => b.beans.includes(scoredBeans[2]?.bean?.id)) || BRANDS[2] }
    ]
  };
}

function getRecommendedSongs(genre: string) {
  const songs: Record<string, { kr: string; en: string }> = {
    'K-pop': {
      kr: `- **국내 추천**: [아이유 - 밤편지](https://music.youtube.com/search?q=아이유+밤편지)\n- **해외 추천**: [NewJeans - Ditto](https://music.youtube.com/search?q=NewJeans+Ditto)`,
      en: `- **Korean**: [IU - Through the Night](https://music.youtube.com/search?q=IU+Through+the+Night)\n- **Global**: [NewJeans - Ditto](https://music.youtube.com/search?q=NewJeans+Ditto)`
    },
    'Jazz': {
      kr: `- **국내 추천**: [윤석철 트리오 - 즐겁게, 음악.](https://music.youtube.com/search?q=윤석철+트리오+즐겁게+음악)\n- **해외 추천**: [Bill Evans - My Foolish Heart](https://music.youtube.com/search?q=Bill+Evans+My+Foolish+Heart)`,
      en: `- **Korean**: [Yun Seok Cheol Trio - Merry-Go-Round](https://music.youtube.com/search?q=Yun+Seok+Cheol+Trio+Merry-Go-Round)\n- **Global**: [Bill Evans - My Foolish Heart](https://music.youtube.com/search?q=Bill+Evans+My+Foolish+Heart)`
    },
    'Pop': {
      kr: `- **국내 추천**: [백예린 - Square (2017)](https://music.youtube.com/search?q=백예린+Square)\n- **해외 추천**: [Lauv - Paris in the Rain](https://music.youtube.com/search?q=Lauv+Paris+in+the+Rain)`,
      en: `- **Korean**: [Yerin Baek - Square (2017)](https://music.youtube.com/search?q=Yerin+Baek+Square)\n- **Global**: [Lauv - Paris in the Rain](https://music.youtube.com/search?q=Lauv+Paris+in+the+Rain)`
    },
    'R&B': {
      kr: `- **국내 추천**: [딘(DEAN) - D (Half Moon)](https://music.youtube.com/search?q=DEAN+D+Half+Moon)\n- **해외 추천**: [H.E.R. - Best Part](https://music.youtube.com/search?q=H.E.R.+Best+Part)`,
      en: `- **Korean**: [DEAN - D (Half Moon)](https://music.youtube.com/search?q=DEAN+D+Half+Moon)\n- **Global**: [H.E.R. - Best Part](https://music.youtube.com/search?q=H.E.R.+Best+Part)`
    },
    'Classical': {
      kr: `- **국내 추천**: [임윤찬 - Liszt: Transcendental Études](https://music.youtube.com/search?q=Lim+Yunchan+Liszt)\n- **해외 추천**: [Chopin - Nocturne No. 2](https://music.youtube.com/search?q=Chopin+Nocturne+No.2)`,
      en: `- **Korean**: [Yunchan Lim - Liszt: Transcendental Études](https://music.youtube.com/search?q=Lim+Yunchan+Liszt)\n- **Global**: [Chopin - Nocturne No. 2](https://music.youtube.com/search?q=Chopin+Nocturne+No.2)`
    },
    'Rock': {
      kr: `- **국내 추천**: [넬(NELL) - 기억을 걷는 시간](https://music.youtube.com/search?q=NELL+기억을+걷는+시간)\n- **해외 추천**: [Coldplay - Yellow](https://music.youtube.com/search?q=Coldplay+Yellow)`,
      en: `- **Korean**: [NELL - Time Walking on Memory](https://music.youtube.com/search?q=NELL+Time+Walking+on+Memory)\n- **Global**: [Coldplay - Yellow](https://music.youtube.com/search?q=Coldplay+Yellow)`
    },
    'Hip Hop': {
      kr: `- **국내 추천**: [빈지노 - 여행 Next 30](https://music.youtube.com/search?q=빈지노+여행)\n- **해외 추천**: [Loyle Carner - Ottolenghi](https://music.youtube.com/search?q=Loyle+Carner+Ottolenghi)`,
      en: `- **Korean**: [Beenzino - Travel](https://music.youtube.com/search?q=Beenzino+Travel)\n- **Global**: [Loyle Carner - Ottolenghi](https://music.youtube.com/search?q=Loyle+Carner+Ottolenghi)`
    },
    'EDM': {
      kr: `- **국내 추천**: [SHAUN - Way Back Home](https://music.youtube.com/search?q=SHAUN+Way+Back+Home)\n- **해외 추천**: [Avicii - Wake Me Up](https://music.youtube.com/search?q=Avicii+Wake+Me+Up)`,
      en: `- **Korean**: [SHAUN - Way Back Home](https://music.youtube.com/search?q=SHAUN+Way+Back+Home)\n- **Global**: [Avicii - Wake Me Up](https://music.youtube.com/search?q=Avicii+Wake+Me+Up)`
    },
    'Any': {
      kr: `- **국내 추천**: [김동률 - 출발](https://music.youtube.com/search?q=김동률+출발)\n- **해외 추천**: [Norah Jones - Don't Know Why](https://music.youtube.com/search?q=Norah+Jones+Don't+Know+Why)`,
      en: `- **Korean**: [Kim Dong Ryul - Departure](https://music.youtube.com/search?q=Kim+Dong+Ryul+Departure)\n- **Global**: [Norah Jones - Don't Know Why](https://music.youtube.com/search?q=Norah+Jones+Don't+Know+Why)`
    }
  };
  return songs[genre] || songs['Any'];
}

function generateLocalEssay(bean: CoffeeBean, brand: Brand, prefs: any, language: string) {
  const isEnglish = language.startsWith('en');
  const userGenre = prefs.music || prefs.musicGenre || 'Any';
  const recSongs = getRecommendedSongs(userGenre);
  
  if (isEnglish) {
    return `### 🌸 A Moment of Clarity with ${bean.name}

**1. Perfectly Tuned Flavors**
This selection features an acidity level of ${bean.acidity}/5 and sweetness of ${bean.sweetness}/5, designed specifically to match your preference for a ${prefs.caffeine} ${prefs.base} brew during this ${prefs.timeOfDay} time under ${prefs.weather} weather.

**2. Premium Craftsmanship**
Roasted by **${brand.name}**, the ${bean.roastLevel} roast level provides a body of ${bean.body}/5, creating a balanced and comforting sensation that perfectly suits your ${prefs.condition} mood.

---

### 🥐 Recommended Dessert Pairing
We highly recommend pairing this with a fresh **${bean.foodPairing?.[0]?.name || 'Butter Croissant'}**. ${bean.foodPairing?.[0]?.description || 'The light, flaky texture balances the coffee profile beautifully.'}

### 🎵 Recommended Music Playlist
While savoring the coffee, we recommend tuning in to these tracks matching your music taste (**${userGenre}**):
${recSongs.en}

Let the gentle melodies blend seamlessly with the warm aroma of the coffee and the current ${prefs.weather} weather.`;
  } else {
    return `어느덧 하루의 끝자락, ${prefs.weather} 날씨 속에서 당신의 지친 마음을 어루만져줄 특별한 한 잔을 준비했습니다.

### 🌸 ${bean.name}, 당신을 위한 완벽한 선택인 이유

**1. 맞춤형 향미 밸런스**
산미 ${bean.acidity}/5와 단맛 ${bean.sweetness}/5의 정교한 프로파일은 현재 ${prefs.timeOfDay}에 즐기기에 이상적이며, 사용자가 선호하는 ${prefs.base} 스타일의 매력을 극대화해 줍니다.

**2. 숙련된 로스팅의 깊이**
**${brand.name}**에서 세심히 다듬은 ${bean.roastLevel} 로스팅은 바디감 ${bean.body}/5를 선사하여, 지금의 ${prefs.condition} 기분과 차분하게 녹아드는 편안함을 안겨줍니다.

---

### 🥐 추천 디저트 페어링
이 커피와 가장 잘 어울리는 디저트로 달콤하고 고소한 **${bean.foodPairing?.[0]?.name || '버터 크로와상'}**을 추천합니다. ${bean.foodPairing?.[0]?.description || '바삭하고 고소한 식감이 원두 고유의 산미와 밸런스를 조화롭게 이루어 줍니다.'}

### 🎵 추천 음악 플레이리스트
따뜻한 커피를 음미하는 동안, 선택하신 음악 취향(**${userGenre === 'Any' ? '인디 음악' : userGenre}**)에 맞춰 선별한 아래 플레이리스트를 들어보세요. 
${recSongs.kr}

부드러운 음악의 선율이 ${prefs.weather} 날씨의 감성을 한층 더 풍요롭게 채워줄 것입니다.`;
  }
}

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface CuratorState {
  step: number;
  direction: number;
  prefs: UserPreferences;
  recommendation: { bean: CoffeeBean; brand: Brand } | null;
  subRecommendations: { bean: CoffeeBean; brand: Brand }[];
  aiExplanation: string;
  nearbyShops: any[];
  userLocation: { lat: number, lng: number } | null;
  curationAd: any;
  isLoading: boolean;
  isMapLoading: boolean;

  setStep: (step: number | ((prev: number) => number)) => void;
  setDirection: (dir: number) => void;
  setPrefs: (prefs: UserPreferences | ((prev: UserPreferences) => UserPreferences)) => void;
  setRecommendation: (rec: { bean: CoffeeBean; brand: Brand } | null) => void;
  setAiExplanation: (exp: string) => void;
  setCurationAd: (ad: any) => void;
  startMatch: (language: string) => Promise<void>;
  reset: () => void;
  syncStateToStorage: () => void;
}

export const useCuratorStore = create<CuratorState>((set, get) => ({
  step: loadSave('coffee_step', 0),
  direction: 0,
  prefs: loadSave('coffee_prefs', {
    base: 'Drip', caffeine: 'Regular', equipment: 'Hand Drip', flavorNotes: [],
    tasteAcidity: 3, tasteSweetness: 3, tasteBitterness: 3, tasteBody: 3,
    season: 'Spring', timeOfDay: 'Night', condition: 'Relaxed', weather: 'Sunny',
    healthStatus: 'None', musicGenre: 'Any',
    milkPreference: 'Black', roastLevel: 'Medium', experienceLevel: 'Daily', budget: 'Daily', includeMapSearch: true
  }),
  recommendation: loadSave('coffee_rec', null),
  subRecommendations: loadSave('coffee_sub_rec', []),
  aiExplanation: loadSave('coffee_exp', ""),
  nearbyShops: loadSave('coffee_shops', []),
  userLocation: loadSave('coffee_loc', null),
  curationAd: loadSave('coffee_ad', null),
  isLoading: false,
  isMapLoading: false,

  syncStateToStorage: () => {
      const state = get();
      saveLocal('coffee_step', state.step);
      saveLocal('coffee_prefs', state.prefs);
      saveLocal('coffee_rec', state.recommendation);
      saveLocal('coffee_sub_rec', state.subRecommendations);
      saveLocal('coffee_exp', state.aiExplanation);
      saveLocal('coffee_shops', state.nearbyShops);
      saveLocal('coffee_loc', state.userLocation);
      saveLocal('coffee_ad', state.curationAd);
  },

  setStep: (stepArg) => {
      set((state) => {
          const newStep = typeof stepArg === 'function' ? stepArg(state.step) : stepArg;
          saveLocal('coffee_step', newStep);
          return { step: newStep };
      });
  },
  setDirection: (direction) => set({ direction }),
  setPrefs: (prefsArg) => {
      set((state) => {
          const newPrefs = typeof prefsArg === 'function' ? prefsArg(state.prefs) : prefsArg;
          saveLocal('coffee_prefs', newPrefs);
          return { prefs: newPrefs };
      });
  },
  setRecommendation: (rec) => {
      set({ recommendation: rec });
      saveLocal('coffee_rec', rec);
  },
  setAiExplanation: (aiExplanation) => {
      set({ aiExplanation });
      saveLocal('coffee_exp', aiExplanation);
  },
  setCurationAd: (curationAd) => {
      set({ curationAd });
      saveLocal('coffee_ad', curationAd);
  },

  reset: () => {
    set({ direction: -1, step: 0, recommendation: null, subRecommendations: [], aiExplanation: "", nearbyShops: [] });
    get().syncStateToStorage();
  },

  startMatch: async (langParam: string) => {
    const language = langParam || 'ko';
    // ---- PERFORMANCE TRACKING INJECTION ----
    const perfLogs: string[] = [];
    (window as any).curatorPerfLogs = perfLogs;
    const tStart = performance.now();
    let tLast = tStart;
    const measure = (step: string) => {
      const now = performance.now();
      const diff = now - tLast;
      const total = now - tStart;
      const logStr = `\n[${step}] 소요시간: ${diff.toFixed(0)}ms (누적: ${total.toFixed(0)}ms)`;
      perfLogs.push(logStr);
      console.log(logStr);
      tLast = now;
    };
    // ----------------------------------------
    measure("1. 초기화 및 상태 초기 세팅 시작");

    const state = get();
    const token = localStorage.getItem('token');
    
    // [PRE-FLIGHT CHECK] Does the user have enough points to burn expensive LLM tokens?
    if (token) {
        try {
            const eligRes = await fetch(`${API_BASE}/api/users/ai-eligibility`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (eligRes.status === 403) {
                alert("보유한 커피콩(포인트)이 부족하여 처방전을 발급할 수 없습니다.");
                return; // ⛔ Completely halt the generation process!
            }
        } catch(e) { /* Proceed anyway if network error */ }
    }

    set({ direction: 1, isLoading: true, isMapLoading: true, step: 4, nearbyShops: [], curationAd: null });
    
    saveLocal('coffee_step', 4);
    saveLocal('coffee_shops', []);
    localStorage.removeItem('bm_curation_ad');

    const targetCountryCode = language.startsWith('en') ? 'US' : 'KR';

    measure("2. 광고(Ads) 백그라운드 Fetch 시작");
    fetch(`${API_BASE}/api/community/ads?tags=${encodeURIComponent(state.prefs.flavorNotes.join(','))}&country=${targetCountryCode}`)
      .then(res => res.json())
      .then(ads => {
        if (ads && ads.length > 0) {
            const targetAds = ads.filter((a: any) => a.placement === 'CURATOR_RESULT' || a.type === 'TEXT_LINK');
            if (targetAds.length > 0) {
                set({ curationAd: targetAds[0] });
                saveLocal('coffee_ad', targetAds[0]);
                localStorage.setItem('bm_curation_ad', JSON.stringify(targetAds[0]));
            } else {
                localStorage.removeItem('bm_curation_ad');
            }
        }
      }).catch(() => localStorage.removeItem('bm_curation_ad'));

    measure("3. 현재 위치(GPS) 및 유저 정보 확인 로직 시작");
    
    // 1. Force Request native location permissions upfront to trigger Android prompt
    try {
        const perm = await Geolocation.checkPermissions();
        if (perm.location !== 'granted') {
            await Geolocation.requestPermissions();
        }
    } catch (e) {
        console.warn("Capacitor Location Permission Request failed:", e);
    }

    // 2. Retrieve potential fallback coordinates (Default to Pangyo Station 37.4020, 127.1086)
    let fallbackLat = 37.4020;
    let fallbackLng = 127.1086;
    let hasLoadedCoords = false;
    
    // 1st Priority: Read highly-accurate, fresh sessionStorage coordinates (which were locked natively in the Coffee Map)
    try {
        const savedLoc = sessionStorage.getItem('bm_user_loc');
        if (savedLoc) {
            const parsed = JSON.parse(savedLoc);
            if (Array.isArray(parsed) && parsed.length === 2) {
                fallbackLat = parseFloat(parsed[0]);
                fallbackLng = parseFloat(parsed[1]);
                hasLoadedCoords = true;
            } else if (parsed && parsed.lat && parsed.lng) {
                fallbackLat = parseFloat(parsed.lat);
                fallbackLng = parseFloat(parsed.lng);
                hasLoadedCoords = true;
            }
        }
    } catch(e) {}
    
    // 2nd Priority: If sessionStorage was empty, fall back to historical localStorage cache
    if (!hasLoadedCoords && state.userLocation && state.userLocation.lat && state.userLocation.lng) {
        fallbackLat = state.userLocation.lat;
        fallbackLng = state.userLocation.lng;
    }

    let currentLatitude = fallbackLat;
    let currentLongitude = fallbackLng;
    
    const userObj = localStorage.getItem('user');
    const userProfile = userObj ? JSON.parse(userObj) : null;
    const userAgeGroup = userProfile?.ageGroup || "알 수 없음";
    const userGender = userProfile?.gender || "알 수 없음";
    const userFavCafe = userProfile?.favoriteCafe || "없음";

    const posPromise = (async () => {
      try {
        const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
        return { lat: position.coords.latitude, lng: position.coords.longitude };
      } catch (err) {
        console.warn("Capacitor Geolocation failed:", err);
        return null;
      }
    })();

    const timeoutPromise = new Promise<{lat: number, lng: number} | null>((resolve) => setTimeout(() => resolve(null), 5000));
    
    const fastPos = await Promise.race([posPromise, timeoutPromise]);
    if (fastPos) {
      currentLatitude = fastPos.lat;
      currentLongitude = fastPos.lng;
      
      // Update store and session cache immediately for seamless coordination across map and curator
      set({ userLocation: { lat: currentLatitude, lng: currentLongitude } });
      saveLocal('coffee_loc', { lat: currentLatitude, lng: currentLongitude });
      sessionStorage.setItem('bm_user_loc', JSON.stringify([currentLatitude, currentLongitude]));
    } else {
      console.warn("Location took >5s, falling back to store/session cached coords:", currentLatitude, currentLongitude);
    }
    measure("4. 단기 GPS (5s Timeout Race) 완료");
    
    set({ userLocation: { lat: currentLatitude, lng: currentLongitude } });
    saveLocal('coffee_loc', { lat: currentLatitude, lng: currentLongitude });

    let countryName = "South Korea";
    let countryPromise = fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${currentLatitude}&longitude=${currentLongitude}&localityLanguage=en`)
        .then(res => res.json())
        .then(data => data.countryName || "South Korea")
        .catch(() => "South Korea");

    measure("5. 국가 역지오코딩(Reverse Geocode) 대기 시작");
    try {
      countryName = await Promise.race([
        countryPromise,
        new Promise<string>(resolve => setTimeout(() => resolve("South Korea"), 1500))
      ]);
      measure("6. 국가 역지오코딩(Reverse Geocode) 완료 (최대 1.5초 타임아웃 방어)");
      const targetLanguage = language.startsWith('en') ? 'English' : 'Korean';

      measure("6-1. AI 동적 원두 생성 시작 (Gemini API 호출)");
      let matchRec: any = null;
      let subRecs: any[] = [];
      
      try {
          const aiRecRes = await fetch(`${API_BASE}/api/ai-features/curator-recommend`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
              body: JSON.stringify({
                  prefs: state.prefs,
                  userAgeGroup,
                  userGender,
                  language
              })
          });
          if (!aiRecRes.ok) throw new Error("AI Recommendation failed");
          const aiRecData = await aiRecRes.json();
          matchRec = aiRecData;
          
          // Generate dummy sub recommendations to preserve UI (since we only generate 1 perfect match)
          subRecs = [
              { bean: { ...aiRecData.bean, name: aiRecData.bean.name + " (Alternative Roasting)", acidity: Math.max(1, aiRecData.bean.acidity - 1) }, brand: aiRecData.brand },
              { bean: { ...aiRecData.bean, name: aiRecData.bean.name + " (Sweet Focus)", sweetness: Math.min(5, aiRecData.bean.sweetness + 1) }, brand: aiRecData.brand }
          ];
      } catch (err) {
          console.error("AI Recommendation API Error, falling back to heuristic:", err);
          const fallbackMatch = findBestLocalBeans(state.prefs);
          matchRec = fallbackMatch.matchRec;
          subRecs = fallbackMatch.subRecs;
      }
      
      const bestBean = matchRec.bean;
      const bestBrand = matchRec.brand;

      // JSON 파싱 대기 없이 즉각 화면 전환!
      set({
         isLoading: false,
         recommendation: matchRec,
         subRecommendations: subRecs,
         aiExplanation: "" // Reset for streaming
      });
      measure("6-2. UI(결과화면) 즉각 이동 완료 및 스피너 종료");
      
      const prompt = `You are a master coffee sommelier.
Based on the user's demographic, contextual environment, health concerns, explicit taste preferences, AND the assigned coffee bean recommendation, dynamically generate the perfect coffee prescription essay.

CRITICAL INSTRUCTION: You MUST write the ENTIRE response strictly in ${targetLanguage.toUpperCase()}. Do not use any other language!
DO NOT GENERATE ANY JSON DATA. Please write directly in Markdown formatting.
You MUST write exactly in this format structure with these EXACT headers:

[${state.prefs.timeOfDay}, ${state.prefs.weather}, ${state.prefs.condition} 에 관한 감성적인 시적 도입부 1~2문장]

### 🌸 [Creative Title], ${targetLanguage === 'English' ? 'Why it is the perfect choice for you' : '당신을 위한 완벽한 선택인 이유'}

**1. [Catchy Point 1]**
[Why flavor profile or acidity matches condition]

**2. [Catchy Point 2]**
[Why roast level or body matches condition]

---

### 🥐 ${targetLanguage === 'English' ? 'Recommended Dessert Pairing' : '추천 디저트 페어링'}
[Suggest a specific bakery item like bread, cake, cookie, or chocolate that pairs perfectly with this bean, explaining WHY it matches the flavor profile. Make it sound delicious!]
[CRITICAL: You MUST wrap the specific dessert name in bold markdown (**Dessert Name**) so it can be highlighted in the UI.]

### 🎵 ${targetLanguage === 'English' ? 'Recommended Music Playlist' : '추천 음악 플레이리스트'}
[Suggest at least one domestic song (from ${countryName}) and at least one international/foreign song. If the user selected a specific music genre ("${state.prefs.music || state.prefs.musicGenre || 'Any'}"), you MUST heavily prioritize that genre. If it is "Any", choose whatever fits best.]
[CRITICAL: Ensure you highly prioritize the Nostalgia element (User age: ${userAgeGroup}, gender: ${userGender}).]
[CRITICAL: Use the Randomization Seed below to avoid cliché tracks. Relevancy to weather(${state.prefs.weather}) and mood(${state.prefs.condition}) is paramount.]
[CRITICAL: DO NOT use simple bullet point lists for the songs. Instead, weave the recommended song titles seamlessly into an emotional, poetic paragraph describing how the music blends with the coffee and current weather. You MUST format the embedded song names as YouTube Music markdown hyperlinks. Example format: "창밖으로 내리는 빗소리를 들으며, [Neil Young - Harvest Moon](https://music.youtube.com/search?q=Neil+Young+Harvest+Moon)의 아련한 선율이 따스한 커피 향과 어울립니다..."]

--- CONTEXT ---
Recommended Bean: ${JSON.stringify(bestBean)}
Recommended Brand: ${JSON.stringify(bestBrand)}
Demographics: Age: ${userAgeGroup}, Gender: ${userGender}, Favorite Cafe: ${userFavCafe}.
Environment: ${state.prefs.season} season, ${state.prefs.timeOfDay} time, feeling ${state.prefs.condition}, Weather: ${state.prefs.weather}.
Preferences: ${JSON.stringify(state.prefs)}
Randomization Seed: ${Math.random() * Date.now()}`;

      measure(`7. Gemini 스트리밍 재생 기동`);
      
      let fullText = "☕ 특별한 커피 에세이를 작성하는 중입니다...";
      set({ aiExplanation: fullText }); // 즉각 문구를 뿌려서 화면 공백 방지
      
      try {
          let res = await fetch(`${API_BASE}/api/ai-features/stream-curation`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                  contents: [{ role: "user", parts: [{ text: prompt }] }],
                  generationConfig: { temperature: 0.8 }
              })
          });
          
          if (!res.ok) throw new Error("Gemini fetch error");

          fullText = ""; // 스트리밍 시작되면 문구 지우기
          const reader = res.body?.getReader();
          const decoder = new TextDecoder("utf-8");
          if (reader) {
             while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunkStr = decoder.decode(value, { stream: true });
                const lines = chunkStr.split('\n');
                for (let line of lines) {
                   line = line.trim();
                   if (line.startsWith('data: ')) {
                      const dataStr = line.substring(6).trim();
                      try {
                         const dataObj = JSON.parse(dataStr);
                         const content = dataObj.candidates?.[0]?.content?.parts?.[0]?.text || "";
                         if (content) {
                            fullText += content;
                            set({ aiExplanation: fullText });
                            await new Promise(r => setTimeout(r, 5));
                         }
                      } catch(e) {}
                   }
                }
             }
          }
      } catch (err) {
          console.warn("Gemini stream error, falling back to local essay:", err);
          const localEssay = generateLocalEssay(bestBean, bestBrand, state.prefs, language);
          set({ aiExplanation: localEssay });
      }
      
      // 최종 검증: 에세이가 없거나 로딩 문구 상태로 멈춘 경우
      if (!get().aiExplanation || get().aiExplanation === "☕ 특별한 커피 에세이를 작성하는 중입니다...") {
          const localEssay = generateLocalEssay(bestBean, bestBrand, state.prefs, language);
          set({ aiExplanation: localEssay });
      }
      
      measure(`8-2. 타자 애니메이션 완료`);

      // Inject the generated bean metadata silently
      const prefData = {
          tasteAcidity: state.prefs.tasteAcidity,
          tasteSweetness: state.prefs.tasteSweetness,
          tasteBitterness: state.prefs.tasteBitterness,
          tasteBody: state.prefs.tasteBody
      };
      const encodedData = `\n\n<!-- BEANDATA: ${JSON.stringify(bestBean)} -->\n<!-- PREFDATA: ${JSON.stringify(prefData)} -->`;
      set({ aiExplanation: get().aiExplanation + encodedData });

      const finalState = get();
      saveLocal('coffee_rec', finalState.recommendation);
      saveLocal('coffee_sub_rec', finalState.subRecommendations);
      saveLocal('coffee_exp', finalState.aiExplanation);
      
      localStorage.setItem('bm_sync_presc', JSON.stringify({ 
          recommendation: finalState.recommendation, 
          subRecommendations: finalState.subRecommendations, 
          aiExplanation: finalState.aiExplanation, 
          nearbyShops: [] 
      }));
    } catch (error: any) {
      console.error("AI Error:", error);
      const fallbackMatch = findBestLocalBeans(state.prefs);
      const localEssay = generateLocalEssay(fallbackMatch.matchRec.bean, fallbackMatch.matchRec.brand, state.prefs, language);
      const prefData = {
          tasteAcidity: state.prefs.tasteAcidity,
          tasteSweetness: state.prefs.tasteSweetness,
          tasteBitterness: state.prefs.tasteBitterness,
          tasteBody: state.prefs.tasteBody
      };
      const encodedData = `\n\n<!-- BEANDATA: ${JSON.stringify(fallbackMatch.matchRec.bean)} -->\n<!-- PREFDATA: ${JSON.stringify(prefData)} -->`;
      const finalEssay = localEssay + encodedData;
      set({
         isLoading: false,
         isMapLoading: false,
         recommendation: fallbackMatch.matchRec,
         subRecommendations: fallbackMatch.subRecs,
         aiExplanation: finalEssay
      });
      saveLocal('coffee_rec', fallbackMatch.matchRec);
      saveLocal('coffee_sub_rec', fallbackMatch.subRecs);
      saveLocal('coffee_exp', finalEssay);
    }

    try {
      if (localStorage.getItem('token')) {
        fetch(`${API_BASE}/api/users/ai-usage`, {
          method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
        .then(async (res) => {
          if (res.ok) {
            const meRes = await fetch(`${API_BASE}/api/users/me`, {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (meRes.ok) {
              const resData = await meRes.json();
              const meData = resData.data || resData;
              localStorage.setItem('user', JSON.stringify(meData));
              clearHomeCache();
            }
          }
        })
        .catch(e => console.warn(e));
      } else {
        const vId = localStorage.getItem('visitor_id');
        if (vId) {
          fetch(`${API_BASE}/api/analytics/ai-usage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visitorId: vId })
          }).catch(e => console.warn(e));
        }
      }
    } catch (e) {
      console.warn("Telemetry error:", e);
    }

    // UI already unlocked at 6-2

    // Background Fetch Maps - COMPLETELY DETACHED to prevent network stack collision
    if (get().prefs.includeMapSearch === false) {
        console.log("Map search skipped by user preference.");
        set({ nearbyShops: [], isMapLoading: false });
        // Update bm_sync_presc with empty nearby shops to ensure UI isn't stale
        const cur = JSON.parse(localStorage.getItem('bm_sync_presc') || '{}');
        cur.nearbyShops = [];
        localStorage.setItem('bm_sync_presc', JSON.stringify(cur));
        return;
    }

    setTimeout(async () => {
        const finalPos = await posPromise;
        if (finalPos) {
          currentLatitude = finalPos.lat;
          currentLongitude = finalPos.lng;
        }
        try {
          const mapPrompt = `List up to 30 famous specialty coffee shops near the following location (Latitude: ${currentLatitude}, Longitude: ${currentLongitude}). Maximize the number of results up to 30.
            Respond ONLY with a valid JSON array of objects.
            Format EXACTLY like this example: 
            [{"name": "Anthracite Coffee", "lat": 37.545, "lng": 126.918}]
            Ensure the names are in ${language.startsWith('en') ? 'English' : 'Korean'} if possible.`;

          const mapsResponse = await fetch(`${API_BASE}/api/ai-features/map-shops`, {
              method: 'POST',
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  promptStr: mapPrompt,
                  currentLatitude: currentLatitude,
                  currentLongitude: currentLongitude,
                  language: language
              })
          });
          
          if (!mapsResponse.ok) throw new Error("Empty maps response");

          const mapData = await mapsResponse.json();
          let parsedData: any[] = mapData.shops || [];

        let anchorLat = currentLatitude;
        let anchorLng = currentLongitude;
        
        for (const s of parsedData) {
            const rawLat = s.lat !== undefined ? s.lat : s.latitude;
            const rawLng = s.lng !== undefined ? s.lng : s.longitude;
            if (rawLat !== undefined && rawLng !== undefined && !isNaN(parseFloat(rawLat)) && !isNaN(parseFloat(rawLng))) {
                anchorLat = parseFloat(rawLat);
                anchorLng = parseFloat(rawLng);
                break;
            }
        }

        // 1. Fetch nearby DB shops first to prioritize partner stores
        let dbShops: any[] = [];
        try {
            const currentLang = language.startsWith('en') ? 'en' : 'ko';
            const dbRes = await fetch(`${API_BASE}/api/shops?lat=${currentLatitude}&lng=${currentLongitude}&lang=${currentLang}`);
            if (dbRes.ok) {
                const resJson = await dbRes.json();
                dbShops = Array.isArray(resJson) ? resJson : (resJson.data || []);
            }
        } catch (e) {
            console.warn("Failed to fetch nearby DB shops for curator:", e);
        }

        // Process DB shops to uniform UI format
        const processedDbShops = dbShops.map(s => {
            const lat = s.lat !== undefined && s.lat !== null ? parseFloat(s.lat) : currentLatitude;
            const lng = s.lng !== undefined && s.lng !== null ? parseFloat(s.lng) : currentLongitude;
            const distance = getDistanceFromLatLonInKm(currentLatitude, currentLongitude, lat, lng);
            return {
                id: s.id,
                name: s.name,
                lat,
                lng,
                distance,
                uri: `/map?shopId=${s.id}`,
                isDb: true
            };
        });

        // Sort DB shops by distance (closest first)
        processedDbShops.sort((a, b) => (a.distance || 0) - (b.distance || 0));

        // Filter DB shops within a reasonable 3km radius to ensure meaningful recommendations
        const nearbyDbShops = processedDbShops.filter(s => s.distance <= 3.0);

        // 2. Parse Gemini AI recommended shops
        const aiRecommendedShops: any[] = [];
        parsedData.forEach((shop, idx) => {
          let finalLat = shop.lat !== undefined ? shop.lat : shop.latitude;
          let finalLng = shop.lng !== undefined ? shop.lng : shop.longitude;
          
          if (finalLat === undefined || isNaN(parseFloat(finalLat))) finalLat = anchorLat;
          if (finalLng === undefined || isNaN(parseFloat(finalLng))) finalLng = anchorLng;

          const latNum = parseFloat(finalLat);
          const lngNum = parseFloat(finalLng);
          const distance = getDistanceFromLatLonInKm(currentLatitude, currentLongitude, latNum, lngNum);
          const uri = `/map?targetLat=${latNum}&targetLng=${lngNum}&targetName=${encodeURIComponent(shop.name)}`;

          aiRecommendedShops.push({
              id: `ai-curator-${idx}-${Date.now()}`,
              name: shop.name,
              lat: latNum,
              lng: lngNum,
              distance,
              uri,
              isGeneric: true
          });
        });

        // 3. Hybrid Merge: Prioritize DB stores and fill the rest up to 5 with AI stores
        let finalShops: any[] = [...nearbyDbShops];
        
        if (finalShops.length < 5) {
            // Prevent duplicates (AI recommendations having the same name as DB stores)
            const dbNames = new Set(finalShops.map(s => s.name.toLowerCase().replace(/\s+/g, '')));
            const filteredAi = aiRecommendedShops.filter(s => !dbNames.has(s.name.toLowerCase().replace(/\s+/g, '')));
            
            const neededCount = 5 - finalShops.length;
            const paddedAi = filteredAi.slice(0, neededCount);
            finalShops = [...finalShops, ...paddedAi];
        } else {
            finalShops = finalShops.slice(0, 5);
        }

        // [FAIL-SAFE] If both sources returned absolutely zero shops, populate with custom defaults
        if (!finalShops || finalShops.length === 0) {
            console.warn("AI and DB Map Fetch returned empty. Using robust fallback.");
            const fallbackShops = [
                { name: "Blue Bottle Coffee", lat: currentLatitude + 0.001, lng: currentLongitude + 0.001, uri: "/map?targetLat=" + (currentLatitude + 0.001) + "&targetLng=" + (currentLongitude + 0.001) + "&targetName=Blue%20Bottle%20Coffee" },
                { name: "Anthracite Coffee", lat: currentLatitude - 0.002, lng: currentLongitude + 0.001, uri: "/map?targetLat=" + (currentLatitude - 0.002) + "&targetLng=" + (currentLongitude + 0.001) + "&targetName=Anthracite%20Coffee" },
                { name: "Terarosa Coffee", lat: currentLatitude + 0.003, lng: currentLongitude - 0.002, uri: "/map?targetLat=" + (currentLatitude + 0.003) + "&targetLng=" + (currentLongitude - 0.002) + "&targetName=Terarosa%20Coffee" },
                { name: "Coffee Libre", lat: currentLatitude + 0.002, lng: currentLongitude - 0.003, uri: "/map?targetLat=" + (currentLatitude + 0.002) + "&targetLng=" + (currentLongitude - 0.003) + "&targetName=Coffee%20Libre" },
                { name: "Fritz Coffee Company", lat: currentLatitude - 0.003, lng: currentLongitude - 0.001, uri: "/map?targetLat=" + (currentLatitude - 0.003) + "&targetLng=" + (currentLongitude - 0.001) + "&targetName=Fritz%20Coffee%20Company" }
            ].map(s => ({ ...s, distance: getDistanceFromLatLonInKm(currentLatitude, currentLongitude, s.lat, s.lng) }));
            finalShops = fallbackShops;
        }

        set({ nearbyShops: finalShops });
        saveLocal('coffee_shops', finalShops);
        
        sessionStorage.setItem('bm_curator_shops_v3', JSON.stringify(finalShops));
        (window as any)._allCuratedShops = finalShops;
        
        // Fire-and-forget: Auto-Import top highly-matched curated shops into the Global Map DB
        const validShops = finalShops.filter(s => s && s.name && s.lat && s.lng);
        const token = localStorage.getItem('token');
        let isAdmin = false;
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const userObj = JSON.parse(userStr);
                isAdmin = userObj.role === 'ADMIN' || userObj.role === 'MODERATOR';
            }
        } catch {}

        if (validShops.length > 0 && token && isAdmin) {
            fetch(`${API_BASE}/api/shops/ai-import`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ shops: validShops.slice(0, 10) })
            }).catch(err => console.warn("AI DB Auto-Import failed", err));
        }
        
        // Update bm_sync_presc with nearby shops if we need it
        const cur = JSON.parse(localStorage.getItem('bm_sync_presc') || '{}');
        cur.nearbyShops = finalShops;
        localStorage.setItem('bm_sync_presc', JSON.stringify(cur));

        measure("10. 백그라운드 지도(Near Me) 주변 카페 구글 검색 및 병합 완료");
      } catch (error) {
        console.error("Maps Grounding Error:", error);
        
        // [FAIL-SAFE] Catch Block Direct Fallback
        const fallbackShops = [
            { name: "Blue Bottle Coffee", lat: currentLatitude + 0.001, lng: currentLongitude + 0.001, distance: 0.1, uri: "https://maps.google.com/?q=Blue+Bottle+Coffee" },
            { name: "Anthracite Coffee", lat: currentLatitude - 0.002, lng: currentLongitude + 0.001, distance: 0.2, uri: "https://maps.google.com/?q=Anthracite+Coffee" },
            { name: "Terarosa Coffee", lat: currentLatitude + 0.003, lng: currentLongitude - 0.002, distance: 0.3, uri: "https://maps.google.com/?q=Terarosa+Coffee" }
        ];
        set({ nearbyShops: fallbackShops });
        saveLocal('coffee_shops', fallbackShops);

      } finally {
        set({ isMapLoading: false });
      }
      }, 100); // 100ms 지연 실행으로 메인 스레드 경합 완전 분리
  }
}));
