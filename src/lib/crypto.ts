// AES-GCM encryption with PBKDF2 key derivation from password
const SENSITIVE_KEYS = ["task-areas", "investment-areas", "stock-portfolio", "alpha-vantage-key", "salary-data"];

let cryptoKey: CryptoKey | null = null;
let appPassword: string | null = null;
const cache = new Map<string, string>();

export function getAppPassword(): string | null {
  return appPassword;
}

function hexToBytes(hex: string): Uint8Array {
  return new Uint8Array(hex.match(/.{2}/g)!.map(h => parseInt(h, 16)));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoded = new TextEncoder().encode(password);
  const rawKey = new Uint8Array(encoded).buffer;
  const keyMaterial = await crypto.subtle.importKey(
    "raw", rawKey, "PBKDF2", false, ["deriveKey"]
  );
  const saltBuf = new Uint8Array(salt).buffer;
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: new Uint8Array(saltBuf), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encrypt(data: string): Promise<string> {
  if (!cryptoKey) throw new Error("Not initialized");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv }, cryptoKey, new TextEncoder().encode(data)
  );
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return bytesToHex(combined);
}

async function decrypt(hexData: string): Promise<string> {
  if (!cryptoKey) throw new Error("Not initialized");
  const bytes = hexToBytes(hexData);
  const iv = bytes.slice(0, 12);
  const ciphertext = bytes.slice(12);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, ciphertext);
  return new TextDecoder().decode(plaintext);
}

export async function initSecurity(password: string): Promise<boolean> {
  // Get or create salt
  let saltHex = localStorage.getItem("crypto-salt");
  let salt: Uint8Array;
  if (!saltHex) {
    salt = crypto.getRandomValues(new Uint8Array(16));
    localStorage.setItem("crypto-salt", bytesToHex(salt));
  } else {
    salt = hexToBytes(saltHex);
  }

  cryptoKey = await deriveKey(password, salt);

  // Check if verifier exists
  const verifier = localStorage.getItem("crypto-verifier");
  if (verifier) {
    try {
      const result = await decrypt(verifier);
      if (result !== "CAVECREATE_VALID") {
        cryptoKey = null;
        return false;
      }
    } catch {
      cryptoKey = null;
      return false;
    }
  } else {
    // First time: encrypt verifier and migrate existing data
    const encVerifier = await encrypt("CAVECREATE_VALID");
    localStorage.setItem("crypto-verifier", encVerifier);
    await migrateToEncrypted();
  }

  // Preload all encrypted data into cache
  for (const key of SENSITIVE_KEYS) {
    const encData = localStorage.getItem(`enc-${key}`);
    if (encData) {
      try {
        cache.set(key, await decrypt(encData));
      } catch {}
    }
  }

  appPassword = password;
  return true;
}

async function migrateToEncrypted() {
  for (const key of SENSITIVE_KEYS) {
    const plain = localStorage.getItem(key);
    if (plain) {
      const encrypted = await encrypt(plain);
      localStorage.setItem(`enc-${key}`, encrypted);
      localStorage.removeItem(key);
      cache.set(key, plain);
    }
  }
}

/** Sync read from decrypted cache */
export function secureGet(key: string): string | null {
  return cache.get(key) ?? null;
}

/** Async write: updates cache immediately, encrypts in background */
export function secureSet(key: string, value: string): void {
  cache.set(key, value);
  if (SENSITIVE_KEYS.includes(key)) {
    encrypt(value).then(enc => localStorage.setItem(`enc-${key}`, enc)).catch(() => {});
  } else {
    localStorage.setItem(key, value);
  }
}

export function isUnlocked(): boolean {
  return cryptoKey !== null;
}

export function lockApp(): void {
  cryptoKey = null;
  cache.clear();
}
