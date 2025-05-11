import * as crypto from "crypto";
import * as fs from "fs";

/**
 * Generates a Diffie-Hellman key pair for the server.
 * This key pair will be used for secure key exchange with the client.
 */
export function generateDHKeyPair() {
  const dh = crypto.createDiffieHellman(2048);
  const publicKey = dh.generateKeys("base64");
  return { dh, publicKey };
}

/**
 * Computes the shared secret using the server's private key and the client's public key.
 *
 * @param dh - The Diffie-Hellman object containing the server's private key.
 * @param clientPublicKey - The public key received from the client.
 * @returns The computed shared secret.
 */
export function computeSharedSecret(
  dh: crypto.DiffieHellman,
  clientPublicKey: string
) {
  return dh.computeSecret(clientPublicKey, "base64", "base64");
}

/**
 * Encrypts a message using AES-256-GCM with a shared secret.
 * AES-256-GCM provides both encryption and integrity verification (auth tag).
 *
 * @param message - The message to be encrypted
 * @param sharedSecret - The shared secret key used for encryption
 * @returns An object containing the encrypted message, IV (Initialization Vector), and authentication tag
 */
export function encryptAES(message: string, sharedSecret: Buffer) {
  const iv = crypto.randomBytes(16); // Generate a random 16-byte initialization vector (IV)
  const cipher = crypto.createCipheriv("aes-256-gcm", sharedSecret, iv); // Create an AES cipher in GCM mode
  let encrypted = cipher.update(message, "utf8", "base64"); // Encrypt the message
  encrypted += cipher.final("base64"); // Finalize encryption
  const authTag = cipher.getAuthTag().toString("base64"); // Get the authentication tag for integrity verification

  return { encrypted, iv: iv.toString("base64"), authTag }; // Return the encrypted message, IV, and auth tag
}

/**
 * Decrypts an AES-256-GCM encrypted message.
 * Verifies both the integrity of the message and decrypts it.
 *
 * @param encryptedMsg - The encrypted message in base64 format
 * @param iv - The initialization vector (IV) used for encryption, in base64 format
 * @param authTag - The authentication tag used for integrity verification, in base64 format
 * @param sharedSecret - The shared secret key used for decryption
 * @returns The decrypted message in plaintext
 */
export function decryptAES(
  encryptedMsg: string,
  iv: string,
  authTag: string,
  sharedSecret: Buffer
): string {
  // Create the decipher object with AES-256-GCM mode and the provided shared secret and IV
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    sharedSecret,
    Buffer.from(iv, "base64") // Convert IV from base64 to buffer
  );
  decipher.setAuthTag(Buffer.from(authTag, "base64")); // Set the authentication tag for integrity check
  let decrypted = decipher.update(encryptedMsg, "base64", "utf8"); // Decrypt the encrypted message
  decrypted += decipher.final("utf8"); // Finalize decryption
  return decrypted; // Return the decrypted message
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
