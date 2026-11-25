const SENSITIVE_KEY_PATTERN =
  /^(password|passwordhash|currentpassword|newpassword|confirmpassword|token|accesstoken|refreshtoken|idtoken|authorization|auth|cookie|set-cookie|x-api-key|secret|jwt|cardnumber|cvv|cvc|securitycode|cpf|document|email|ip|ip_address)$/i;

const BEARER_PATTERN = /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;
const QUERY_SECRET_PATTERN =
  /([?&](?:token|access_token|refresh_token|password|secret|email)=)[^&#\s]*/gi;

export const REDACTED_VALUE = '[REDACTED]';

export function redactSensitiveText(input: string): string {
  return input
    .replace(BEARER_PATTERN, `Bearer ${REDACTED_VALUE}`)
    .replace(JWT_PATTERN, REDACTED_VALUE)
    .replace(QUERY_SECRET_PATTERN, `$1${REDACTED_VALUE}`);
}

export function sanitizeTelemetryData<T = unknown>(value: T, depth = 0): T {
  if (depth > 6 || value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return redactSensitiveText(value) as T;
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeTelemetryData(item, depth + 1)) as T;
  }

  const record = value as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};

  for (const [key, entryValue] of Object.entries(record)) {
    if (SENSITIVE_KEY_PATTERN.test(key.replace(/[-_\s]/g, ''))) {
      sanitized[key] = REDACTED_VALUE;
    } else if (/^(authorization|cookie|set-cookie|x-api-key)$/i.test(key)) {
      sanitized[key] = REDACTED_VALUE;
    } else {
      sanitized[key] = sanitizeTelemetryData(entryValue, depth + 1);
    }
  }

  return sanitized as T;
}

export interface SanitizableSentryEvent {
  user?: {
    id?: string | number | null;
    email?: string | null;
    username?: string | null;
    ip_address?: string | null;
    [key: string]: unknown;
  };
  request?: {
    url?: string;
    query_string?: unknown;
    headers?: Record<string, unknown>;
    cookies?: Record<string, unknown>;
    data?: unknown;
    [key: string]: unknown;
  };
  extra?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
  breadcrumbs?: Array<{
    message?: string;
    data?: Record<string, unknown>;
    [key: string]: unknown;
  }>;
}

/**
 * Strips passwords, tokens, authorization headers, cookies and unnecessary PII
 * (such as user email, username and IP address) before transmitting events to Sentry.
 */
export function sanitizeSentryEvent<T extends object>(event: T): T {
  const clone = { ...(event as SanitizableSentryEvent) };

  if (clone.user) {
    const safeUser: Record<string, unknown> = {};
    if (clone.user.id !== undefined && clone.user.id !== null) {
      safeUser.id = String(clone.user.id);
    }
    if (typeof clone.user.role === 'string') {
      safeUser.role = clone.user.role;
    }
    clone.user = safeUser;
  }

  if (clone.request) {
    const reqClone = { ...clone.request };
    if (typeof reqClone.url === 'string') {
      reqClone.url = redactSensitiveText(reqClone.url);
    }
    if (reqClone.query_string !== undefined) {
      reqClone.query_string = sanitizeTelemetryData(reqClone.query_string);
    }
    if (reqClone.headers) {
      reqClone.headers = sanitizeTelemetryData(reqClone.headers);
    }
    if (reqClone.cookies) {
      reqClone.cookies = { redacted: REDACTED_VALUE };
    }
    if (reqClone.data !== undefined) {
      if (typeof reqClone.data === 'string') {
        const rawData = reqClone.data;
        try {
          const parsed = JSON.parse(rawData) as unknown;
          reqClone.data = JSON.stringify(sanitizeTelemetryData(parsed));
        } catch {
          reqClone.data = redactSensitiveText(rawData);
        }
      } else {
        reqClone.data = sanitizeTelemetryData(reqClone.data);
      }
    }
    clone.request = reqClone;
  }

  if (clone.extra) {
    clone.extra = sanitizeTelemetryData(clone.extra);
  }

  if (clone.contexts) {
    clone.contexts = sanitizeTelemetryData(clone.contexts);
  }

  if (Array.isArray(clone.breadcrumbs)) {
    clone.breadcrumbs = clone.breadcrumbs.map((crumb) => ({
      ...crumb,
      ...(typeof crumb.message === 'string' ? { message: redactSensitiveText(crumb.message) } : {}),
      ...(crumb.data ? { data: sanitizeTelemetryData(crumb.data) } : {}),
    }));
  }

  return clone as unknown as T;
}
