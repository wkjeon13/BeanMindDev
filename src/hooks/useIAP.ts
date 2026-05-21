import { useState, useEffect } from 'react';
import { Purchases, PurchasesOffering, PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

// This API Key should ideally be in .env (e.g. VITE_RC_PUBLIC_KEY)
// For Apple: public_apple_xxxxxxxxxxxx
// For Google: goog_xxxxxxxxxxxx
const RC_API_KEY_IOS = import.meta.env.VITE_RC_PUBLIC_KEY_IOS || 'appl_OYHLfHBeeuuaKXOzLoIzYBTXDzL';
const RC_API_KEY_ANDROID = import.meta.env.VITE_RC_PUBLIC_KEY_ANDROID || 'goog_DFNcNbHRCEgZyulewvaeMCQIeXf';

export function useIAP(userId?: string) {
    const [isConfigured, setIsConfigured] = useState(false);
    const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function initIAP() {
            if (!Capacitor.isNativePlatform()) {
                // RevenueCat Capacitor plugin requires native execution
                console.warn('IAP is not available on web platform. Mocking or disabling IAP.');
                setIsLoading(false);
                return;
            }

            try {
                // Determine platform key
                const apiKey = Capacitor.getPlatform() === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
                
                // Configure Purchases SDK
                if (userId) {
                    await Purchases.configure({ apiKey, appUserID: userId });
                } else {
                    await Purchases.configure({ apiKey });
                }

                if (isMounted) setIsConfigured(true);

                // Fetch products (offerings)
                const offerData = await Purchases.getOfferings();
                if (offerData.current && isMounted) {
                    setOfferings(offerData.current);
                }
            } catch (err: any) {
                console.error("RevenueCat Initialization Error:", err);
                if (isMounted) setError(err.message || 'Failed to initialize IAP');
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }

        initIAP();

        return () => {
            isMounted = false;
        };
    }, [userId]);

    const purchasePackage = async (pkg: PurchasesPackage) => {
        try {
            const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
            return { success: true, customerInfo };
        } catch (e: any) {
            console.error("Purchase Error:", e);
            if (!e.userCancelled) {
                // Handle actual error
                return { success: false, error: e.message || 'Purchase failed' };
            }
            return { success: false, error: 'USER_CANCELLED' };
        }
    };

    return {
        isConfigured,
        offerings,
        isLoading,
        error,
        purchasePackage
    };
}
