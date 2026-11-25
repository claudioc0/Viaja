import * as Sentry from '@sentry/nextjs';
import { type PublicUserDto, sanitizeSentryEvent, sanitizeTelemetryData } from '@viaja/shared';

const WEB_SENTRY_DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || process.env.SENTRY_DSN?.trim() || '';

let webInitialized = false;

export function initWebSentry(): boolean {
  if (webInitialized || !WEB_SENTRY_DSN) {
    return webInitialized;
  }

  Sentry.init({
    dsn: WEB_SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    beforeSend(event) {
      return sanitizeSentryEvent(event);
    },
  });

  webInitialized = true;
  return true;
}

export function setWebMonitoringUser(user: Pick<PublicUserDto, 'id' | 'role'> | null): void {
  if (!WEB_SENTRY_DSN) {
    return;
  }
  initWebSentry();

  if (!user) {
    Sentry.setUser(null);
    return;
  }

  // Never attach email, full name or tokens to telemetry user scope
  Sentry.setUser({
    id: user.id,
    role: user.role,
  });
}

export function recordWebBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>,
  level: 'info' | 'warning' | 'error' = 'info',
): void {
  if (!WEB_SENTRY_DSN) {
    return;
  }
  initWebSentry();

  Sentry.addBreadcrumb({
    category,
    message,
    level,
    ...(data ? { data: sanitizeTelemetryData(data) } : {}),
  });
}

export function captureWebException(
  error: unknown,
  context?: Record<string, unknown>,
): string | undefined {
  if (!WEB_SENTRY_DSN) {
    return undefined;
  }
  initWebSentry();

  return Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(sanitizeTelemetryData(context));
    }
    return Sentry.captureException(error);
  });
}
