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
    let val;
    if (Platform.OS === 'web') {
        val = localStorage.getItem(key);
    } else {
        val = await AsyncStorage.getItem(key);
    }
    if (val === 'null' || val === 'undefined') return null;
    return val;
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
    let val;
    if (Platform.OS === 'web') {
        val = sessionStorage.getItem(key);
    } else {
        val = await SecureStore.getItemAsync(key);
    }
    if (val === 'null' || val === 'undefined') return null;
    return val;
};

export const removeSecureItem = async (key: string) => {
    if (Platform.OS === 'web') {
        sessionStorage.removeItem(key);
    } else {
        await SecureStore.deleteItemAsync(key);
    }
};
