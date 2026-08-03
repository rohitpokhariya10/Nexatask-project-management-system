import { Types } from 'mongoose';

export function safeJsonTransform(_document: unknown, returned: unknown): Record<string, unknown> {
  const result = returned as Record<string, unknown>;
  const identifier = result._id;
  if (identifier instanceof Types.ObjectId) result.id = identifier.toHexString();
  else if (typeof identifier === 'string' || typeof identifier === 'number') {
    result.id = String(identifier);
  }
  delete result._id;
  delete result.__v;
  delete result.passwordHash;
  return result;
}
