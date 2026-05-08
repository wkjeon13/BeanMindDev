import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import { encryptPII } from '../utils/encryption.js';
import { sendVerificationEmail } from '../utils/mailer';
import rateLimit from 'express-rate-limit';
import { ERROR_CODES } from '../utils/errorCodes.js';

const router = express.Router();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { error: ERROR_CODES.TOO_MANY_REQUESTS }
});

import prisma from '../utils/prisma.js';
const JWT_SECRET = process.env.JWT_SECRET as string;

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
                    verificationExpires: expires
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
            const ticket = await googleClient.verifyIdToken({
                idToken: token,
                audience: process.env.GOOGLE_CLIENT_ID,
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
                preferredLanguage: preferredLanguage || 'ko'
            }
        });

        const jwtToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

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

export default router;
