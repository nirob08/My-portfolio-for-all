import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

export const ADMIN_COOKIE_NAME = 'portfolio-admin-session';
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function signature(timestamp: string) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('ADMIN_SESSION_SECRET must be set to a random value of at least 32 characters.');
  }

  return createHmac('sha256', secret).update(timestamp).digest('hex');
}

export function createAdminSessionToken() {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  return `${timestamp}.${signature(timestamp)}`;
}

export function hasValidAdminSession(request: NextRequest) {
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return false;

  const [timestamp, suppliedSignature] = token.split('.');
  if (!timestamp || !suppliedSignature || !/^\d+$/.test(timestamp)) return false;

  const issuedAt = Number(timestamp);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(issuedAt) || issuedAt > now + 60 || now - issuedAt > SESSION_TTL_SECONDS) {
    return false;
  }

  const expected = signature(timestamp);
  const suppliedBuffer = Buffer.from(suppliedSignature, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');

  return suppliedBuffer.length === expectedBuffer.length && timingSafeEqual(suppliedBuffer, expectedBuffer);
}
