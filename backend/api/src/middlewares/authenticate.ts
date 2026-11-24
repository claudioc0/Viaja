import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@viaja/shared';
import { env } from '../config/env.js';
import { AppError } from '../utils/app-error.js';

export interface JwtAccessPayload {
  sub: string;
  email: string;
  role: UserRole;
  jti: string;
  type: 'access';
  exp?: number;
}

const revokedTokenExpirations = new Map<string, number>();

export function revokeTokenId(jti: string, expSeconds?: number): void {
  const expiresAtMs = expSeconds ? expSeconds * 1000 : Date.now() + 24 * 60 * 60 * 1000;
  revokedTokenExpirations.set(jti, expiresAtMs);

  // Prune expired entries opportunistically
  const now = Date.now();
  for (const [key, expiry] of revokedTokenExpirations.entries()) {
    if (expiry <= now) {
      revokedTokenExpirations.delete(key);
    }
  }
}

export function isTokenIdRevoked(jti: string): boolean {
  const expiry = revokedTokenExpirations.get(jti);
  if (!expiry) {
    return false;
  }
  if (expiry <= Date.now()) {
    revokedTokenExpirations.delete(jti);
    return false;
  }
  return true;
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new AppError(401, 'UNAUTHORIZED', 'Token de autenticação ausente ou malformado.'));
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    next(new AppError(401, 'UNAUTHORIZED', 'Token de autenticação vazio.'));
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtAccessPayload;
    if (decoded.type !== 'access' || !decoded.sub || !decoded.jti) {
      next(new AppError(401, 'INVALID_TOKEN', 'Tipo de token inválido para acesso à API.'));
      return;
    }

    if (isTokenIdRevoked(decoded.jti)) {
      next(new AppError(401, 'TOKEN_REVOKED', 'Esta sessão foi encerrada. Faça login novamente.'));
      return;
    }

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      tokenId: decoded.jti,
    };
    next();
  } catch {
    next(new AppError(401, 'INVALID_TOKEN', 'Token de acesso inválido ou expirado.'));
  }
}
