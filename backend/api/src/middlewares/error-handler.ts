import { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { captureApiException } from '../config/sentry.js';
import { AppError } from '../utils/app-error.js';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      captureApiException(err, req, { errorCode: err.code, statusCode: err.statusCode });
    }
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
        ...(req.requestId ? { requestId: req.requestId } : {}),
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dados de entrada inválidos.',
        details: err.flatten(),
        ...(req.requestId ? { requestId: req.requestId } : {}),
      },
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        error: {
          code: 'RESOURCE_CONFLICT',
          message: 'Conflito de unicidade detectado para o recurso solicitado.',
          details: err.meta,
          ...(req.requestId ? { requestId: req.requestId } : {}),
        },
      });
      return;
    }

    if (err.code === 'P2003') {
      res.status(409).json({
        error: {
          code: 'FOREIGN_KEY_CONSTRAINT',
          message: 'Operação bloqueada por vínculo com outros registros do sistema.',
          ...(req.requestId ? { requestId: req.requestId } : {}),
        },
      });
      return;
    }

    if (err.code === 'P2025') {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Registro solicitado não encontrado.',
          ...(req.requestId ? { requestId: req.requestId } : {}),
        },
      });
      return;
    }
  }

  captureApiException(err, req, { statusCode: 500 });
  console.error('Unhandled API error:', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    error: err instanceof Error ? err.message : 'Unknown error',
  });

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocorreu um erro interno inesperado no servidor.',
      ...(req.requestId ? { requestId: req.requestId } : {}),
    },
  });
}
