import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { env } from '../../src/config/env.js';
import {
  authenticate,
  isTokenIdRevoked,
  revokeTokenId,
} from '../../src/middlewares/authenticate.js';
import { authorize } from '../../src/middlewares/authorize.js';
import { AppError } from '../../src/utils/app-error.js';
import {
  decimalToNumber,
  generateReservationCode,
  generateTransactionReference,
  serializeUser,
} from '../../src/utils/serializers.js';

describe('Backend Unit Tests — Auth, Pricing, Serialization & Access Rules', () => {
  it('hashes passwords securely and never exposes passwordHash in serializeUser', async () => {
    const hash = await bcrypt.hash('ViajaSecret@2026', 10);
    expect(hash).not.toBe('ViajaSecret@2026');
    expect(await bcrypt.compare('ViajaSecret@2026', hash)).toBe(true);

    const serialized = serializeUser({
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Teste Passageiro',
      email: 'teste@viaja.app',
      passwordHash: hash,
      role: 'PASSENGER',
      createdAt: new Date('2026-11-24T12:00:00.000Z'),
      updatedAt: new Date('2026-11-24T12:00:00.000Z'),
    });

    expect(serialized).not.toHaveProperty('passwordHash');
    expect(serialized.role).toBe('PASSENGER');
  });

  it('validates JWT access tokens and blocks revoked session tokens on authenticate middleware', () => {
    const jti = 'unit-test-jti-001';
    const token = jwt.sign(
      {
        sub: '550e8400-e29b-41d4-a716-446655440099',
        email: 'user@viaja.app',
        role: 'PASSENGER',
        jti,
        type: 'access',
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' },
    );

    const req = {
      headers: { authorization: `Bearer ${token}` },
    } as unknown as Request;

    const nextAllowed = vi.fn() as unknown as NextFunction;
    authenticate(req, {} as Response, nextAllowed);

    expect(nextAllowed).toHaveBeenCalledWith();
    expect(req.user?.id).toBe('550e8400-e29b-41d4-a716-446655440099');

    // Revoke token and verify rejection
    revokeTokenId(jti);
    expect(isTokenIdRevoked(jti)).toBe(true);

    const nextBlocked = vi.fn() as unknown as NextFunction;
    authenticate(req, {} as Response, nextBlocked);
    const passedError = (nextBlocked as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(passedError).toBeInstanceOf(AppError);
    expect((passedError as AppError).statusCode).toBe(401);
  });

  it('enforces ADMIN role in authorize middleware', () => {
    const guard = authorize('ADMIN');

    const passengerReq = {
      user: { id: '1', email: 'p@viaja.app', role: 'PASSENGER', tokenId: 't1' },
    } as unknown as Request;
    const nextForbidden = vi.fn();
    guard(passengerReq, {} as Response, nextForbidden as unknown as NextFunction);

    expect(nextForbidden.mock.calls[0]?.[0]).toBeInstanceOf(AppError);
    expect((nextForbidden.mock.calls[0]?.[0] as AppError).statusCode).toBe(403);

    const adminReq = {
      user: { id: '2', email: 'a@viaja.app', role: 'ADMIN', tokenId: 't2' },
    } as unknown as Request;
    const nextOk = vi.fn();
    guard(adminReq, {} as Response, nextOk as unknown as NextFunction);
    expect(nextOk).toHaveBeenCalledWith();
  });

  it('computes monetary decimals accurately without floating point drift and generates unique codes', () => {
    const unitPrice = decimalToNumber('119.90');
    const seatCount = 3;
    const total = Number((unitPrice * seatCount).toFixed(2));

    expect(unitPrice).toBe(119.9);
    expect(total).toBe(359.7);

    const codeA = generateReservationCode();
    const codeB = generateReservationCode();
    expect(codeA).toMatch(/^VJ-[A-Z2-9]{6}$/);
    expect(codeA).not.toBe(codeB);

    const pixRef = generateTransactionReference('PIX');
    expect(pixRef.startsWith('SIM-PIX-')).toBe(true);
  });
});
