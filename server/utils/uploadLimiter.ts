import rateLimit from 'express-rate-limit';

// Global Upload Defense: 50 requests per 15 minutes per IP
export const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 upload requests per windowMs
    message: {
        errorCode: 'UPLOAD_RATE_LIMIT_EXCEEDED',
        error: '업로드 요청 횟수가 초과되었습니다. 잠시 후 다시 시도해주세요.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
