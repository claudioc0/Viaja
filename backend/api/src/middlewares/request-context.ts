import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { recordApiBreadcrumb } from '../config/sentry.js';

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incomingId = req.header('x-request-id')?.trim();
  const requestId = incomingId && incomingId.length <= 128 ? incomingId : crypto.randomUUID();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  const startedAt = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    recordApiBreadcrumb(
      `${req.method} ${req.path} -> ${res.statusCode}`,
      {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs,
      },
      res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warning' : 'info',
    );
  });

  next();
}
