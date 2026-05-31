// All hashing uses the browser's built-in WebCrypto (no extra dependencies).
//
// Security model (no backend / Cloud Functions):
//  - The workspace document ID is derived from the shared passphrase via a slow
//    PBKDF2. Because Firestore rules forbid listing the workspaces collection,
//    the only way to name a workspace doc is to know its passphrase. So "can you
//    address this doc" == "do you know the passphrase".
//  - Per-account PINs are PBKDF2-hashed with a random per-account salt. They are
//    a soft lock to pick who you are; both paired devices can read each other's
//    hashes, which matches the household model (Jan & Aki trust each other).

const enc = new TextEncoder();

// Fixed, app-specific salt for deriving the workspace ID. It must be constant
// (the ID has to be reproducible from the passphrase alone), so the brute-force
// resistance comes from the high iteration count, not salt secrecy.
const WORKSPACE_ID_SALT = enc.encode('clerune-budget::workspace-id::v1');
const WORKSPACE_ID_ITERATIONS = 150_000;
const PIN_ITERATIONS = 100_000;

async function pbkdf2Bits(
  password: string,
  salt: Uint8Array,
  iterations: number,
  byteLength: number,
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    byteLength * 8,
  );
  return new Uint8Array(bits);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** Deterministically derive the Firestore workspace doc ID from the passphrase. */
export async function deriveWorkspaceId(passphrase: string): Promise<string> {
  const normalized = passphrase.trim().normalize('NFKC');
  const bits = await pbkdf2Bits(normalized, WORKSPACE_ID_SALT, WORKSPACE_ID_ITERATIONS, 16);
  return `ws_${toHex(bits)}`;
}

/** Hash a secret (PIN) with a fresh random salt. Returns hex strings to store. */
export async function hashSecret(secret: string): Promise<{ hash: string; salt: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await pbkdf2Bits(secret, salt, PIN_ITERATIONS, 32);
  return { hash: toHex(bits), salt: toHex(salt) };
}

/** Verify a secret against a stored hash + salt, in constant time. */
export async function verifySecret(secret: string, hashHex: string, saltHex: string): Promise<boolean> {
  const bits = await pbkdf2Bits(secret, fromHex(saltHex), PIN_ITERATIONS, 32);
  const candidate = toHex(bits);
  if (candidate.length !== hashHex.length) return false;
  let diff = 0;
  for (let i = 0; i < candidate.length; i++) {
    diff |= candidate.charCodeAt(i) ^ hashHex.charCodeAt(i);
  }
  return diff === 0;
}
