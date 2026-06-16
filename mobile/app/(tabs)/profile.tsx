import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Mail, KeyRound, Coffee } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { getItem, setSecureItem } from '../../utils/storage';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otp, setOtp] = useState('');

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  React.useEffect(() => {
    getItem('token').then((token) => {
      if (token) setIsAuthenticated(true);
    });
  }, []);

  if (isAuthenticated) {
    return (
      <ScrollView className="flex-1 bg-espresso-950">
        <View className="p-6 pt-12 items-center">
            <View className="w-24 h-24 bg-espresso-800 rounded-full items-center justify-center border-4 border-amber-500/30 mb-4">
                <Coffee size={40} color="#d0ba9e" />
            </View>
            <Text className="text-xl font-bold text-espresso-50">Welcome Back</Text>
            <Text className="text-sm text-espresso-200 mt-2">Authenticated User</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView className="flex-1 bg-espresso-950 px-6 pt-12">
      <View className="bg-espresso-900 border border-espresso-700/50 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <View className="flex flex-col gap-1 mb-8">
              <Text className="font-serif font-extrabold text-[#f5f4f2] text-2xl tracking-tight leading-snug">
                  {t('profile.lbl_login')}
              </Text>
              <Text className="text-[13px] text-[#b8b0a7] font-medium tracking-tight">
                  {t('profile.lbl_login_sub')}
              </Text>
          </View>

          <View className="space-y-4">
              <View className="relative">
                  <View className="absolute left-4 top-0 bottom-0 justify-center z-10">
                      <Mail color="#897c74" size={18} />
                  </View>
                  <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder={t('profile.ph_email')}
                      placeholderTextColor="#a3988c"
                      className="w-full bg-[#1c1a19] text-[#f5f4f2] text-[15px] font-medium rounded-2xl pl-12 pr-4 h-14 border border-transparent focus:border-[#ab8256]/50"
                      keyboardType="email-address"
                      autoCapitalize="none"
                  />
              </View>

              <TouchableOpacity 
                  className={`w-full h-14 flex items-center justify-center rounded-2xl mt-2 ${email ? 'bg-amber-600' : 'bg-espresso-800'}`}
                  disabled={!email}
                  onPress={() => setIsOtpSent(true)}
              >
                  <Text className={`font-bold text-[15px] ${email ? 'text-white' : 'text-espresso-400'}`}>
                      {t('profile.btn_send_otp')}
                  </Text>
              </TouchableOpacity>
          </View>
      </View>
    </ScrollView>
  );
}
