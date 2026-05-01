/**
 * Compute a SHA-256 hex digest of the raw bytes of a File.
 * Uses the Web Crypto API (crypto.subtle.digest) — available in all modern browsers.
 */
export async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
