import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Sunrise, Sun, Sunset, Moon, CloudRain, Cloud, Snowflake, ThermometerSun, ThermometerSnowflake, BatteryWarning, Brain, Flower2, Sparkles, CheckCircle2, HeartPulse, Leaf, Activity, Stethoscope, Coffee, Wind, Droplet, Pill, Beaker, Flame, Citrus, Cherry, Apple, CloudFog, Sprout, TabletSmartphone } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { API_BASE } from '../utils/apiConfig';

// Custom Slider for Taste Profile mapping replacing HTML <input type="range">
const DiscreteSlider = ({ value, onChange, minLabel, maxLabel }: { value: number, onChange: (val: number) => void, minLabel: string, maxLabel: string }) => {
  return (
    <View className="flex-row items-center gap-3 mt-1">
      <Text className="text-[10px] text-espresso-300 font-extrabold uppercase w-10 text-center">{minLabel}</Text>
      <View className="flex-1 flex-row items-center justify-between relative h-8">
        <View className="absolute top-1/2 left-0 right-0 h-1 bg-espresso-900/30 rounded-full -translate-y-0.5" />
        {[1, 2, 3, 4, 5].map((val) => (
          <TouchableOpacity 
            key={val} 
            onPress={() => onChange(val)}
            className="w-8 h-8 items-center justify-center z-10"
          >
            <View className={`rounded-full transition-all ${value === val ? 'w-5 h-5 bg-amber-500 shadow-md shadow-amber-500' : 'w-3 h-3 bg-espresso-700'}`} />
          </TouchableOpacity>
        ))}
      </View>
      <Text className="text-[10px] text-espresso-300 font-extrabold uppercase w-10 text-center">{maxLabel}</Text>
    </View>
  );
};

export default function CuratorWizardScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  
  const [step, setStep] = useState(1);
  const [prefs, setPrefs] = useState<any>({
    base: 'Drip',
    caffeine: 'Regular',
    timeOfDay: 'Morning',
    weather: 'Sunny',
    condition: 'Relaxed',
    healthStatus: 'None',
    tasteAcidity: 3,
    tasteSweetness: 3,
    tasteBitterness: 3,
    tasteBody: 3,
    equipment: 'Hand Drip',
    flavorNotes: [],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [aiExplanation, setAiExplanation] = useState<string>('');

  const handleMatch = async () => {
    setStep(4);
    setIsLoading(true);

    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
       console.warn("EXPO_PUBLIC_GEMINI_API_KEY is missing! Reverting to fallback data.");
       setTimeout(() => {
          setRecommendation({ name: "Fallback Bean", brand: "Demo Roasters" });
          setAiExplanation("AI API Key missing. This is a generic recommendation.");
          setIsLoading(false);
          setStep(5);
       }, 2000);
       return;
    }

    try {
      const targetLanguage = t('app.nav_home') === 'Home' ? 'English' : 'Korean';
      const prompt = `You are a master coffee sommelier.
      Based on the user's explicit taste preferences, you must dynamically generate the perfect coffee prescription.
      You must return ONLY a pure JSON object with the following schema:
      {
        "bestMatch": {
           "bean": { "name": "Exact Bean Name", "origin": "Country", "processing": "Washed", "roastLevel": "Light", "flavorNotes": ["Note1", "Note2", "Note3"], "description": "Short description" },
           "brand": { "name": "Real World Brand", "website": "URL" }
        },
        "aiExplanation": "A highly detailed, emotionally resonant markdown explanation"
      }
      
      CRITICAL INSTRUCTION FOR aiExplanation:
      You MUST write the ENTIRE aiExplanation strictly in ${targetLanguage.toUpperCase()}.
      
      Preferences: ${JSON.stringify(prefs)}`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      const data = await res.json();
      if (data.candidates && data.candidates[0].content.parts[0].text) {
          const parsed = JSON.parse(data.candidates[0].content.parts[0].text);
          setRecommendation(parsed.bestMatch);
          setAiExplanation(parsed.aiExplanation);
      }
    } catch (e) {
      console.error(e);
      setRecommendation({ name: "Error Bean", brand: "System" });
      setAiExplanation("Failed to connect to AI engine.");
    } finally {
      setIsLoading(false);
      setStep(5);
    }
  };

  return (
    <View className="flex-1 bg-espresso-950 pt-14">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 mb-6">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft size={24} color="#d3cec7" />
        </TouchableOpacity>
        <Text className="text-espresso-200 font-bold tracking-widest uppercase text-sm">
            {t('curator.step') || "Step"} {step}
        </Text>
        <View className="w-8" />
      </View>

      <ScrollView className="flex-1 px-6 pb-20" showsVerticalScrollIndicator={false}>
        {step === 1 && (
          <View className="space-y-8 mb-20 gap-8">
            
            {/* TIME */}
            <View>
              <Text className="text-[13px] text-espresso-100 font-extrabold uppercase tracking-widest mb-3 ml-2">TIME</Text>
              <View className="flex-row items-center justify-between bg-espresso-900/40 border border-espresso-700/50 rounded-3xl p-3">
                {['Morning', 'Afternoon', 'Evening', 'Night'].map((time) => {
                  const iconMap: any = { Morning: <Sunrise size={24} color={prefs.timeOfDay === time ? "#f59e0b" : "#d3cec7"}/>, Afternoon: <Sun size={24} color={prefs.timeOfDay === time ? "#f59e0b" : "#d3cec7"}/>, Evening: <Sunset size={24} color={prefs.timeOfDay === time ? "#f59e0b" : "#d3cec7"}/>, Night: <Moon size={24} color={prefs.timeOfDay === time ? "#f59e0b" : "#d3cec7"}/> };
                  const isSel = prefs.timeOfDay === time;
                  return (
                    <TouchableOpacity key={time} onPress={() => setPrefs({...prefs, timeOfDay: time})} className="flex-1 items-center gap-2 py-2">
                      <View className={`w-14 h-14 rounded-full items-center justify-center ${isSel ? 'bg-amber-500/20 border border-amber-500' : 'bg-transparent'}`}>
                        {iconMap[time]}
                      </View>
                      <Text className={`text-[10px] uppercase font-bold ${isSel ? 'text-amber-500' : 'text-espresso-200'}`}>{t(`curator.t_${time.toLowerCase()}`)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* WEATHER */}
            <View>
              <Text className="text-[13px] text-espresso-100 font-extrabold uppercase tracking-widest mb-3 ml-2">WEATHER</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="bg-espresso-900/40 border border-espresso-700/50 rounded-3xl p-3">
                {['Sunny', 'Rainy', 'Cloudy', 'Snowy', 'Hot', 'Cold'].map((weather) => {
                  const iconMap: any = { Sunny: <Sun size={24} color={prefs.weather === weather ? "#f59e0b" : "#d3cec7"}/>, Rainy: <CloudRain size={24} color={prefs.weather === weather ? "#f59e0b" : "#d3cec7"}/>, Cloudy: <Cloud size={24} color={prefs.weather === weather ? "#f59e0b" : "#d3cec7"}/>, Snowy: <Snowflake size={24} color={prefs.weather === weather ? "#f59e0b" : "#d3cec7"}/>, Hot: <ThermometerSun size={24} color={prefs.weather === weather ? "#f59e0b" : "#d3cec7"}/>, Cold: <ThermometerSnowflake size={24} color={prefs.weather === weather ? "#f59e0b" : "#d3cec7"}/> };
                  const isSel = prefs.weather === weather;
                  return (
                    <TouchableOpacity key={weather} onPress={() => setPrefs({...prefs, weather})} className="items-center gap-2 py-2 mx-2 min-w-[60px]">
                      <View className={`w-14 h-14 rounded-full items-center justify-center ${isSel ? 'bg-amber-500/20 border border-amber-500' : 'bg-transparent'}`}>
                        {iconMap[weather]}
                      </View>
                      <Text className={`text-[10px] uppercase font-bold ${isSel ? 'text-amber-500' : 'text-espresso-200'}`}>{t(`curator.w_${weather.toLowerCase()}`)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* MOOD */}
            <View>
              <Text className="text-[13px] text-espresso-100 font-extrabold uppercase tracking-widest mb-3 ml-2">MOOD</Text>
              <View className="flex-row items-center justify-between bg-espresso-900/40 border border-espresso-700/50 rounded-3xl p-3">
                {['Tired', 'Focused', 'Relaxed', 'Refreshing'].map((cond) => {
                  const iconMap: any = { Tired: <BatteryWarning size={24} color={prefs.condition === cond ? "#f59e0b" : "#d3cec7"}/>, Focused: <Brain size={24} color={prefs.condition === cond ? "#f59e0b" : "#d3cec7"}/>, Relaxed: <Flower2 size={24} color={prefs.condition === cond ? "#f59e0b" : "#d3cec7"}/>, Refreshing: <Sparkles size={24} color={prefs.condition === cond ? "#f59e0b" : "#d3cec7"}/> };
                  const isSel = prefs.condition === cond;
                  return (
                    <TouchableOpacity key={cond} onPress={() => setPrefs({...prefs, condition: cond})} className="flex-1 items-center gap-2 py-2">
                      <View className={`w-14 h-14 rounded-full items-center justify-center ${isSel ? 'bg-amber-500/20 border border-amber-500' : 'bg-transparent'}`}>
                        {iconMap[cond]}
                      </View>
                      <Text className={`text-[10px] uppercase font-bold ${isSel ? 'text-amber-500' : 'text-espresso-200'}`}>{t(`curator.c_${cond.toLowerCase()}`)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* HEALTH */}
            <View>
              <Text className="text-[13px] text-espresso-100 font-extrabold uppercase tracking-widest mb-3 ml-2">HEALTH</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="bg-espresso-900/40 border border-espresso-700/50 rounded-3xl p-3">
                {['None', 'CaffeineSensitive', 'StomachSensitive', 'Diabetes', 'HighCholesterol'].map((h) => {
                  const labelMap: any = { None: 'h_none', CaffeineSensitive: 'h_caffeine', StomachSensitive: 'h_stomach', Diabetes: 'h_diabetes', HighCholesterol: 'h_cholesterol' };
                  const iconMap: any = { None: <CheckCircle2 size={24} color={prefs.healthStatus === h ? "#f59e0b" : "#d3cec7"}/>, CaffeineSensitive: <HeartPulse size={24} color={prefs.healthStatus === h ? "#f59e0b" : "#d3cec7"}/>, StomachSensitive: <Leaf size={24} color={prefs.healthStatus === h ? "#f59e0b" : "#d3cec7"}/>, Diabetes: <Activity size={24} color={prefs.healthStatus === h ? "#f59e0b" : "#d3cec7"}/>, HighCholesterol: <Stethoscope size={24} color={prefs.healthStatus === h ? "#f59e0b" : "#d3cec7"}/> };
                  const isSel = prefs.healthStatus === h;
                  return (
                    <TouchableOpacity key={h} onPress={() => setPrefs({...prefs, healthStatus: h})} className="items-center gap-2 py-2 mx-1 min-w-[75px]">
                      <View className={`w-14 h-14 rounded-full items-center justify-center ${isSel ? 'bg-amber-500/20 border border-amber-500' : 'bg-transparent'}`}>
                        {iconMap[h]}
                      </View>
                      <Text className={`text-[10px] uppercase font-bold text-center leading-tight max-w-[70px] ${isSel ? 'text-amber-500' : 'text-espresso-200'}`}>{t(`curator.${labelMap[h]}`)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

          </View>
        )}

        {step === 2 && (
          <View className="space-y-8 mb-20 gap-8">
            
            {/* STYLE */}
            <View>
              <Text className="text-[13px] text-espresso-100 font-extrabold uppercase tracking-widest mb-3 ml-2">STYLE</Text>
              <View className="flex-row justify-center gap-6 bg-espresso-900/40 border border-espresso-700/50 rounded-3xl p-5">
                {[ {v:'Espresso', l:'s_espresso', i: <Coffee size={32} color={prefs.base === 'Espresso' ? "#f59e0b" : "#d3cec7"}/>}, 
                   {v:'Drip', l:'s_drip', i: <Wind size={32} color={prefs.base === 'Drip' ? "#f59e0b" : "#d3cec7"}/>} ].map((item) => {
                  const isSel = prefs.base === item.v;
                  return (
                    <TouchableOpacity key={item.v} onPress={() => setPrefs({...prefs, base: item.v})} className="items-center gap-3 px-4">
                      <View className={`w-16 h-16 rounded-full items-center justify-center ${isSel ? 'bg-amber-500/20 border border-amber-500' : 'bg-transparent'}`}>
                        {item.i}
                      </View>
                      <Text className={`text-[11px] uppercase tracking-widest text-center ${isSel ? 'text-amber-500 font-bold' : 'text-espresso-200'}`}>{t(`curator.${item.l}`).replace('/', '\n')}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* TASTE PROFILE */}
            <View>
              <Text className="text-[13px] text-espresso-100 font-extrabold uppercase tracking-widest mb-3 ml-2">TASTE PROFILE</Text>
              <View className="bg-espresso-900/40 border border-espresso-700/50 rounded-3xl p-5 space-y-6 gap-6">
                {[
                  { key: 'tasteAcidity', title: 't_acidity_title', range: [t('curator.scale_less'), t('curator.scale_more')] },
                  { key: 'tasteSweetness', title: 't_sweetness_title', range: [t('curator.scale_less'), t('curator.scale_more')] },
                  { key: 'tasteBitterness', title: 't_bitterness_title', range: [t('curator.scale_less'), t('curator.scale_more')] },
                  { key: 'tasteBody', title: 't_body_title', range: [t('curator.scale_light'), t('curator.scale_heavy')] }
                ].map((attr) => (
                  <View key={attr.key} className="w-full">
                    <View className="flex-row justify-between items-center mb-1 px-1">
                      <Text className="font-bold text-[13px] uppercase tracking-wide text-espresso-50">{t(`curator.${attr.title}`)}</Text>
                      <Text className="text-[15px] font-black text-amber-500">{prefs[attr.key as keyof typeof prefs]}</Text>
                    </View>
                    <DiscreteSlider 
                       value={prefs[attr.key as keyof typeof prefs]} 
                       onChange={(val) => setPrefs({...prefs, [attr.key]: val})}
                       minLabel={attr.range[0]}
                       maxLabel={attr.range[1]}
                    />
                  </View>
                ))}
              </View>
            </View>

            {/* CAFFEINE */}
            <View>
              <Text className="text-[13px] text-espresso-100 font-extrabold uppercase tracking-widest mb-3 ml-2">CAFFEINE</Text>
              <View className="flex-row justify-center gap-6 bg-espresso-900/40 border border-espresso-700/50 rounded-3xl p-5">
                {[ {v:'Regular', l:'caff_reg', i: <Coffee size={32} color={prefs.caffeine === 'Regular' ? "#f59e0b" : "#d3cec7"}/>}, 
                   {v:'Decaf', l:'caff_decaf', i: <Moon size={32} color={prefs.caffeine === 'Decaf' ? "#f59e0b" : "#d3cec7"}/>} ].map((item) => {
                  const isSel = prefs.caffeine === item.v;
                  return (
                    <TouchableOpacity key={item.v} onPress={() => setPrefs({...prefs, caffeine: item.v})} className="items-center gap-3 px-4">
                      <View className={`w-16 h-16 rounded-full items-center justify-center ${isSel ? 'bg-amber-500/20 border border-amber-500' : 'bg-transparent'}`}>
                        {item.i}
                      </View>
                      <Text className={`text-[11px] uppercase tracking-widest text-center ${isSel ? 'text-amber-500 font-bold' : 'text-espresso-200'}`}>{t(`curator.${item.l}`)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

          </View>
        )}

        {step === 3 && (
          <View className="space-y-8 mb-20 gap-8">
            
            {/* FLAVOR */}
            <View>
              <View className="flex-row justify-between items-end mb-3 ml-2 mr-2">
                 <Text className="text-[13px] text-espresso-100 font-extrabold uppercase tracking-widest">FLAVOR (MAX 3)</Text>
                 <Text className="text-[11px] text-amber-500 font-bold">{prefs.flavorNotes.length}/3</Text>
              </View>
              
              <View className="flex-row flex-wrap justify-between gap-y-4 bg-espresso-900/40 border border-espresso-700/50 rounded-3xl p-4">
                {[
                  {v:'Chocolate', l:'f_chocolate', i: <Coffee size={24}/>}, {v:'Nutty', l:'f_nutty', i: <Coffee size={24}/>}, 
                  {v:'Caramel', l:'f_caramel', i: <Droplet size={24}/>}, {v:'Floral', l:'f_floral', i: <Flower2 size={24}/>}, 
                  {v:'Lemon', l:'f_lemon', i: <Citrus size={24}/>}, {v:'Berry', l:'f_berry', i: <Cherry size={24}/>},
                  {v:'Orange', l:'f_orange', i: <Sun size={24}/>}, {v:'Smoky', l:'f_smoky', i: <Flame size={24}/>}, 
                  {v:'Earthy', l:'f_earthy', i: <Sprout size={24}/>}, {v:'Peach', l:'f_peach', i: <Apple size={24}/>},
                  {v:'Lychee', l:'f_lychee', i: <CloudFog size={24}/>}
                ].map((f) => {
                  const isSel = prefs.flavorNotes.includes(f.v);
                  return (
                    <TouchableOpacity key={f.v} 
                      onPress={() => {
                        const newNotes = isSel ? prefs.flavorNotes.filter((n: string) => n !== f.v) : [...prefs.flavorNotes, f.v].slice(0,3);
                        setPrefs({...prefs, flavorNotes: newNotes});
                      }}
                      className="w-[30%] items-center gap-2 py-2">
                      <View className={`w-14 h-14 rounded-full items-center justify-center ${isSel ? 'bg-amber-500/20 border border-amber-500 shadow-md shadow-amber-500/30' : 'bg-transparent'}`}>
                        {React.cloneElement(f.i as React.ReactElement, { color: isSel ? "#f59e0b" : "#d3cec7" } as any)}
                      </View>
                      <Text className={`text-[10px] uppercase font-bold text-center ${isSel ? 'text-amber-500' : 'text-espresso-200'}`}>{t(`curator.${f.l}`)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* EQUIPMENT */}
            <View>
              <Text className="text-[13px] text-espresso-100 font-extrabold uppercase tracking-widest mb-3 ml-2">EQUIPMENT</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="bg-espresso-900/40 border border-espresso-700/50 rounded-3xl p-3">
                {[ {v:'Hand Drip', l:'e_handdrip', i: <Droplet size={24}/>}, {v:'Espresso', l:'e_espresso', i: <Coffee size={24}/>}, {v:'Capsule', l:'e_capsule', i: <Pill size={24}/>}, {v:'Moka Pot', l:'e_mokapot', i: <Flame size={24}/>}, {v:'French Press', l:'e_frenchpress', i: <Beaker size={24}/>}].map((e) => {
                  const isSel = prefs.equipment === e.v;
                  return (
                    <TouchableOpacity key={e.v} onPress={() => setPrefs({...prefs, equipment: e.v})} className="items-center gap-2 py-2 mx-2 w-[70px]">
                      <View className={`w-14 h-14 rounded-full items-center justify-center ${isSel ? 'bg-amber-500/20 border border-amber-500' : 'bg-transparent'}`}>
                        {React.cloneElement(e.i as React.ReactElement, { color: isSel ? "#f59e0b" : "#d3cec7" } as any)}
                      </View>
                      <Text className={`text-[10px] uppercase font-bold text-center ${isSel ? 'text-amber-500' : 'text-espresso-200'}`}>{t(`curator.${e.l}`)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

          </View>
        )}

        {step === 4 && (
          <View className="flex-1 items-center justify-center pt-20">
             <ActivityIndicator size="large" color="#f59e0b" />
             <Text className="text-espresso-200 mt-6 font-bold tracking-widest uppercase">Analyzing Profile...</Text>
             <Text className="text-espresso-400 mt-2 text-center text-xs px-10">AI is curating the perfect coffee for your {prefs.condition} mood in {prefs.weather} weather.</Text>
          </View>
        )}

        {step === 5 && recommendation && (
          <View className="space-y-6 pb-20">
             <View className="bg-espresso-900/40 border border-espresso-700/50 rounded-3xl p-6 items-center shadow-2xl">
                <Text className="text-amber-500 font-extrabold uppercase tracking-widest text-xs mb-2">Perfect Match</Text>
                <Text className="text-espresso-50 font-serif font-bold text-2xl text-center mb-1">{recommendation.bean?.name}</Text>
                <Text className="text-espresso-300 font-bold mb-4">by {recommendation.brand?.name}</Text>
                
                <View className="flex-row flex-wrap justify-center gap-2 mb-6">
                   {recommendation.bean?.flavorNotes?.map((n: string) => (
                     <View key={n} className="bg-espresso-800 px-3 py-1 rounded-full border border-espresso-700">
                        <Text className="text-espresso-200 text-xs font-bold">{n}</Text>
                     </View>
                   ))}
                </View>

                <Text className="text-espresso-200 text-center leading-relaxed">
                   {aiExplanation}
                </Text>
             </View>
             
             <TouchableOpacity className="w-full bg-espresso-800 py-4 rounded-xl items-center border border-espresso-700 shadow-md">
                <Text className="text-espresso-200 font-extrabold tracking-widest uppercase text-xs">View Map</Text>
             </TouchableOpacity>

          </View>
        )}
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      {step < 4 && (
        <View className="absolute bottom-0 left-0 right-0 p-6 pt-4 bg-espresso-950/90 border-t border-espresso-800 flex-row gap-4">
          {step > 1 && (
            <TouchableOpacity 
               onPress={() => setStep(step - 1)}
               className="w-1/3 bg-espresso-800 py-4 rounded-xl items-center border border-espresso-700">
               <Text className="text-espresso-200 font-extrabold tracking-widest uppercase">BACK</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
             onPress={step === 3 ? handleMatch : () => setStep(step + 1)}
             className="flex-1 bg-amber-500 py-4 rounded-xl items-center shadow-lg shadow-amber-500/20">
             <Text className="text-espresso-950 font-extrabold tracking-widest uppercase">{step === 3 ? 'CURATE' : 'NEXT'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 5 && (
        <View className="absolute bottom-0 left-0 right-0 p-6 pt-4 bg-espresso-950/90 border-t border-espresso-800 flex-row gap-4">
          <TouchableOpacity 
             onPress={() => router.back()}
             className="flex-1 bg-amber-500 py-4 rounded-xl items-center shadow-lg shadow-amber-500/20">
             <Text className="text-espresso-950 font-extrabold tracking-widest uppercase">DONE</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
