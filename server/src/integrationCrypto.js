import crypto from "node:crypto";

const ALGO = "aes-256-gcm";

function integrationKey() {
  const raw =
    String(process.env.INTEGRATION_ENCRYPTION_KEY || "").trim() ||
    String(process.env.JWT_SECRET || "dev-only-ALTERE-JWT_SECRET-em-producao");
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptSecret(plain) {
  const text = String(plain ?? "");
  if (!text) return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, integrationKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptSecret(payload) {
  const text = String(payload ?? "").trim();
  if (!text) return "";
  const [ivB64, tagB64, dataB64] = text.split(".");
  if (!ivB64 || !tagB64 || !dataB64) return "";
  try {
    const iv = Buffer.from(ivB64, "base64url");
    const tag = Buffer.from(tagB64, "base64url");
    const data = Buffer.from(dataB64, "base64url");
    const decipher = crypto.createDecipheriv(ALGO, integrationKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}
