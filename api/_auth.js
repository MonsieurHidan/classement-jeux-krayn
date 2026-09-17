import { Redis } from "@upstash/redis";
import crypto from "node:crypto";

const kv = Redis.fromEnv();

const MAX_ATTEMPTS = 8;
const WINDOW_SECONDS = 600;

function clientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  const first = Array.isArray(fwd) ? fwd[0] : fwd;
  return first?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
}

function safeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Retourne { ok, locked } — locked=true veut dire trop d'essais récents pour cette IP.
export async function checkPassword(req) {
  const ip = clientIp(req);
  const attemptsKey = `admin-attempts:${ip}`;
  const attempts = (await kv.get(attemptsKey)) || 0;

  if (attempts >= MAX_ATTEMPTS) {
    return { ok: false, locked: true };
  }

  const provided = String(req.headers["x-admin-password"] || "");
  const expected = String(process.env.ADMIN_PASSWORD || "");
  const valid = Boolean(expected) && safeEqual(provided, expected);

  if (!valid) {
    await kv.set(attemptsKey, attempts + 1, { ex: WINDOW_SECONDS });
    return { ok: false, locked: false };
  }

  await kv.del(attemptsKey);
  return { ok: true, locked: false };
}
