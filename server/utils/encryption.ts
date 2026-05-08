import crypto from 'crypto';

// The secret key should be exactly 32 bytes (256 bits) for aes-256-cbc.
// In production, this MUST come from an environment variable (e.g. process.env.PII_ENCRYPTION_KEY).
// For development, we use a fallback robust key.
const ENCRYPTION_KEY = process.env.PII_ENCRYPTION_KEY || 'my-super-secret-key-that-is-32bit!';

// Initialization Vector length for aes-256-cbc is 16 bytes
const IV_LENGTH = 16;

export function encryptPII(text: string): string {
    if (text == null) return '';
    if (typeof text !== 'string') text = String(text);
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);

    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    // Return iv and encrypted data concatenated as a string for easy storage
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decryptPII(text: string): string {
    if (!text || !text.includes(':')) return text;

    try {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift()!, 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');

        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);

        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return decrypted.toString();
    } catch (error) {
        console.error("Failed to decrypt PII data:", error);
        return "[ENCRYPTED_DATA_ERROR]";
    }
}
