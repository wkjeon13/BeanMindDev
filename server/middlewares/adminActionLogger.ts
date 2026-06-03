import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma.js';

export const logAdminAction = (
  actionType: 'VIEW' | 'UPDATE' | 'DELETE' | 'DOWNLOAD',
  targetType: string,
  detailsExtractor?: (req: any) => string
) => {
  return (req: any, res: Response, next: NextFunction) => {
    const admin = req.user;
    if (!admin) {
      return next();
    }

    res.on('finish', async () => {
      // 2xx 성공 시에만 로그 적재
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const ipAddress =
            (req.headers['x-forwarded-for'] as string) ||
            req.ip ||
            req.socket.remoteAddress ||
            'unknown';
          const details = detailsExtractor
            ? detailsExtractor(req)
            : `${actionType} on ${targetType}`;
          const targetId = req.params.id || req.body.id || req.query.id || null;

          await (prisma as any).adminActionLog.create({
            data: {
              adminId: admin.id,
              adminEmail: admin.email || 'unknown',
              adminRole: admin.role,
              actionType,
              targetType,
              targetId: targetId ? String(targetId) : null,
              details,
              ipAddress,
            },
          });
        } catch (err) {
          console.error('Error logging admin action to DB:', err);
        }
      }
    });

    next();
  };
};
