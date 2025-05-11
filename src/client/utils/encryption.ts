import * as crypto from "crypto";
import * as fs from "fs";
import { KeyPair, EncryptedData } from "../types";

/**
 * Generates an RSA key pair for the client.
 * This key pair will be used for encrypting and decrypting data.
 */
export function generateKeyPair(): KeyPair {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048, // RSA key size (2048 bits)
    publicKeyEncoding: {
      type: "spki", // Format for public key
      format: "pem", // Encoding format for the public key
    },
    privateKeyEncoding: {
      type: "pkcs8", // Format for private key
      format: "pem", // Encoding format for the private key
    },
  });

  return {
    publicKey,
    privateKey: crypto.createPrivateKey(privateKey), // Create a private key object
  };
}

/**
 * Generates a Diffie-Hellman key pair for the client.
 * This key pair will be used for secure key exchange with the server.
 */
export function generateDHKeyPair() {
  const dh = crypto.createDiffieHellman(2048);
  const publicKey = dh.generateKeys("base64");
  return { dh, publicKey };
}

/**
 * Computes the shared secret using the client's private key and the server's public key.
 *
 * @param dh - The Diffie-Hellman object containing the client's private key.
 * @param serverPublicKey - The public key received from the server.
 * @returns The computed shared secret.
 */
export function computeSharedSecret(
  dh: crypto.DiffieHellman,
  serverPublicKey: string
) {
  return dh.computeSecret(serverPublicKey, "base64", "base64");
}

/**
 * Encrypts a message using AES-256-GCM.
 * This encryption method ensures confidentiality and integrity of the message.
 *
 * @param message - The message to be encrypted
 * @param sharedSecret - A shared secret key used for encryption
 * @returns An object containing the encrypted message, IV, and authentication tag
 */
export function encryptMessage(
  message: string,
  sharedSecret: Buffer
): EncryptedData {
  const iv = crypto.randomBytes(16); // Generate a random initialization vector (IV)
  const cipher = crypto.createCipheriv("aes-256-gcm", sharedSecret, iv); // Initialize AES cipher in GCM mode

  let encrypted = cipher.update(message, "utf8", "base64"); // Encrypt the message
  encrypted += cipher.final("base64"); // Finalize encryption
  const authTag = cipher.getAuthTag().toString("base64"); // Get authentication tag for integrity check

  return {
    encrypted, // Encrypted message
    iv: iv.toString("base64"), // IV in base64 format
    authTag, // Authentication tag in base64 format
  };
}

/**
 * Decrypts a message that was encrypted with AES-256-GCM.
 * Ensures that both confidentiality and integrity are verified.
 *
 * @param encryptedMsg - The encrypted message
 * @param ivString - The initialization vector used for encryption
 * @param authTagString - The authentication tag for integrity check
 * @param sharedSecret - The shared secret key used for decryption
 * @returns The decrypted message in plaintext
 */
export function decryptMessage(
  encryptedMsg: string,
  ivString: string,
  authTagString: string,
  sharedSecret: Buffer
): string {
  const iv = Buffer.from(ivString, "base64"); // Decode IV from base64
  const authTag = Buffer.from(authTagString, "base64"); // Decode auth tag from base64
  const decipher = crypto.createDecipheriv("aes-256-gcm", sharedSecret, iv); // Initialize AES decryption
  decipher.setAuthTag(authTag); // Set the authentication tag for integrity verification

  let decrypted = decipher.update(encryptedMsg, "base64", "utf8"); // Decrypt the message
  decrypted += decipher.final("utf8"); // Finalize decryption

  return decrypted; // Return the decrypted message
}

/**
 * Decrypts an AES key that was encrypted using an RSA private key.
 * This is used to securely share the AES key between parties.
 *
 * @param encryptedKeyBase64 - The encrypted AES key in base64 format
 * @param privateKey - The RSA private key used to decrypt the AES key
 * @returns The decrypted AES key as a Buffer
 */
export function decryptAESKey(
  encryptedKeyBase64: string,
  privateKey: crypto.KeyObject
): Buffer {
  const encryptedKey = Buffer.from(encryptedKeyBase64, "base64"); // Decode the encrypted AES key from base64
  return crypto.privateDecrypt(privateKey, encryptedKey); // Decrypt the AES key using the RSA private key
}

/**
 * Verifies the integrity of a public key using a digital certificate.
 *
 * @param publicKey - The public key to verify.
 * @param certificatePath - Path to the certificate file.
 * @returns True if the public key is valid, false otherwise.
 */
export function verifyPublicKey(
  publicKey: string,
  certificatePath: string
): boolean {
  const certificate = fs.readFileSync(certificatePath, "utf8");
  const isValid = crypto.verify(
    "sha256",
    Buffer.from(publicKey),
    {
      key: certificate,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    Buffer.from(publicKey)
  );
  return isValid;
}

/**
 * Securely erases a key from memory by overwriting its data.
 *
 * @param key - The key to be securely erased.
 */
export function secureEraseKey(key: Buffer) {
  key.fill(0); // Overwrite the buffer with zeros
}
