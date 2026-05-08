import { useState, useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { API_BASE } from '../utils/apiConfig';

export const usePushNotifications = (isAuthenticated: boolean) => {
    const [fcmToken, setFcmToken] = useState<string | null>(null);

    useEffect(() => {
        // Only run on native platforms (iOS/Android) and when user is logged in
        if (!Capacitor.isNativePlatform() || !isAuthenticated) return;

        const registerPushNotifications = async () => {
            // [TEMPORARY FIX] Disable push notification request on Android
            // because it is causing a native UI crash on this device.
            console.log("Push notifications temporarily disabled to prevent crash.");
            return;
        };

        // On success, we should be able to receive notifications
        PushNotifications.addListener('registration', async (token) => {
            console.log('Push registration success, token: ' + token.value);
            setFcmToken(token.value);
            
            // Send token to our backend
            const sessionToken = localStorage.getItem('token');
            if (sessionToken) {
                try {
                    await fetch(`${API_BASE}/api/users/me/fcm-token`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${sessionToken}`
                        },
                        body: JSON.stringify({ fcmToken: token.value })
                    });
                    console.log('Successfully synced FCM token to backend.');
                } catch (e) {
                    console.error('Failed to sync FCM token to backend:', e);
                }
            }
        });

        // Some issue with our setup and push will not work
        PushNotifications.addListener('registrationError', (error: any) => {
            console.error('Error on registration: ' + JSON.stringify(error));
        });

        // Show us the notification payload if the app is open on our device
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('Push received: ', notification);
            // In a real app, you might want to show a custom toast or update a badge here
        });

        // Method called when tapping on a notification
        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
            console.log('Push action performed: ', notification);
            // Handle navigation or specific actions based on notification data payload
        });

        registerPushNotifications();

        // Cleanup listeners
        return () => {
            PushNotifications.removeAllListeners();
        };

    }, [isAuthenticated]);

    return { fcmToken };
};
