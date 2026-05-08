import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AdRecord {
    id: string;
    viewedAt: number;
    type: 'DIRECT' | 'ADMOB';
    tab: 'FEED' | 'SHORTS' | 'MAP' | 'MAGAZINE';
}

interface AdState {
    viewedAds: AdRecord[];
    recordAdView: (id: string, type: 'DIRECT' | 'ADMOB', tab: 'FEED' | 'SHORTS' | 'MAP' | 'MAGAZINE') => void;
    canShowAd: (id: string, frequencyCapMs?: number) => boolean;
    clearOldRecords: (maxAgeMs?: number) => void;
}

const DEFAULT_FREQ_CAP_MS = 1000 * 60 * 60 * 24; // 24 hours

export const useAdStore = create<AdState>()(
    persist(
        (set, get) => ({
            viewedAds: [],

            recordAdView: (id, type, tab) => {
                set((state) => ({
                    viewedAds: [
                        ...state.viewedAds.filter(ad => ad.id !== id), // Remove existing record if any to update timestamp
                        { id, type, tab, viewedAt: Date.now() }
                    ]
                }));
            },

            canShowAd: (id, frequencyCapMs = DEFAULT_FREQ_CAP_MS) => {
                const now = Date.now();
                const ad = get().viewedAds.find(a => a.id === id);
                if (!ad) return true;
                return (now - ad.viewedAt) > frequencyCapMs;
            },

            clearOldRecords: (maxAgeMs = DEFAULT_FREQ_CAP_MS) => {
                const now = Date.now();
                set((state) => ({
                    viewedAds: state.viewedAds.filter(ad => (now - ad.viewedAt) <= maxAgeMs)
                }));
            }
        }),
        {
            name: 'beanmind-ad-storage',
            partialize: (state) => ({ viewedAds: state.viewedAds }),
        }
    )
);
