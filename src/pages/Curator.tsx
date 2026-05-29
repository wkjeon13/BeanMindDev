import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, Droplet, Pill, Beaker, ChevronRight, ChevronLeft, MapPin, Zap, ExternalLink, RefreshCw, Wind, Droplets, Flame, Search, Info, Save, Sunrise, Sun, Sunset, Moon, CloudRain, Cloud, Snowflake, ThermometerSun, ThermometerSnowflake, BatteryWarning, Brain, Sparkles, CheckCircle2, HeartPulse, Leaf, Activity, Stethoscope, Trophy, Flower2, Citrus, Cherry, Apple, CloudFog, Sprout, Music, Headphones, Mic2, Guitar, Radio, Tv, Speaker, Volume2, Milk, Gem, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleGenAI } from "@google/genai";
import { UserPreferences, CoffeeBean, Brand } from '../types';
import { COFFEE_BEANS, BRANDS } from '../data/coffeeData';
import SharedCoffeeMap from '../components/SharedCoffeeMap';
import GlobalAdBanner from '../components/GlobalAdBanner';
import NativeAdBanner from '../components/NativeAdBanner';
import { API_BASE } from '../utils/apiConfig';
import { useTranslation } from 'react-i18next';
import PrescriptionTicket from '../components/PrescriptionTicket';
import { useCuratorStore } from '../store/curatorStore';
import { clearHomeCache } from './Home';
const safeGetSession = () => { try { return !!localStorage.getItem('token'); } catch { return false; } };

export default function App() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isLoggedIn = safeGetSession();
  
  const {
    step, direction, prefs, recommendation, subRecommendations, aiExplanation,
    nearbyShops, userLocation, curationAd, isLoading, isMapLoading,
    setStep, setDirection, setPrefs, setRecommendation, setAiExplanation,
    setCurationAd, startMatch, reset
  } = useCuratorStore();

  const [isSaving, setIsSaving] = useState(false);
  const [rating, setRating] = useState(0);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [showLimitWarning, setShowLimitWarning] = useState(false);
  const [hideLimitWarningNextTime, setHideLimitWarningNextTime] = useState(false);
  const [prescriptionTitle, setPrescriptionTitle] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Handle startFresh navigation state
  useEffect(() => {
    if (location.state?.startFresh) {
      reset();
    }
  }, [location.state, reset]);

  // Auto-scroll to top when step changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // Mark session as active for the Home resume popup logic
    // Users requested this popup ONLY appear when the actual AI backend analysis is running (Step 4)
    if (step === 4 && (isLoading || aiExplanation === "☕ 특별한 커피 에세이를 작성하는 중입니다...")) {
        sessionStorage.setItem('curator_active', 'true');
        sessionStorage.removeItem('curator_popup_dismissed');
    } else {
        sessionStorage.removeItem('curator_active');
    }
  }, [step, isLoading, aiExplanation]);

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
  const syncHandled = useRef(false);

  useEffect(() => {
    const checkSync = async () => {
      // If we are starting fresh, do not restore old history or pending syncs
      if (location.state?.startFresh) {
          syncHandled.current = true;
          return;
      }

      const needsSync = localStorage.getItem('bm_sync_presc');
      const token = localStorage.getItem('token');
      const userRole = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}').role; } catch { return 'USER'; } })();
      




      // CASE 1: User just logged in / returned with a pending anonymous prescription
      if (needsSync) {
        syncHandled.current = true;
        try {
          const parsed = JSON.parse(needsSync);
          if (parsed.recommendation) {
            // Instantly restore visual state
            useCuratorStore.setState({
              recommendation: parsed.recommendation,
              subRecommendations: parsed.subRecommendations || [],
              aiExplanation: parsed.aiExplanation || "",
              nearbyShops: parsed.nearbyShops || [],
              step: 4
            });
            
            // If they are logged in, auto-save to their account history (only if complete)
            if (isLoggedIn && token && !parsed.alreadyAlerted && parsed.aiExplanation && parsed.aiExplanation !== "☕ 특별한 커피 에세이를 작성하는 중입니다...") {
                // Consume it only if we're successfully saving it
                localStorage.removeItem('bm_sync_presc'); 
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
                    if (res.ok) {
                        clearHomeCache();
                    }
                    if (res.status === 403) {
                        const isHiddenByUser = localStorage.getItem('bm_hide_limit_warning') === 'true';
                        if (!isHiddenByUser) {
                            setShowLimitWarning(true);
                        }
                        // Flag to prevent repetitive alerts across route changes while this session is active
                        parsed.alreadyAlerted = true;
                        localStorage.setItem('bm_sync_presc', JSON.stringify(parsed));
                    }
                } catch(e) {
                    console.warn("Auto-save failed:", e);
                    localStorage.setItem('bm_sync_presc', needsSync);
                }
            }
            return; // State restored, exit checkSync.
          }
        } catch(e) { console.error("Failed to parse bm_sync_presc:", e); }
      }

      // CASE 2: User opened app fresh, is logged in, no pending sync data
      // CASE 2: If no anonymous prescription to restore, fetch latest history from server (ONLY if they aren't currently in a survey)
      const currentStep = useCuratorStore.getState().step;
      if (isLoggedIn && token && !syncHandled.current && (currentStep === 0 || currentStep === 4)) {
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
       // Support for cross-session/anonymous state carry-over before login
       localStorage.setItem('bm_sync_presc', JSON.stringify({ recommendation, subRecommendations, aiExplanation, nearbyShops }));
    }
  }, [step, recommendation, subRecommendations, aiExplanation, nearbyShops]);

  // Escape hatch for the Mockup State trap
  // If the user viewed the guest mockup, clicked login, and returned, the mocked state persists in memory.
  // This listener auto-triggers the genuine AI generation if it detects the mockup signature while authenticated.
  useEffect(() => {
    const userRole = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}').role; } catch { return 'USER'; } })();
    if (isLoggedIn && step === 4 && aiExplanation.includes("🚨") && userRole !== 'ADMIN' && userRole !== 'MODERATOR') {
        useCuratorStore.getState().startMatch(i18n.language);
    }
  }, [isLoggedIn, step, aiExplanation, i18n.language]);

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

    // Instantly kill any lingering background auto-save failure modal since user is doing it manually
    setShowLimitWarning(false);
    
    // Instead of window.prompt, open the custom modal
    setPrescriptionTitle('');
    setShowSavePrompt(true);
  };

  const executeSave = async (usePoints = false) => {
    const token = localStorage.getItem('token');
    if (!token || !recommendation) return;

    if (aiExplanation === "☕ 특별한 커피 에세이를 작성하는 중입니다..." || !aiExplanation) {
      alert(t('curator.alert_essay_generating', "AI 커피 에세이가 아직 작성 중입니다. 작성이 완료된 후 저장해 주세요!"));
      return;
    }

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
        // Wipe local caches explicitly so the background bot doesn't bother next time
        localStorage.removeItem('bm_sync_presc');
        sessionStorage.removeItem('bm_sync_presc');
        clearHomeCache(); // Clear home cache to refresh personalized banner
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
    <div className="flex-1 min-h-0 w-full bg-espresso-950 overflow-hidden flex flex-col text-espresso-50 font-sans relative selection:bg-amber-900 selection:text-cyan-100">
      <div className="flex-1 min-h-0 w-full max-w-md md:max-w-2xl lg:max-w-3xl mx-auto relative flex flex-col bg-espresso-950 overflow-hidden shadow-2xl shadow-black/40">

        
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
          <div className="px-6 pt-safe mt-[max(env(safe-area-inset-top),32px)] mb-2 z-20 shrink-0 flex flex-col items-center relative w-full">
            <button 
              onClick={() => { reset(); navigate('/', { replace: true }); }}
              className="absolute right-4 top-0 p-2 text-espresso-300 hover:text-espresso-50 transition-colors bg-espresso-900/50 rounded-full backdrop-blur-sm border border-espresso-700/50"
            >
              <X size={20} />
            </button>
            <h1 className="text-[28px] font-black tracking-wide text-espresso-50 leading-tight text-center tracking-tight uppercase shadow-black drop-shadow-xl mt-2">
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
                  className="text-base text-espresso-200 max-w-xs md:max-w-md mx-auto mt-6 mb-8 leading-relaxed break-keep text-center"
                  dangerouslySetInnerHTML={{ __html: t('curator.intro_desc') }}
                />
                
                <GlobalAdBanner placement="HOME_HERO" className="mb-6 max-w-xs md:max-w-md mx-auto w-full" />
                
                <div className="w-full max-w-xs md:max-w-sm flex flex-col gap-3">
                  <button onClick={startSurvey} className="bg-gradient-to-r from-amber-500 to-blue-500 text-espresso-50 w-full text-lg font-bold shadow-[0_0_20px_rgba(34,211,238,0.3)] py-5 rounded-2xl active:scale-95 transition-transform uppercase tracking-widest">
                    {t('curator.intro_start') || "START"}
                  </button>
                  
                  {localStorage.getItem('bm_sync_presc') && (
                      <button 
                          onClick={() => {
                              try {
                                  const raw = localStorage.getItem('bm_sync_presc');
                                  if (!raw) return;
                                  const parsed = JSON.parse(raw);
                                  if (parsed.recommendation) {
                                      useCuratorStore.setState({
                                          recommendation: parsed.recommendation,
                                          subRecommendations: parsed.subRecommendations || [],
                                          aiExplanation: parsed.aiExplanation || "",
                                          nearbyShops: parsed.nearbyShops || []
                                      });
                                      setStep(4);
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                  } else {
                                      localStorage.removeItem('bm_sync_presc');
                                      window.location.reload();
                                  }
                              } catch(e) {
                                  localStorage.removeItem('bm_sync_presc');
                                  window.location.reload();
                              }
                          }}
                          className="w-full py-4 bg-espresso-800 text-amber-500 font-bold rounded-2xl text-[15px] border border-espresso-700 hover:bg-espresso-700 active:scale-95 transition-all shadow-md"
                      >
                          진행 중인 분석 이어서 보기
                      </button>
                  )}
                </div>
              </div>
            )}

            {/* Step 1: Context */}
            {step === 1 && (
              <div className="p-4 space-y-6 animate-in fade-in duration-500 pb-20 w-full max-w-sm md:max-w-xl lg:max-w-2xl mx-auto">
                <section className="w-full">
                  <h3 className="text-[13px] text-espresso-100 font-extrabold uppercase tracking-[0.2em] pl-4 mb-2 drop-shadow-md">TIME</h3>
                  <div className="w-full flex items-center justify-between bg-espresso-900/[0.04] backdrop-blur-xl border border-espresso-700/50 rounded-[2.5rem] py-3 px-3 shadow-2xl">
                    {['Morning', 'Afternoon', 'Evening', 'Night'].map((time) => {
                      const iconMap: any = { Morning: <Sunrise size={24}/>, Afternoon: <Sun size={24}/>, Evening: <Sunset size={24}/>, Night: <Moon size={24}/> };
                      const isSel = prefs.timeOfDay === time;
                      return (
                        <button key={time} onClick={() => setPrefs({...prefs, timeOfDay: time as any})}
                          className={`shrink-0 flex flex-col items-center justify-center gap-2 max-w-[70px] flex-1 group transition-opacity ${isSel ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}>
                          <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all duration-300 ${isSel ? 'bg-amber-500/10 border-[1.5px] border-amber-500 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-transparent border-[1.5px] border-transparent'}`}>
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
                          <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all duration-300 ${isSel ? 'bg-amber-500/10 border-[1.5px] border-amber-500 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-transparent border-[1.5px] border-transparent'}`}>
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
                          <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all duration-300 ${isSel ? 'bg-amber-500/10 border-[1.5px] border-amber-500 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-transparent border-[1.5px] border-transparent'}`}>
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
                          className={`shrink-0 snap-center flex flex-col items-center justify-center gap-2 w-[125px] group transition-opacity ${isSel ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}>
                          <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all duration-300 ${isSel ? 'bg-amber-500/10 border-[1.5px] border-amber-500 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-transparent border-[1.5px] border-transparent'}`}>
                              <span className={`transition-transform ${isSel ? 'text-amber-500 scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'text-espresso-100 group-hover:scale-110'}`}>{iconMap[h]}</span>
                          </div>
                          <span className={`text-[11px] sm:text-[12px] uppercase tracking-wider text-center px-1 break-words whitespace-normal leading-tight ${isSel ? 'text-amber-500 font-bold' : 'text-espresso-200 font-semibold'}`}>{t(`curator.${labelMap[h]}`)}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
                <section className="w-full">
                  <h3 className="text-[13px] text-espresso-100 font-extrabold uppercase tracking-[0.2em] pl-4 mb-2 drop-shadow-md">EXPERIENCE</h3>
                  <div className="w-full flex items-center justify-center gap-4 bg-espresso-900/[0.04] backdrop-blur-xl border border-espresso-700/50 rounded-[2.5rem] py-4 px-4 shadow-2xl">
                    {[ {v:'Beginner', l:'e_beginner', i: <Coffee size={24}/>}, {v:'Daily', l:'e_daily', i: <Sun size={24}/>}, {v:'Enthusiast', l:'e_enthusiast', i: <Sparkles size={24}/>} ].map((item) => {
                      const isSel = prefs.experienceLevel === item.v;
                      return (
                        <button key={item.v} onClick={() => setPrefs({...prefs, experienceLevel: item.v as any})}
                          className={`flex flex-col items-center justify-center gap-2 flex-1 group transition-opacity ${isSel ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}>
                          <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all duration-300 ${isSel ? 'bg-amber-500/10 border-[1.5px] border-amber-500 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-transparent border-[1.5px] border-transparent'}`}>
                              <span className={`transition-transform ${isSel ? 'text-amber-500 scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'text-espresso-100 group-hover:scale-110'}`}>{item.i}</span>
                          </div>
                          <span className={`text-[12px] uppercase tracking-wider text-center px-1 break-keep leading-tight ${isSel ? 'text-amber-500 font-bold' : 'text-espresso-200 font-semibold'}`}>{t(`curator.${item.l}`)}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            {/* Step 2: Basic */}
            {step === 2 && (
              <div className="p-4 space-y-6 animate-in fade-in duration-500 pb-20 w-full max-w-sm md:max-w-xl lg:max-w-2xl mx-auto">
                <section className="w-full">
                  <h3 className="text-[13px] text-espresso-100 font-extrabold uppercase tracking-[0.2em] pl-4 mb-2 drop-shadow-md">STYLE</h3>
                  <div className="w-full flex items-center justify-center gap-8 bg-espresso-900/[0.04] backdrop-blur-xl border border-espresso-700/50 rounded-[2.5rem] py-4 px-6 shadow-2xl">
                    {[ {v:'Espresso', l:'s_espresso', i: <Coffee size={28}/>}, {v:'Drip', l:'s_drip', i: <Wind size={28}/>} ].map((item) => {
                      const isSel = prefs.base === item.v;
                      return (
                        <button key={item.v} onClick={() => setPrefs({...prefs, base: item.v as any})}
                          className={`flex flex-col items-center justify-center gap-3 w-[100px] group transition-opacity ${isSel ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}>
                          <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all duration-300 ${isSel ? 'bg-amber-500/10 border-[1.5px] border-amber-500 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-transparent border-[1.5px] border-transparent'}`}>
                              <span className={`transition-transform ${isSel ? 'text-amber-500 scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'text-espresso-100 group-hover:scale-110'}`}>{item.i}</span>
                          </div>
                          <span className={`text-[12px] uppercase tracking-widest text-center whitespace-pre-line ${isSel ? 'text-amber-500 font-bold' : 'text-espresso-200 font-semibold'}`}>{t(`curator.${item.l}`).replace('/', '\n')}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="w-full">
                  <h3 className="text-[13px] text-espresso-100 font-extrabold uppercase tracking-[0.2em] pl-4 mb-2 drop-shadow-md">MILK PREFERENCE</h3>
                  <div className="w-full flex items-center justify-center gap-4 bg-espresso-900/[0.04] backdrop-blur-xl border border-espresso-700/50 rounded-[2.5rem] py-4 px-4 shadow-2xl">
                    {[ {v:'Black', l:'m_black', i: <Coffee size={24}/>}, {v:'Milk', l:'m_milk', i: <Milk size={24}/>}, {v:'Oat', l:'m_oat', i: <Leaf size={24}/>} ].map((item) => {
                      const isSel = prefs.milkPreference === item.v;
                      return (
                        <button key={item.v} onClick={() => setPrefs({...prefs, milkPreference: item.v as any})}
                          className={`flex flex-col items-center justify-center gap-2 flex-1 group transition-opacity ${isSel ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}>
                          <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all duration-300 ${isSel ? 'bg-amber-500/10 border-[1.5px] border-amber-500 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-transparent border-[1.5px] border-transparent'}`}>
                              <span className={`transition-transform ${isSel ? 'text-amber-500 scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'text-espresso-100 group-hover:scale-110'}`}>{item.i}</span>
                          </div>
                          <span className={`text-[12px] uppercase tracking-wider text-center px-1 break-keep leading-tight ${isSel ? 'text-amber-500 font-bold' : 'text-espresso-200 font-semibold'}`}>{t(`curator.${item.l}`)}</span>
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
                  <h3 className="text-[13px] text-espresso-100 font-extrabold uppercase tracking-[0.2em] pl-4 mb-2 drop-shadow-md">ROAST LEVEL</h3>
                  <div className="w-full flex items-center justify-center gap-4 bg-espresso-900/[0.04] backdrop-blur-xl border border-espresso-700/50 rounded-[2.5rem] py-4 px-4 shadow-2xl">
                    {[ {v:'Light', l:'r_light', i: <Sun size={24}/>}, {v:'Medium', l:'r_medium', i: <Cloud size={24}/>}, {v:'Dark', l:'r_dark', i: <Flame size={24}/>} ].map((item) => {
                      const isSel = prefs.roastLevel === item.v;
                      return (
                        <button key={item.v} onClick={() => setPrefs({...prefs, roastLevel: item.v as any})}
                          className={`flex flex-col items-center justify-center gap-2 flex-1 group transition-opacity ${isSel ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}>
                          <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all duration-300 ${isSel ? 'bg-amber-500/10 border-[1.5px] border-amber-500 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-transparent border-[1.5px] border-transparent'}`}>
                              <span className={`transition-transform ${isSel ? 'text-amber-500 scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'text-espresso-100 group-hover:scale-110'}`}>{item.i}</span>
                          </div>
                          <span className={`text-[12px] uppercase tracking-wider text-center px-1 break-keep leading-tight ${isSel ? 'text-amber-500 font-bold' : 'text-espresso-200 font-semibold'}`}>{t(`curator.${item.l}`)}</span>
                        </button>
                      );
                    })}
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
                          <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all duration-300 ${isSel ? 'bg-amber-500/10 border-[1.5px] border-amber-500 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-transparent border-[1.5px] border-transparent'}`}>
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
              <div className="p-4 space-y-6 animate-in fade-in duration-500 pb-20 w-full max-w-sm md:max-w-xl lg:max-w-2xl mx-auto">
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
                          <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all duration-300 ${isSel ? 'bg-amber-500/10 border-[1.5px] border-amber-500 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-transparent border-[1.5px] border-transparent'}`}>
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
                          <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all duration-300 ${isSel ? 'bg-amber-500/10 border-[1.5px] border-amber-500 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-transparent border-[1.5px] border-transparent'}`}>
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
                          <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all duration-300 ${isSel ? 'bg-amber-500/10 border-[1.5px] border-amber-500 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-transparent border-[1.5px] border-transparent'}`}>
                              <span className={`transition-transform ${isSel ? 'text-amber-500 scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'text-espresso-100 group-hover:scale-110'}`}>{item.i}</span>
                          </div>
                          <span className={`text-[12px] uppercase tracking-wider text-center ${isSel ? 'text-amber-500 font-bold' : 'text-espresso-200 font-semibold'}`}>{item.l === 'm_any' ? t(`curator.${item.l}`) : item.v.toUpperCase()}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="w-full">
                  <h3 className="text-[13px] text-espresso-100 font-extrabold uppercase tracking-[0.2em] pl-4 mb-2 drop-shadow-md">BUDGET & TARGET</h3>
                  <div className="w-full flex items-center justify-center gap-8 bg-espresso-900/[0.04] backdrop-blur-xl border border-espresso-700/50 rounded-[2.5rem] py-4 px-6 shadow-2xl">
                    {[ {v:'Daily', l:'b_daily', i: <Coffee size={28}/>}, {v:'Specialty', l:'b_specialty', i: <Gem size={28}/>} ].map((item) => {
                      const isSel = prefs.budget === item.v;
                      return (
                        <button key={item.v} onClick={() => setPrefs({...prefs, budget: item.v as any})}
                          className={`flex flex-col items-center justify-center gap-3 w-[100px] group transition-opacity ${isSel ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}>
                          <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all duration-300 ${isSel ? 'bg-amber-500/10 border-[1.5px] border-amber-500 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-transparent border-[1.5px] border-transparent'}`}>
                              <span className={`transition-transform ${isSel ? 'text-amber-500 scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'text-espresso-100 group-hover:scale-110'}`}>{item.i}</span>
                          </div>
                          <span className={`text-[12px] uppercase tracking-widest text-center break-keep leading-tight ${isSel ? 'text-amber-500 font-bold' : 'text-espresso-200 font-semibold'}`}>{t(`curator.${item.l}`)}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
                
                <section className="w-full flex flex-col items-center justify-center mt-8 px-4">
                   <button 
                       onClick={() => setPrefs({...prefs, includeMapSearch: prefs.includeMapSearch === false ? true : false})}
                       className="flex items-center gap-4 bg-espresso-900/40 w-full p-4 rounded-[2rem] border border-espresso-800 transition-colors hover:bg-espresso-800/60 active:scale-[0.98]"
                   >
                       <div className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-300 ease-in-out shrink-0 ${prefs.includeMapSearch !== false ? 'bg-amber-600' : 'bg-espresso-700/80'}`}>
                           <div className={`w-5 h-5 rounded-full bg-white transition-transform duration-300 ease-in-out shadow-sm ${prefs.includeMapSearch !== false ? 'translate-x-[22px]' : 'translate-x-0'}`} />
                       </div>
                       <div className="flex flex-col items-start text-left">
                           <span className="text-[14px] font-bold text-espresso-100 tracking-wide mb-1 flex items-center justify-center"><MapPin size={14} className="mr-1 text-amber-500" /> {t('curator.opt_map_search_title')}</span>
                           <span className="text-[11px] text-espresso-400 font-medium leading-snug break-keep">
                               {t('curator.opt_map_search_desc')}
                           </span>
                       </div>
                   </button>
                </section>
              </div>
            )}
          </div>

        {/* Step 4: Loading & Result */}
        {step === 4 && (
              <div className={`flex-1 flex flex-col animate-in fade-in duration-700 ${isLoading || aiExplanation === "☕ 특별한 커피 에세이를 작성하는 중입니다..." ? 'justify-center overflow-hidden' : 'overflow-x-hidden overflow-y-auto hide-scrollbar'}`}>
                {isLoading || aiExplanation === "☕ 특별한 커피 에세이를 작성하는 중입니다..." ? (
                   <div className="flex flex-col items-center justify-center p-8 text-center space-y-6 -mt-32 min-h-[60vh]">
                     <div className="relative">
                       <div className="w-20 h-20 border-4 border-espresso-700 border-t-amber-600 rounded-full animate-spin"></div>
                       <div className="absolute inset-0 flex items-center justify-center text-amber-600">
                         <Brain size={28} className="animate-pulse" />
                       </div>
                     </div>
                     <div>
                       <h2 className="text-2xl font-bold text-espresso-50 mb-2">{t('curator.status_analyzing')}</h2>
                       <p className="text-espresso-200 text-[13px] leading-relaxed mx-4" dangerouslySetInnerHTML={{ __html: t('curator.status_analyzing_desc') }} />
                     </div>
                     <GlobalAdBanner placement="CURATOR_LOADING" className="w-full max-w-[280px] my-2 p-2 bg-espresso-900/40 rounded-2xl border border-espresso-700/50" />
                     <button
                        onClick={reset}
                        className="mt-6 px-8 py-2.5 bg-espresso-800/50 hover:bg-espresso-800 border-2 border-espresso-700 text-espresso-300 font-bold rounded-full transition-all active:scale-95"
                     >
                        {t('curator.btn_cancel_extract')}
                     </button>
                   </div>
                ) : recommendation ? (
                  <div className="px-2 md:px-8 lg:px-12 pt-safe pb-32 space-y-8">
                     
                     <PrescriptionTicket
                         recommendation={recommendation}
                         aiExplanation={aiExplanation}
                         isLoggedIn={!!isLoggedIn}
                         isSaving={isSaving}
                         onSave={handleSavePrescription}
                         onShare={() => {
                             if (navigator.share) {
                                 navigator.share({ 
                                     title: t('curator.share_title', '나의 AI 커피 처방전'), 
                                     text: `${recommendation.bean.name} - ${recommendation.brand.name}`,
                                     url: window.location.href 
                                 }).catch(e => console.error(e));
                             } else {
                                 navigator.clipboard.writeText(window.location.href);
                                 alert(t('shared.copied', '링크가 클립보드에 복사되었습니다.'));
                             }
                         }}
                         onGoToLogin={() => navigate('/profile')}
                     />

                     {curationAd && (
                         <div className="mt-4">
                             <NativeAdBanner ad={curationAd} />
                         </div>
                     )}

                     {/* Sub Recommendations */}
                     {subRecommendations && subRecommendations.length > 0 && (
                       <div className="grid grid-cols-2 gap-3 mt-4">
                         {subRecommendations.map((sub, idx) => (
                           <div key={idx} className="bg-espresso-900/60 border border-espresso-700 rounded-2xl p-4 flex flex-col justify-between">
                             <div>
                               <div className="text-[10px] text-espresso-200 font-bold uppercase tracking-wider mb-1">
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

                     {/* Shop Recommendations Overlay */}
                     {!isLoggedIn ? (
                          <div className="bg-amber-950/20 p-6 mt-8 rounded-[2rem] border-[1.5px] border-amber-900/40 flex flex-col items-center text-center shadow-lg">
                              <div className="w-14 h-14 bg-amber-900/30 rounded-full flex items-center justify-center mb-4">
                                  <MapPin size={24} className="text-amber-500 animate-bounce" />
                              </div>
                              <h3 className="text-[17px] font-black text-amber-500 mb-2 tracking-wide">내 주변 스페셜티 매장 탐색</h3>
                              <p className="text-[14px] text-espresso-100 font-medium leading-relaxed">
                                  로그인을 한 후 실행하면<br/>
                                  <span className="text-amber-400 font-bold underline underline-offset-4 decoration-amber-500/50">현재 위치 기반 근처 스페셜티 매장</span>이 추천됩니다.
                              </p>
                              <button onClick={() => navigate('/profile')} className="mt-5 w-full bg-amber-500/10 text-amber-500 border border-amber-500/30 py-3.5 rounded-xl text-[14px] font-bold hover:bg-amber-500/20 transition-all active:scale-[0.98] shadow-inner">
                                  로그인하고 동네 매장 추천받기
                              </button>
                          </div>
                     ) : (
                         <>
                             {/* Map Skeleton Loader */}
                             {isMapLoading && (
                               <div className="bg-espresso-900/80 p-6 mt-8 rounded-[2rem] border-[1.5px] border-blue-500/50 shadow-[0_0_40px_rgba(59,130,246,0.15)] relative overflow-hidden flex flex-col items-center justify-center min-h-[220px]">
                                 <div className="absolute inset-0 bg-blue-500/10 animate-pulse" />
                                 
                                 <div className="w-14 h-14 mb-4 rounded-full flex items-center justify-center relative shadow-[0_0_20px_rgba(59,130,246,0.4)]">
                                     <div className="absolute inset-0 rounded-full border-4 border-blue-900/50 border-t-blue-400 animate-spin" />
                                     <MapPin size={22} className="text-blue-400" />
                                 </div>
                                 
                                 <h3 className="text-[16px] font-black text-blue-400 mb-2 tracking-wider animate-pulse z-10 drop-shadow-md">
                                     {t('curator.status_searching_shops', '스페셜티 추천 지역 탐색 중...')}
                                 </h3>
                                 <p className="text-[12px] text-espresso-200 font-medium text-center z-10 mb-2">
                                     {t('curator.status_searching_desc', '사용자님의 프로필에 최적화된 근처 로스터리를 스캔하고 있습니다.')}
                                 </p>
                                 
                                 <div className="w-full max-w-[200px] mt-2 relative z-10">
                                     <div className="flex justify-between text-[10px] text-blue-300/80 font-bold mb-1 px-1">
                                         <span>AI GEOSCAN</span>
                                         <span className="animate-pulse">Processing...</span>
                                     </div>
                                     <div className="w-full bg-blue-950 rounded-full h-1.5 overflow-hidden border border-blue-800/30">
                                         <div className="bg-gradient-to-r from-blue-600 to-blue-400 h-1.5 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" style={{ animation: 'mapProgress 9s cubic-bezier(0.1, 0.7, 0.1, 1) forwards' }} />
                                     </div>
                                 </div>
                                 <style>{`
                                     @keyframes mapProgress {
                                         0% { width: 0%; }
                                         40% { width: 60%; }
                                         80% { width: 85%; }
                                         95% { width: 95%; }
                                         100% { width: 98%; }
                                     }
                                 `}</style>
                               </div>
                             )}

                             {/* Nearby Specialty Shops Map Call-to-action */}
                             {!isMapLoading && nearbyShops && nearbyShops.length > 0 && (
                               <div className="bg-blue-950/20 p-6 mt-8 rounded-[2rem] border border-blue-900/30">
                                 <h3 className="text-lg font-bold text-blue-400 mb-3 flex items-center gap-2">
                                   <MapPin size={20} /> {t('curator.recommended_shops') || "Nearby Roasteries"}
                                 </h3>
                                 <div className="space-y-3 mb-6">
                                   {nearbyShops.slice(0, 5).map((shop: any, i: number) => (
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
                                     const firstShop = nearbyShops[0] || (window as any)._allCuratedShops?.[0];
                                     const latToPass = firstShop?.lat || userLocation?.lat || 37.5665;
                                     const lngToPass = firstShop?.lng || userLocation?.lng || 126.9780;
                                     navigate('/map', { 
                                         state: { 
                                             autoLocateLat: parseFloat(latToPass), 
                                             autoLocateLng: parseFloat(lngToPass),
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
                         </>
                     )}

                     {/* Result Actions */}
                     <div className="flex flex-col gap-3 pt-4">
                       <button onClick={reset} className="w-full py-4 bg-espresso-700 hover:bg-espresso-600 text-espresso-50 font-bold rounded-[1.25rem] transition-all active:scale-[0.98] border border-espresso-600">
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
                onClick={step === 3 ? () => {
                    if (!isLoggedIn) {
                        useCuratorStore.setState({
                            step: 4,
                            isLoading: false,
                            isMapLoading: false,
                            recommendation: {
                                bean: COFFEE_BEANS[0],
                                brand: BRANDS[0],
                            },
                            subRecommendations: [],
                            nearbyShops: [],
                            aiExplanation: "> 🚨 **로그인을 한 후 실행하면, AI 커피 큐레이터가 회원님과 맞는 커피와 스페셜티 매장, 디저트 페어링, 음악을 추천합니다.**\n\n## ☕ 오늘의 맞춤 추천 커피 (예시)\n**에티오피아 예가체프 아리차 G1**\n화사한 꽃향기와 기분 좋은 베리류의 산미가 당신의 현재 기분에 완벽한 활력을 불어넣어 줍니다.\n\n## 🍰 디저트 페어링 (예시)\n**바닐라 베리 크로플**\n커피의 과일 향을 더욱 끌어올리면서도 은은한 단맛을 더해주는 크로플을 추천합니다.\n\n## 🎵 추천 플레이리스트 (예시)\n**[Groove] 리드미컬한 R&B**\n생기를 더해줄 적당한 템포의 그루비한 R&B 플레이리스트가 이 커피와 가장 잘 어울립니다."
                        });
                    } else {
                        startMatch(i18n.language);
                    }
                } : nextStep} 
                className="w-full max-w-[260px] md:max-w-sm py-[18px] bg-amber-500 text-espresso-50 font-extrabold uppercase tracking-widest text-[14px] rounded-[1.5rem] shadow-[0_0_30px_rgba(34,211,238,0.3)] active:scale-95 transition-transform mb-4"
              >
                {step === 3 ? t('curator.btn_finish') : "NEXT QUESTION"}
              </button>

              {/* Bottom edge navigation */}
              <div className="w-full max-w-[280px] md:max-w-md mb-2 flex justify-between items-center">
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
