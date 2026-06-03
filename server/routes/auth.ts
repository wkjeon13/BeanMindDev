import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';
import { encryptPII } from '../utils/encryption.js';
import { sendVerificationEmail } from '../utils/mailer';
import rateLimit from 'express-rate-limit';
import { ERROR_CODES } from '../utils/errorCodes.js';
import { logUserAccess } from '../utils/logger.js';

const router = express.Router();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { error: ERROR_CODES.TOO_MANY_REQUESTS }
});

import prisma from '../utils/prisma.js';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET as string;

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const POLICY_FILE = path.join(process.cwd(), 'data', 'policy.json');
const getRegistrationWelcomePolicy = () => {
    try {
        if (fs.existsSync(POLICY_FILE)) {
            const data = fs.readFileSync(POLICY_FILE, 'utf-8');
            const policy = JSON.parse(data);
            return {
                welcomeBeans: policy.welcomeBeans !== undefined ? parseInt(policy.welcomeBeans) : 0,
                welcomeFreePrescriptions: policy.welcomeFreePrescriptions !== undefined ? parseInt(policy.welcomeFreePrescriptions) : 3
            };
        }
    } catch (e) {
        console.error("Failed to read welcome policy:", e);
    }
    return { welcomeBeans: 0, welcomeFreePrescriptions: 3 };
};

// Helper to generate a 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper: Password complexity validation
// At least 8 characters, 1 uppercase, 1 lowercase, 1 number, and 1 special character
const isComplexPassword = (password: string) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(password);
};

// Middleware to automatically normalize email to lowercase
router.use((req, res, next) => {
    if (req.body && req.body.email && typeof req.body.email === 'string') {
        req.body.email = req.body.email.trim().toLowerCase();
    }
    next();
});

// Register User
router.post('/register', authLimiter, async (req, res) => {
    try {
        const { email, password, nickname, role, ageGroup, gender, favoriteCafe, countryCode, preferredLanguage } = req.body;

        if (!email || !password || !nickname) {
            return res.status(400).json({ errorCode: ERROR_CODES.MISSING_REQUIRED_FIELDS });
        }

        if (!isComplexPassword(password)) {
            return res.status(400).json({ error: ERROR_CODES.PASSWORD_INVALID });
        }

        // Check unique email
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            if (existingUser.isEmailVerified) {
                return res.status(409).json({ error: ERROR_CODES.EMAIL_ALREADY_EXISTS });
            }
            // If unverified, we proceed to update the existing record instead of throwing an error.
        }

        const isTestAccount = email.endsWith('@example.com') || email.endsWith('@test.com') || email.endsWith('@beanmind.com');

        // Hash password securely
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate OTP
        const otp = generateOTP();
        const expires = new Date();
        expires.setMinutes(expires.getMinutes() + 5); // 5 mins expiration

        let newUser;
        if (existingUser) {
            newUser = await prisma.user.update({
                where: { email },
                data: {
                    password: hashedPassword,
                    nickname,
                    role: role === 'OWNER' ? 'OWNER' : 'USER',
                    ageGroup,
                    gender,
                    favoriteCafe,
                    countryCode: countryCode || 'KR',
                    preferredLanguage: preferredLanguage || 'ko',
                    verificationCode: otp,
                    verificationExpires: expires
                }
            });
        } else {
            const welcomePolicy = getRegistrationWelcomePolicy();
            newUser = await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    nickname,
                    role: role === 'OWNER' ? 'OWNER' : 'USER',
                    ageGroup,
                    gender,
                    favoriteCafe,
                    countryCode: countryCode || 'KR',
                    preferredLanguage: preferredLanguage || 'ko',
                    isEmailVerified: isTestAccount,
                    verificationCode: otp,
                    verificationExpires: expires,
                    aiPrescriptionLimit: welcomePolicy.welcomeFreePrescriptions,
                    pointBalance: welcomePolicy.welcomeBeans
                }
            });
        }

        if (isTestAccount) {
            return res.status(201).json({
                message: 'Test account registered and automatically verified.',
                requiresVerification: false,
                email: newUser.email
            });
        }

        // Send Verification Email
        const emailSent = await sendVerificationEmail(email, otp);
        if (!emailSent) {
            console.error("Warning: Failed to dispatch real verification email.");
        }

        res.status(201).json({
            message: 'User registered. Please check email for verification code.',
            requiresVerification: true,
            email: newUser.email,
            developmentOnlyCode: process.env.NODE_ENV !== 'production' ? otp : undefined
        });

    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ errorCode: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// Login User
router.post('/login', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ errorCode: ERROR_CODES.MISSING_REQUIRED_FIELDS });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ errorCode: ERROR_CODES.USER_NOT_FOUND });
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) {
            const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
            return res.status(403).json({ error: ERROR_CODES.ACCOUNT_LOCKED });
        }

        // Verify password
        if (!user.password) {
            return res.status(401).json({ error: ERROR_CODES.SOCIAL_LOGIN_CANT_CHANGE_PW });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            const newAttempts = (user.failedLoginAttempts || 0) + 1;
            if (newAttempts >= 5) {
                const lockTime = new Date(Date.now() + 15 * 60 * 1000);
                await prisma.user.update({
                    where: { id: user.id },
                    data: { failedLoginAttempts: newAttempts, lockedUntil: lockTime }
                });
                return res.status(401).json({ error: ERROR_CODES.ACCOUNT_LOCKED });
            } else {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { failedLoginAttempts: newAttempts }
                });
                return res.status(401).json({ error: ERROR_CODES.LOGIN_FAILED });
            }
        }

        if (user.failedLoginAttempts > 0 || user.lockedUntil) {
            await prisma.user.update({
                where: { id: user.id },
                data: { failedLoginAttempts: 0, lockedUntil: null }
            });
        }

        const isTestAccount = email.endsWith('@example.com') || email.endsWith('@test.com') || email.endsWith('@beanmind.com');

        if (!user.isEmailVerified && isTestAccount) {
            await prisma.user.update({
                where: { id: user.id },
                data: { isEmailVerified: true }
            });
        } else if (!user.isEmailVerified) {
            // Auto-generate and re-send an OTP so they can actually verify 
            const otp = generateOTP();
            const expires = new Date();
            expires.setMinutes(expires.getMinutes() + 5);

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    verificationCode: otp,
                    verificationExpires: expires
                }
            });

            // Send Verification Email
            const emailSent = await sendVerificationEmail(email, otp);
            if (!emailSent) {
                console.error("Warning: Failed to dispatch real verification email.");
            }

            return res.status(403).json({
                error: ERROR_CODES.UNAUTHORIZED,
                requiresVerification: true,
                email: user.email,
                developmentOnlyCode: process.env.NODE_ENV !== 'production' ? otp : undefined
            });
        }

        // Issue JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        logUserAccess(req as any, 'LOGIN', '/login', user.id, user.email);

        res.status(200).json({
            message: 'Login successful!',
            token,
            user: {
                id: user.id,
                email: user.email,
                nickname: user.nickname,
                role: user.role,
                profileImageUrl: user.profileImageUrl,
                ageGroup: user.ageGroup,
                gender: user.gender,
                favoriteCafe: user.favoriteCafe,
                preferredLanguage: user.preferredLanguage
            }
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ errorCode: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// Google OAuth Login
router.post('/google', authLimiter, async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ errorCode: ERROR_CODES.MISSING_REQUIRED_FIELDS });
        }

        let email, name, googleId;

        if (token.split('.').length === 3) {
            // Very likely an ID token (JWT)
            const iosClientId = '930079967834-ibcg0ai2amufd7ddv4danvi7bd4loq5m.apps.googleusercontent.com';
            const webClientId = process.env.GOOGLE_CLIENT_ID || '';
            const androidClientId = '930079967834-0ohcokilnrddppub69ku3meqp11dp8am.apps.googleusercontent.com'; // Using web client id for android by default usually, or add android specific if provided

            const ticket = await googleClient.verifyIdToken({
                idToken: token,
                audience: [webClientId, iosClientId, androidClientId].filter(Boolean),
            });
            const payload = ticket.getPayload();
            if (!payload || !payload.email) {
                return res.status(400).json({ error: ERROR_CODES.INVALID_TOKEN });
            }
            email = payload.email;
            name = payload.name;
            googleId = payload.sub;
        } else {
            // Treat as Access Token from useGoogleLogin implicit flow
            const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok || !data.email) {
                return res.status(400).json({ error: ERROR_CODES.INVALID_TOKEN });
            }
            email = data.email;
            name = data.name;
            googleId = data.sub;
        }

        // Try to find if user exists using their Google Social ID first, or by their email explicitly.
        let user = await prisma.user.findFirst({
            where: {
                OR: [
                    { socialId: googleId },
                    { email: email }
                ]
            }
        });

        if (!user) {
            // Unregistered user -> Need role selection
            return res.status(202).json({
                message: '소셜 로그인 인증 성공. 추가 정보(권한) 입력이 필요합니다.',
                requiresRoleSelection: true,
                tempUser: {
                    email,
                    name: name || email.split('@')[0],
                    googleId
                }
            });
        } else {
            // User exists via Email, link it smoothly
            if (!user.socialId) {
                user = await prisma.user.update({
                    where: { email },
                    data: {
                        socialId: googleId,
                        loginType: 'GOOGLE',
                        isEmailVerified: true // Set it to true just in case
                    }
                });
            }
        }

        // Issue JWT token exactly like the regular login route
        const jwtToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        logUserAccess(req as any, 'LOGIN', '/google', user.id, user.email);

        res.status(200).json({
            message: 'Google login successful!',
            token: jwtToken,
            user: {
                id: user.id,
                email: user.email,
                nickname: user.nickname,
                role: user.role,
                profileImageUrl: user.profileImageUrl,
                ageGroup: user.ageGroup,
                gender: user.gender,
                favoriteCafe: user.favoriteCafe,
                preferredLanguage: user.preferredLanguage
            }
        });

    } catch (error: any) {
        console.error("Google Auth error:", error?.message || error);
        res.status(401).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// Google OAuth Register (called after role selection)
router.post('/google/register', authLimiter, async (req, res) => {
    try {
        const { email, name, googleId, role, ageGroup, gender, favoriteCafe, countryCode, preferredLanguage } = req.body;

        if (!email || !googleId || !role) {
            return res.status(400).json({ error: ERROR_CODES.MISSING_REQUIRED_FIELDS });
        }

        const welcomePolicy = getRegistrationWelcomePolicy();
        const user = await prisma.user.create({
            data: {
                email,
                nickname: name,
                loginType: 'GOOGLE',
                socialId: googleId,
                isEmailVerified: true, // Auto-verified by Google
                role: role === 'OWNER' ? 'OWNER' : 'USER',
                ageGroup,
                gender,
                favoriteCafe,
                countryCode: countryCode || 'KR',
                preferredLanguage: preferredLanguage || 'ko',
                aiPrescriptionLimit: welcomePolicy.welcomeFreePrescriptions,
                pointBalance: welcomePolicy.welcomeBeans
            }
        });

        const jwtToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        logUserAccess(req as any, 'LOGIN', '/google/register', user.id, user.email);

        res.status(201).json({
            message: 'Google login successful!',
            token: jwtToken,
            user: {
                id: user.id,
                email: user.email,
                nickname: user.nickname,
                role: user.role,
                profileImageUrl: user.profileImageUrl,
                ageGroup: user.ageGroup,
                gender: user.gender,
                favoriteCafe: user.favoriteCafe,
                preferredLanguage: user.preferredLanguage
            }
        });
    } catch (error) {
        console.error("Google Auth Register error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// Apple Login Callback (Deep Link Trampoline for Android WebView bypass)
router.post('/apple/callback', async (req, res) => {
    try {
        const { id_token, user: userJsonString, state } = req.body;
        
        if (!id_token) {
            return res.status(400).send("No Apple token provided in callback.");
        }

        // We don't verify the token here, we just proxy it back to the app via Deep Link.
        // The frontend AppUrlOpen listener will catch this, extract the token,
        // and then call the existing POST /api/auth/apple endpoint to actually log the user in!
        
        let redirectUrl = `capcurator://apple-login?token=${id_token}`;
        if (userJsonString) {
            redirectUrl += `&user=${encodeURIComponent(userJsonString)}`;
        }
        
        // Return an HTML script that redirects the user's browser back to the native app
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>Apple Login Callback</title>
                <style>
                    body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f8f8f8; }
                    .message { text-align: center; padding: 20px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                </style>
            </head>
            <body>
                <div class="message">
                    <h3>인증 완료</h3>
                    <p>앱으로 돌아가는 중입니다...</p>
                </div>
                <script>
                    setTimeout(() => {
                        window.location.href = "${redirectUrl}";
                    }, 500);
                </script>
            </body>
            </html>
        `;
        return res.send(html);
    } catch (error) {
        console.error("Apple callback error:", error);
        return res.status(500).send("Internal Server Error during Apple Callback");
    }
});

// Handle GET requests (Apple sometimes redirects via GET when there's an error like invalid_client)
router.get('/apple/callback', async (req, res) => {
    const error = req.query.error;
    console.error("Apple GET callback error:", error);
    
    // We can redirect back to the app with the error
    let redirectUrl = `capcurator://apple-login?error=${error || 'unknown_apple_error'}`;
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Apple Login Error</title>
            <style>
                body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f8f8f8; }
                .message { text-align: center; padding: 20px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); color: red; }
            </style>
        </head>
        <body>
            <div class="message">
                <h3>애플 로그인 설정 오류</h3>
                <p>Apple Server Error: ${error}</p>
                <p>앱으로 돌아가는 중입니다...</p>
            </div>
            <script>
                setTimeout(() => {
                    window.location.href = "${redirectUrl}";
                }, 2000);
            </script>
        </body>
        </html>
    `;
    return res.send(html);
});

// Apple Login
router.post('/apple', authLimiter, async (req, res) => {
    try {
        const { token, name } = req.body;
        if (!token) {
            return res.status(400).json({ error: 'No token provided' });
        }

        let appleId = '';
        let email = '';
        try {
            // Verify token with Apple's JWKS
            const decoded = await appleSignin.verifyIdToken(token, {
                audience: [
                    process.env.APPLE_CLIENT_ID || 'com.beanmind.curator', // iOS App ID
                    process.env.VITE_APPLE_CLIENT_ID || 'com.beanmind.curator.web' // Android/Web Services ID
                ],
                ignoreExpiration: true // Optional, capacitor tokens might not have standard expiration handling depending on the device time
            });
            appleId = decoded.sub;
            email = decoded.email || '';
        } catch (err) {
            console.error("Apple token verification failed:", err);
            return res.status(401).json({ error: 'Invalid Apple token' });
        }

        // Check if user exists
        let user = await prisma.user.findFirst({
            where: {
                OR: [
                    { socialId: appleId },
                    { email: email }
                ]
            }
        });

        if (user) {
            // User exists, log them in
            if (!user.socialId && user.email === email) {
                // Link account if email matches but socialId isn't set (e.g. they registered via email originally)
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { socialId: appleId, loginType: 'APPLE' }
                });
            }

            const jwtToken = jwt.sign(
                { id: user.id, email: user.email, role: user.role },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            logUserAccess(req as any, 'LOGIN', '/apple', user.id, user.email);

            return res.status(200).json({
                message: 'Apple login successful!',
                token: jwtToken,
                user: {
                    id: user.id,
                    email: user.email,
                    nickname: user.nickname,
                    role: user.role,
                    profileImageUrl: user.profileImageUrl,
                    ageGroup: user.ageGroup,
                    gender: user.gender,
                    favoriteCafe: user.favoriteCafe,
                    preferredLanguage: user.preferredLanguage
                }
            });
        } else {
            // New user, requires role and demographics
            return res.status(202).json({
                requiresRoleSelection: true,
                tempUser: {
                    email: email,
                    name: name || '',
                    appleId: appleId
                }
            });
        }
    } catch (error) {
        console.error("Apple Auth error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

router.post('/apple/register', authLimiter, async (req, res) => {
    try {
        const { email, name, appleId, role, ageGroup, gender, favoriteCafe, countryCode, preferredLanguage } = req.body;

        if (!appleId || !role) {
            return res.status(400).json({ error: ERROR_CODES.MISSING_REQUIRED_FIELDS });
        }

        const welcomePolicy = getRegistrationWelcomePolicy();
        const user = await prisma.user.create({
            data: {
                email: email || `${appleId}@apple.user.local`, // Apple might hide email
                nickname: name || 'Apple User',
                loginType: 'APPLE',
                socialId: appleId,
                isEmailVerified: true, // Apple verified
                role: role === 'OWNER' ? 'OWNER' : 'USER',
                ageGroup,
                gender,
                favoriteCafe,
                countryCode: countryCode || 'KR',
                preferredLanguage: preferredLanguage || 'ko',
                aiPrescriptionLimit: welcomePolicy.welcomeFreePrescriptions,
                pointBalance: welcomePolicy.welcomeBeans
            }
        });

        const jwtToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        logUserAccess(req as any, 'LOGIN', '/apple/register', user.id, user.email);

        res.status(201).json({
            message: 'Apple register successful!',
            token: jwtToken,
            user: {
                id: user.id,
                email: user.email,
                nickname: user.nickname,
                role: user.role,
                profileImageUrl: user.profileImageUrl,
                ageGroup: user.ageGroup,
                gender: user.gender,
                favoriteCafe: user.favoriteCafe,
                preferredLanguage: user.preferredLanguage
            }
        });
    } catch (error) {
        console.error("Apple Auth Register error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// Verify Email OTP
router.post('/verify-email', authLimiter, async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) return res.status(400).json({ error: ERROR_CODES.MISSING_REQUIRED_FIELDS });

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ error: ERROR_CODES.USER_NOT_FOUND });

        if (user.isEmailVerified) {
            return res.status(400).json({ error: ERROR_CODES.EMAIL_ALREADY_EXISTS });
        }

        if (user.verificationCode !== code) {
            return res.status(400).json({ error: ERROR_CODES.INVALID_VERIFICATION_CODE });
        }

        if (!user.verificationExpires || new Date() > user.verificationExpires) {
            return res.status(400).json({ error: ERROR_CODES.INVALID_TOKEN });
        }

        // Success! Mark verified and log them in
        await prisma.user.update({
            where: { id: user.id },
            data: {
                isEmailVerified: true,
                verificationCode: null,
                verificationExpires: null
            }
        });

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        logUserAccess(req as any, 'LOGIN', '/verify-email', user.id, user.email);

        res.status(200).json({
            message: 'Email verified successfully! Logged in.',
            token,
            user: {
                id: user.id,
                email: user.email,
                nickname: user.nickname,
                role: user.role,
                preferredLanguage: user.preferredLanguage
            }
        });

    } catch (error) {
        console.error("Verify email error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// Resend OTP
router.post('/resend-code', authLimiter, async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: ERROR_CODES.MISSING_REQUIRED_FIELDS });

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ error: ERROR_CODES.USER_NOT_FOUND });
        if (user.isEmailVerified) return res.status(400).json({ error: ERROR_CODES.EMAIL_ALREADY_EXISTS });

        const otp = generateOTP();
        const expires = new Date();
        expires.setMinutes(expires.getMinutes() + 5);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                verificationCode: otp,
                verificationExpires: expires
            }
        });

        // Send Verification Email
        const emailSent = await sendVerificationEmail(email, otp);
        if (!emailSent) {
            console.error("Warning: Failed to dispatch real verification email.");
        }

        res.status(200).json({
            message: 'Verification code resent successfully.',
            developmentOnlyCode: process.env.NODE_ENV !== 'production' ? otp : undefined
        });
    } catch (error) {
        console.error("Resend code error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// Find ID by Nickname
router.post('/find-id', authLimiter, async (req, res) => {
    try {
        const { nickname } = req.body;
        if (!nickname) return res.status(400).json({ error: ERROR_CODES.NICKNAME_REQUIRED });

        const user = await prisma.user.findFirst({ where: { nickname } });
        
        if (!user) {
            return res.status(404).json({ error: ERROR_CODES.USER_NOT_FOUND });
        }

        const [local, domain] = user.email.split('@');
        const maskedLocal = local.length > 2 ? local.substring(0, 2) + '*'.repeat(local.length - 2) : local;
        const maskedEmail = `${maskedLocal}@${domain}`;

        res.status(200).json({ email: maskedEmail });
    } catch (error) {
        console.error("Find ID error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// Reset Password Request (Find PW)
router.post('/reset-password-request', authLimiter, async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: ERROR_CODES.MISSING_REQUIRED_FIELDS });

        const user = await prisma.user.findUnique({ where: { email } });
        
        let otp = null;
        if (user) {
            otp = generateOTP();
            const expires = new Date();
            expires.setMinutes(expires.getMinutes() + 5); // 5 mins for PW reset

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    verificationCode: otp,
                    verificationExpires: expires
                }
            });

            console.log(`\n===========================================`);
            console.log(`🚨 Password Reset Request for: ${email}`);
            console.log(`🔑 Reset Code: ${otp}`);
            console.log(`===========================================\n`);

            // Transmit the real Email
            const emailSent = await sendVerificationEmail(email, otp, 'reset-password');
            if (!emailSent) {
                console.error("Warning: Failed to dispatch real reset-password email.");
            }
        }

        // Always return 200 to prevent enumeration attack
        res.status(200).json({
            message: '가입된 계정인 경우, 비밀번호 재설정 코드가 발송되었습니다.',
            developmentOnlyCode: process.env.NODE_ENV !== 'production' && otp ? otp : undefined
        });
    } catch (error) {
        console.error("Reset PW Request error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// Reset Password Confirm
router.post('/reset-password', authLimiter, async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;
        if (!email || !code || !newPassword) {
            return res.status(400).json({ error: ERROR_CODES.MISSING_REQUIRED_FIELDS });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ error: ERROR_CODES.USER_NOT_FOUND });

        if (user.verificationCode !== code) {
            return res.status(400).json({ error: ERROR_CODES.INVALID_VERIFICATION_CODE });
        }

        if (!user.verificationExpires || new Date() > user.verificationExpires) {
            return res.status(400).json({ error: ERROR_CODES.INVALID_TOKEN });
        }

        if (!isComplexPassword(newPassword)) {
            return res.status(400).json({ error: ERROR_CODES.PASSWORD_INVALID });
        }

        // Check if the new password is the same as the old password
        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            return res.status(400).json({ error: ERROR_CODES.PASSWORD_SAME_AS_OLD });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                verificationCode: null,
                verificationExpires: null,
                failedLoginAttempts: 0,
                lockedUntil: null
            }
        });

        res.status(200).json({ message: 'Password reset successfully. You can now log in.' });
    } catch (error) {
        console.error("Reset PW error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

// ==========================================
// NAVER LOGIN ROUTES
// ==========================================

// Handle the redirect from Naver OAuth
router.get('/naver/callback', async (req, res) => {
    try {
        const { code, state, error, error_description } = req.query;

        if (error) {
            console.error("Naver OAuth error:", error, error_description);
            const redirectUrl = `capcurator://naver-login?error=${error_description || 'naver_oauth_error'}`;
            return res.send(`
                <!DOCTYPE html>
                <html><head><title>Naver Login Error</title></head>
                <body><script>window.location.href = "${redirectUrl}";</script></body></html>
            `);
        }

        if (!code) {
            return res.status(400).send("No code provided by Naver.");
        }

        const clientId = process.env.NAVER_CLIENT_ID;
        const clientSecret = process.env.NAVER_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            console.error("Missing Naver credentials in .env");
            return res.status(500).send("Server configuration error for Naver.");
        }

        // 1. Get Access Token
        const tokenResponse = await fetch(`https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${clientId}&client_secret=${clientSecret}&code=${code}&state=${state}`);
        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            console.error("Naver token error:", tokenData);
            return res.status(400).send("Failed to retrieve token from Naver.");
        }

        const accessToken = tokenData.access_token;

        // 2. Get User Profile
        const profileResponse = await fetch('https://openapi.naver.com/v1/nid/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const profileData = await profileResponse.json();

        if (profileData.resultcode !== '00') {
            console.error("Naver profile error:", profileData);
            return res.status(400).send("Failed to retrieve user profile from Naver.");
        }

        const { id, email, name, nickname, profile_image, gender, birthday, birthyear, age } = profileData.response;
        console.log("NAVER PROFILE DATA:", profileData.response);

        // Parse birthdate (e.g., birthday: "10-01", birthyear: "1990" -> 1990-10-01)
        const parsedAgeGroup = age ? age.split('-')[0] + 's' : undefined; // "20-29" -> "20s"
        const parsedGender = gender === 'M' ? 'MALE' : (gender === 'F' ? 'FEMALE' : undefined);

        // Check if user exists
        let user = await prisma.user.findFirst({
            where: {
                OR: [
                    { socialId: id },
                    { email: email }
                ]
            }
        });

        const isWeb = state && state.startsWith('web_');
        let webOrigin = 'https://www.beanmindcurator.com';
        if (isWeb) {
            try {
                const parts = state.split('_');
                if (parts.length >= 3) {
                    let b64 = parts[1];
                    while (b64.length % 4 !== 0) b64 += '=';
                    webOrigin = Buffer.from(b64, 'base64').toString('utf8');
                }
            } catch (e) {
                console.error("Failed to decode origin from state", e);
            }
        }

        if (user) {
            // User exists, log them in
            if (user.socialId && user.socialId !== id && user.loginType !== 'NAVER') {
                const redirectUrl = `capcurator://naver-login?error=email_in_use_by_${user.loginType.toLowerCase()}`;
                if (isWeb) {
                    return res.send(`
                        <!DOCTYPE html>
                        <html><head><title>Naver Login Error</title></head>
                        <body><script>window.location.href = "${webOrigin}/profile#naver_error=email_in_use_by_${user.loginType.toLowerCase()}";</script></body></html>
                    `);
                } else {
                    return res.send(`
                        <!DOCTYPE html>
                        <html><head><title>Naver Login Error</title></head>
                        <body><script>window.location.href = "${redirectUrl}";</script></body></html>
                    `);
                }
            }

            if (!user.socialId && user.email === email) {
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { socialId: id, loginType: 'NAVER', isEmailVerified: true }
                });
            }

            const jwtToken = jwt.sign(
                { id: user.id, email: user.email, role: user.role },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            logUserAccess(req as any, 'LOGIN', '/naver/callback', user.id, user.email);

            if (isWeb) {
                return res.send(`
                    <!DOCTYPE html>
                    <html><head><title>Naver Login Success</title></head>
                    <body><script>window.location.href = "${webOrigin}/profile#jwt_token=${jwtToken}";</script></body></html>
                `);
            } else {
                const redirectUrl = `capcurator://naver-login?token=${jwtToken}`;
                return res.send(`
                    <!DOCTYPE html>
                    <html><head><title>Naver Login Success</title></head>
                    <body><script>window.location.href = "${redirectUrl}";</script></body></html>
                `);
            }
        } else {
            // User does not exist, send info for registration
            const tempUser = {
                naverId: id,
                email: email || '',
                name: nickname || name || '',
                profileImageUrl: profile_image || '',
                gender: parsedGender,
                ageGroup: parsedAgeGroup
            };

            const userJsonString = JSON.stringify(tempUser);
            if (isWeb) {
                return res.send(`
                    <!DOCTYPE html>
                    <html><head><title>Naver Login Registration</title></head>
                    <body><script>window.location.href = "${webOrigin}/profile#naver_user=${encodeURIComponent(userJsonString)}";</script></body></html>
                `);
            } else {
                const redirectUrl = `capcurator://naver-login?user=${encodeURIComponent(userJsonString)}`;
                return res.send(`
                    <!DOCTYPE html>
                    <html><head><title>Naver Login Registration</title></head>
                    <body><script>window.location.href = "${redirectUrl}";</script></body></html>
                `);
            }
        }
    } catch (error) {
        console.error("Naver callback error:", error);
        return res.status(500).send("Internal Server Error during Naver Callback");
    }
});

// Naver Register
router.post('/naver/register', authLimiter, async (req, res) => {
    try {
        const { email, name, naverId, profileImageUrl, gender, ageGroup, role, favoriteCafe, countryCode, preferredLanguage } = req.body;

        if (!naverId || !role) {
            return res.status(400).json({ error: ERROR_CODES.MISSING_REQUIRED_FIELDS });
        }

        const welcomePolicy = getRegistrationWelcomePolicy();
        const user = await prisma.user.create({
            data: {
                email: email || `${naverId}@naver.user.local`,
                nickname: name || 'Naver User',
                loginType: 'NAVER',
                socialId: naverId,
                profileImageUrl: profileImageUrl,
                isEmailVerified: true,
                role: role === 'OWNER' ? 'OWNER' : 'USER',
                ageGroup,
                gender,
                favoriteCafe,
                countryCode: countryCode || 'KR',
                preferredLanguage: preferredLanguage || 'ko',
                aiPrescriptionLimit: welcomePolicy.welcomeFreePrescriptions,
                pointBalance: welcomePolicy.welcomeBeans
            }
        });

        const jwtToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        logUserAccess(req as any, 'LOGIN', '/naver/register', user.id, user.email);

        res.status(201).json({
            message: 'Naver register successful!',
            token: jwtToken,
            user: {
                id: user.id,
                email: user.email,
                nickname: user.nickname,
                role: user.role,
                profileImageUrl: user.profileImageUrl,
                ageGroup: user.ageGroup,
                gender: user.gender,
                favoriteCafe: user.favoriteCafe,
                preferredLanguage: user.preferredLanguage
            }
        });
    } catch (error) {
        console.error("Naver Auth Register error:", error);
        res.status(500).json({ error: ERROR_CODES.INTERNAL_SERVER_ERROR });
    }
});

export default router;
