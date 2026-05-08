import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

let isInitialized = false;

export const initFirebaseAdmin = () => {
    if (isInitialized) return;

    try {
        // You would typically store the service account key in a secure location or env var.
        // For development/MVP, we'll try to load it from a local file if it exists,
        // otherwise we won't throw, but push won't work until configured.
        const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
        
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            isInitialized = true;
            console.log('Firebase Admin SDK initialized successfully.');
        } else {
            console.warn('Firebase Admin SDK warning: serviceAccountKey.json not found. Push notifications will be disabled.');
        }
    } catch (error) {
        console.error('Failed to initialize Firebase Admin SDK:', error);
    }
};

export const sendPushNotification = async (token: string, title: string, body: string, data?: any) => {
    if (!isInitialized) {
         console.warn('FCM blocked: Firebase Admin SDK is not initialized.');
         return false;
    }

    try {
        const message = {
            notification: {
                title,
                body
            },
            data: data || {},
            token
        };

        const response = await admin.messaging().send(message);
        console.log('Successfully sent message:', response);
        return true;
    } catch (error) {
        console.error('Error sending message:', error);
        return false;
    }
};
