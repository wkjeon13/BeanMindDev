import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const setItem = async (key: string, value: string) => {
    if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
    } else {
        await AsyncStorage.setItem(key, value);
    }
};

export const getItem = async (key: string) => {
    if (Platform.OS === 'web') {
        return localStorage.getItem(key);
    } else {
        return await AsyncStorage.getItem(key);
    }
};

export const removeItem = async (key: string) => {
    if (Platform.OS === 'web') {
        localStorage.removeItem(key);
    } else {
        await AsyncStorage.removeItem(key);
    }
};

// For Sensitive Data like JWT Tokens
export const setSecureItem = async (key: string, value: string) => {
    if (Platform.OS === 'web') {
        sessionStorage.setItem(key, value); // Web fallback
    } else {
        await SecureStore.setItemAsync(key, value);
    }
};

export const getSecureItem = async (key: string) => {
    if (Platform.OS === 'web') {
        return sessionStorage.getItem(key);
    } else {
        return await SecureStore.getItemAsync(key);
    }
};

export const removeSecureItem = async (key: string) => {
    if (Platform.OS === 'web') {
        sessionStorage.removeItem(key);
    } else {
        await SecureStore.deleteItemAsync(key);
    }
};
