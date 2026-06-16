import { Platform } from 'react-native';
import Constants from 'expo-constants';

let apiBase = process.env.EXPO_PUBLIC_API_URL || '';

if (__DEV__ && !apiBase) {
    const debuggerHost = Constants.expoConfig?.hostUri;
    if (debuggerHost) {
        // Automatically route to the PC's actual LAN IP rather than error-prone localhost bindings
        apiBase = `http://${debuggerHost.split(':')[0]}:3001`;
    } else {
        if (Platform.OS === 'android') {
            apiBase = 'http://10.0.2.2:3001';
        } else {
            apiBase = 'http://localhost:3001';
        }
    }
}

export const API_BASE = apiBase;
