// src/client/utils/encryption.ts
import * as crypto from "crypto";
import { KeyPair, EncryptedData } from "../types";

/**
 * Menghasilkan pasangan kunci RSA untuk client
 */
export function generateKeyPair(): KeyPair {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

  return {
    publicKey,
    privateKey: crypto.createPrivateKey(privateKey),
  };
}

/**
 * Mengenkripsi pesan menggunakan AES-256-GCM
 */
export function encryptMessage(
  message: string,
  sharedSecret: Buffer
): EncryptedData {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", sharedSecret, iv);

  let encrypted = cipher.update(message, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag().toString("base64");

  return {
    encrypted,
    iv: iv.toString("base64"),
    authTag,
  };
}

/**
 * Mendekripsi pesan yang dienkripsi dengan AES-256-GCM
 */
export function decryptMessage(
  encryptedMsg: string,
  ivString: string,
  authTagString: string,
  sharedSecret: Buffer
): string {
  const iv = Buffer.from(ivString, "base64");
  const authTag = Buffer.from(authTagString, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", sharedSecret, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedMsg, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Mendekripsi kunci AES terenkripsi menggunakan kunci privat RSA
 */
export function decryptAESKey(
  encryptedKeyBase64: string,
  privateKey: crypto.KeyObject
): Buffer {
  const encryptedKey = Buffer.from(encryptedKeyBase64, "base64");
  return crypto.privateDecrypt(privateKey, encryptedKey);
}
