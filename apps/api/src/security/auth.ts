import crypto from 'node:crypto';

type AuthPayload = {
  sub: string;
  exp: number;
};

const TOKEN_PREFIX = 'mms.';

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(payloadPart: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payloadPart).digest('base64url');
}

export function createAdminToken(secret: string, ttlHours: number): string {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload: AuthPayload = {
    sub: 'admin',
    exp: nowSeconds + Math.max(1, ttlHours) * 60 * 60,
  };

  const payloadPart = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(payloadPart, secret);
  return `${TOKEN_PREFIX}${payloadPart}.${signature}`;
}

export function verifyAdminToken(token: string, secret: string): AuthPayload | null {
  if (!token.startsWith(TOKEN_PREFIX)) {
    return null;
  }

  const raw = token.slice(TOKEN_PREFIX.length);
  const [payloadPart, signature] = raw.split('.');
  if (!payloadPart || !signature) {
    return null;
  }

  const expectedSignature = sign(payloadPart, secret);
  if (signature.length !== expectedSignature.length) {
    return null;
  }

  const isValidSignature = crypto.timingSafeEqual(
    Buffer.from(signature, 'utf8'),
    Buffer.from(expectedSignature, 'utf8'),
  );
  if (!isValidSignature) {
    return null;
  }

  let payload: AuthPayload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadPart)) as AuthPayload;
  } catch {
    return null;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp <= nowSeconds || payload.sub !== 'admin') {
    return null;
  }

  return payload;
}