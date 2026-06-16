import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Coffee } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function IndexScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <View className="flex-1 bg-espresso-950 items-center justify-center p-6 pt-12">
      
      <View className="w-24 h-24 rounded-full border border-espresso-600 items-center justify-center mb-10 bg-espresso-900/40">
        <Coffee size={40} color="#f5f4f2" />
      </View>

      <Text className="text-[38px] font-serif font-bold text-espresso-50 text-center tracking-tight mb-6 leading-tight">
        {t('curator.intro_title', 'Find Your\nPerfect Bean').replace(/<br \/>/g, '\n')}
      </Text>

      <Text className="text-base text-espresso-200 text-center max-w-[280px] mb-12 leading-6">
        {t('curator.intro_desc', 'Get custom coffee recommendations based on your mood, weather, and taste preferences.').replace(/<br \/>/g, '\n')}
      </Text>

      <TouchableOpacity 
        className="w-full max-w-[280px] bg-amber-500 rounded-2xl py-4 shadow-lg shadow-amber-500/30"
        onPress={() => router.push('/curator')}
        activeOpacity={0.8}
      >
        <Text className="text-center text-espresso-950 font-extrabold text-lg tracking-widest uppercase">
          {t('curator.intro_start', 'START')}
        </Text>
      </TouchableOpacity>

    </View>
  );
}
