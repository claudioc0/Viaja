import crypto from 'node:crypto';
import type { Prisma, User } from '@prisma/client';
import type { PublicUserDto } from '@viaja/shared';

export function decimalToNumber(value: Prisma.Decimal | number | string): number {
  return Number(Number(value).toFixed(2));
}

export function serializeUser(user: User): PublicUserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function generateReservationCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(6);
  let suffix = '';
  for (const byte of bytes) {
    suffix += alphabet[byte % alphabet.length];
  }
  return `VJ-${suffix}`;
}

export function generateTransactionReference(method: 'PIX' | 'CREDIT_CARD'): string {
  const prefix = method === 'PIX' ? 'PIX' : 'CRD';
  const randomHex = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `SIM-${prefix}-${Date.now()}-${randomHex}`;
}
