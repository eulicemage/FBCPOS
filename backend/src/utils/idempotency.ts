import crypto from 'crypto';

/**
 * Generate a deterministic hash of payload to check idempotency.
 */
export function hashPayload(payload: any): string {
  const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return crypto.createHash('sha256').update(serialized).digest('hex');
}
