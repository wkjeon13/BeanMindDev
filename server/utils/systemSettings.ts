import fs from 'fs';
import path from 'path';

const configPath = path.resolve(process.cwd(), 'systemSettings.json');

let inMemorySettings: Record<string, any> = {
    isHotspotFeatureEnabled: true,
    spamRateLimitCount: 5,
    spamRateLimitTimeMs: 60000,
    autoBlindReportCount: 5
};

export function loadSettings() {
    try {
        if (fs.existsSync(configPath)) {
            const fileData = fs.readFileSync(configPath, 'utf-8');
            inMemorySettings = { ...inMemorySettings, ...JSON.parse(fileData) };
        }
    } catch(e) {
        console.error("Failed to load system settings", e);
    }
}

export function getSettings() {
    return inMemorySettings;
}

export function updateSettings(newSettings: Record<string, any>) {
    inMemorySettings = { ...inMemorySettings, ...newSettings };
    try {
        fs.writeFileSync(configPath, JSON.stringify(inMemorySettings, null, 2), 'utf-8');
    } catch(e) {
        console.error("Failed to save system settings", e);
    }
}

// Initial Load
loadSettings();
