package com.beanmind.curator.common.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

@Slf4j
@Component
public class EncryptionUtil {

    private static String piiEncryptionKey;

    @Value("${pii.encryption-key:my-super-secret-key-that-is-32bit!}")
    public void setPiiEncryptionKey(String key) {
        piiEncryptionKey = key;
    }

    private static byte[] getSecretKeyBytes() {
        String key = piiEncryptionKey;
        if (key == null) {
            key = "my-super-secret-key-that-is-32bit!";
        }
        // Pad end with '0' to 32 bytes and slice
        StringBuilder sb = new StringBuilder(key);
        while (sb.length() < 32) {
            sb.append("0");
        }
        String slicedKey = sb.substring(0, 32);
        return slicedKey.getBytes(StandardCharsets.UTF_8);
    }

    public static String encryptPII(String text) {
        if (text == null) return "";
        try {
            byte[] iv = new byte[16];
            SecureRandom random = new SecureRandom();
            random.nextBytes(iv);
            IvParameterSpec ivSpec = new IvParameterSpec(iv);

            byte[] keyBytes = getSecretKeyBytes();
            SecretKeySpec keySpec = new SecretKeySpec(keyBytes, "AES");

            Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, ivSpec);

            byte[] encrypted = cipher.doFinal(text.getBytes(StandardCharsets.UTF_8));

            // Return hex representation iv:encrypted
            return bytesToHex(iv) + ":" + bytesToHex(encrypted);
        } catch (Exception e) {
            log.error("Failed to encrypt PII data", e);
            return text;
        }
    }

    public static String decryptPII(String text) {
        if (text == null || !text.contains(":")) {
            return text;
        }
        try {
            String[] parts = text.split(":");
            if (parts.length < 2) return text;

            byte[] iv = hexToBytes(parts[0]);
            byte[] encrypted = hexToBytes(parts[1]);

            IvParameterSpec ivSpec = new IvParameterSpec(iv);
            byte[] keyBytes = getSecretKeyBytes();
            SecretKeySpec keySpec = new SecretKeySpec(keyBytes, "AES");

            Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
            cipher.init(Cipher.DECRYPT_MODE, keySpec, ivSpec);

            byte[] decrypted = cipher.doFinal(encrypted);
            return new String(decrypted, StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error("Failed to decrypt PII data: {}", text, e);
            return "[ENCRYPTED_DATA_ERROR]";
        }
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    private static byte[] hexToBytes(String hexString) {
        int len = hexString.length();
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            data[i / 2] = (byte) ((Character.digit(hexString.charAt(i), 16) << 4)
                                 + Character.digit(hexString.charAt(i+1), 16));
        }
        return data;
    }
}
