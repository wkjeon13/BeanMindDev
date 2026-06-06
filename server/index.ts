import 'dotenv/config';
if (!process.env.JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET environment variable is not defined. Server cannot start.");
    process.exit(1);
}
process.env.TZ = 'UTC';
import util from 'util';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(info => `[${info.timestamp}] ${info.level}: ${info.message}`)
    ),
    transports: [
        new DailyRotateFile({
            filename: 'logs/server-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d'
        })
    ]
});

const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = function (...args: any[]) {
    logger.info(util.format.apply(null, args));
    originalConsoleLog.apply(console, args);
};

console.error = function (...args: any[]) {
    logger.error(util.format.apply(null, args));
    originalConsoleError.apply(console, args);
};
import express from 'express'; 
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { PrismaClient } from '@prisma/client';

import prisma from './utils/prisma.js';
const app = express();
const port = 3001; // API server running on 3001 (Vite frontend on 3002)



// 1. CORS Hardening (Must be first to allow cross-origin static assets in Capacitor)
app.options('*', cors());
app.use(cors({
    origin: function (origin, callback) {
        // Allows requests with no origin (e.g. Mobile Apps/Capacitor, server-to-server Vite Proxy)
        if (!origin || origin === 'null') return callback(null, true);
        
        // Dynamically permit localhost, local network devices, and external IPs
        if (/^https?:\/\/(localhost|127\.0\.0\.1|\d+\.\d+\.\d+\.\d+(\.nip\.io)?|([a-z0-9-]+\.)*beanmindcurator\.com|appleid\.apple\.com)(:\d+)?$/.test(origin)) {
            return callback(null, true);
        }
        
        // Explicit overrides for Native Mobile Webviews
        if (origin === 'capacitor://localhost' || origin === 'ionic://localhost' || origin === 'http://localhost') {
            return callback(null, true);
        }
        
        return callback(new Error(`The CORS policy for this site does not allow access from the specified Origin: ${origin}`), false);
    },
    credentials: true,
    optionsSuccessStatus: 200
}));

// Serve static files BEFORE Helmet applies aggressive headers
// Explicitly inject '*' CORS headers into static media because Android's native WebView video player
// intentionally strips out the 'Origin' request header when fetching Byte-Range chunks, causing
// standard dynamic CORS middlewares to omit the 'Access-Control-Allow-Origin' response header,
// which natively blocks streaming cross-origin from 'http://localhost' to the API server.
app.use(express.static('public', {
    setHeaders: (res, path, stat) => {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    }
}));

app.use('/uploads', express.static('uploads', {
    setHeaders: (res, path, stat) => {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    }
})); 

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 2. HTTP Security Headers (Helmet) - Applied strictly to APIs, bypassing static assets
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
    strictTransportSecurity: false
}));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'BeanMind AI Coffee Curator API is running!' });
});

import authRoutes from './routes/auth.js';
import shopRoutes from './routes/shops.js';
import userRoutes from './routes/users.js';
import adminRoutes from './routes/admin.js';
import adminHeroRoutes from './routes/adminHero.js';
import adminFlashDropRoutes from './routes/adminFlashDrop.js';
import analyticsRoutes from './routes/analytics.js';
import pointRoutes from './routes/points.js';
import aiFeaturesRoutes from './routes/ai-features.js';
import aiCuratorRoutes from './routes/ai-curator.js';
import communityRoutes from './routes/community.js';
import clubsRoutes from './routes/clubs.js';
import adsRoutes from './routes/ads.js';
import homeRoutes from './routes/home.js';
import retentionRoutes from './routes/retention.js';
import stampsRoutes from './routes/stamps.js';
import complianceRoutes from './routes/compliance.js';

// Setup routing
app.use('/api/auth', authRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/hero', adminHeroRoutes);
app.use('/api/admin/flash-drops', adminFlashDropRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/points', pointRoutes);
app.use('/api/ai-features', aiFeaturesRoutes);
app.use('/api/curation', aiCuratorRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/clubs', clubsRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/retention', retentionRoutes);
app.use('/api/stamps', stampsRoutes);
app.use('/api/compliance', complianceRoutes);

// Global Error Handler for Express
app.use((err: any, req: any, res: any, next: any) => {
    console.error('[Express Global Error]', err);
    if (res.headersSent) return next(err);
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' });
});

// Process-level Crash Shields
process.on('unhandledRejection', (reason, promise) => {
    console.error('[Unhandled Promise Rejection]', reason);
});
process.on('uncaughtException', (err) => {
    console.error('[Uncaught Exception]', err);
});

import { initMediaCleanupJob } from './workers/mediaCleanupJob.js';
import { seedLegalPolicies } from './utils/legalPolicySeeder.js';

const server = app.listen(port, '0.0.0.0', async () => {
    console.log(`[Server] BeanMind AI Coffee Curator API running on port ${port}`);
    console.log(`[Server] Booting up... Node-cron initialized.`);
    
    // Seed initial Terms & Privacy version
    await seedLegalPolicies();
    
    // Phase 10: Initialize Media Garbage Collector (Runs 03:00 AM)
    initMediaCleanupJob();
});
server.setTimeout(600000); // 10 minutes
