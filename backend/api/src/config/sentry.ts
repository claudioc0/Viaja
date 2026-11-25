import * as Sentry from '@sentry/node';
import { sanitizeSentryEvent, sanitizeTelemetryData } from '@viaja/shared';
import type { Request } from 'express';
import { env } from './env.js';

let initialized = false;

export function initBackendSentry(): boolean {
  if (initialized || !env.SENTRY_DSN.trim()) {
    return initialized;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN.trim(),
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.2 : 1.0,
    beforeSend(event) {
      return sanitizeSentryEvent(event);
    },
  });

  initialized = true;
  return true;
}

export function isBackendSentryEnabled(): boolean {
  return initialized;
}

export function recordApiBreadcrumb(
  message: string,
  data: Record<string, unknown>,
  level: 'info' | 'warning' | 'error' = 'info',
): void {
  if (!initialized) {
    return;
  }

  Sentry.addBreadcrumb({
    category: 'http.server',
    message,
    level,
    data: sanitizeTelemetryData(data),
  });
}

export function captureApiException(
  err: unknown,
  req?: Request,
  extraContext?: Record<string, unknown>,
): string | undefined {
  if (!initialized) {
    return undefined;
  }

  return Sentry.withScope((scope) => {
    if (req) {
      scope.setTag('http.method', req.method);
      scope.setTag('http.route', req.route?.path ? `${req.baseUrl}${req.route.path}` : req.path);
      if (req.requestId) {
        scope.setTag('request_id', req.requestId);
      }

      if (req.user) {
        scope.setUser({
          id: req.user.id,
          role: req.user.role,
        });
      }

      scope.setContext(
        'request_diagnostics',
        sanitizeTelemetryData({
          requestId: req.requestId,
          method: req.method,
          path: req.path,
          query: req.query,
        }),
      );
    }

    if (extraContext) {
      scope.setExtras(sanitizeTelemetryData(extraContext));
    }

    return Sentry.captureException(err);
  });
}

export async function flushBackendSentry(timeoutMs = 2000): Promise<void> {
  if (!initialized) {
    return;
  }

  await Sentry.flush(timeoutMs);
}
