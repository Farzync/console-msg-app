import * as crypto from "crypto";

export function encryptAES(message: string, sharedSecret: Buffer) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", sharedSecret, iv);
  let encrypted = cipher.update(message, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag().toString("base64");

  return { encrypted, iv: iv.toString("base64"), authTag };
}

export function decryptAES(
  encryptedMsg: string,
  iv: string,
  authTag: string,
  sharedSecret: Buffer
): string {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    sharedSecret,
    Buffer.from(iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(authTag, "base64"));
  let decrypted = decipher.update(encryptedMsg, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
