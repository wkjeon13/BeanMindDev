import { Request } from 'express';
import prisma from './prisma.js';

export function logUserAccess(req: Request, actionType: string, pagePath: string, userId?: string, email?: string) {
    const userAgentStr = req.headers['user-agent'] || '';
    const ip = req.ip || req.headers['x-forwarded-for']?.toString() || '';
    
    // User-Agent 분석을 통해 단순 OS 추출
    let deviceOS = 'Unknown';
    if (/android/i.test(userAgentStr)) deviceOS = 'Android';
    else if (/iphone|ipad|ipod/i.test(userAgentStr)) deviceOS = 'iOS';
    else if (/windows/i.test(userAgentStr)) deviceOS = 'Windows';
    else if (/macintosh|mac os x/i.test(userAgentStr)) deviceOS = 'macOS';
    else if (/linux/i.test(userAgentStr)) deviceOS = 'Linux';

    // 메인 로직에 지연을 주지 않도록 Promise 대기 없이 비동기 처리 (Fire-and-Forget)
    prisma.userAccessLog.create({
        data: {
            userId: userId || null,
            email: email || null,
            ipAddress: ip,
            userAgent: userAgentStr,
            deviceOS,
            pagePath,
            actionType
        }
    }).catch(err => {
        console.error("Failed to write access log to database:", err);
    });
}
