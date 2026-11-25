import { describe, expect, it } from 'vitest';
import {
  REDACTED_VALUE,
  redactSensitiveText,
  sanitizeSentryEvent,
  sanitizeTelemetryData,
} from '../index.js';

describe('@viaja/shared — Telemetry & Sentry PII Sanitization', () => {
  it('redacts passwords, tokens, authorization headers and card secrets recursively', () => {
    const raw = {
      tripId: 'trip-123',
      seatIds: ['s1', 's2'],
      password: 'PlainPassword@123',
      accessToken: 'secret-access-token',
      refreshToken: 'secret-refresh-token',
      nested: {
        Authorization:
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature123456',
        cardNumber: '4111222233334444',
        cvv: '999',
        email: 'passageiro@viaja.app',
        safeDiagnosticStatus: 500,
      },
    };

    const sanitized = sanitizeTelemetryData(raw);

    expect(sanitized.tripId).toBe('trip-123');
    expect(sanitized.seatIds).toEqual(['s1', 's2']);
    expect(sanitized.password).toBe(REDACTED_VALUE);
    expect(sanitized.accessToken).toBe(REDACTED_VALUE);
    expect(sanitized.refreshToken).toBe(REDACTED_VALUE);
    expect(sanitized.nested.Authorization).toBe(REDACTED_VALUE);
    expect(sanitized.nested.cardNumber).toBe(REDACTED_VALUE);
    expect(sanitized.nested.cvv).toBe(REDACTED_VALUE);
    expect(sanitized.nested.email).toBe(REDACTED_VALUE);
    expect(sanitized.nested.safeDiagnosticStatus).toBe(500);
  });

  it('scrubs inline JWTs, Bearer tokens and secret query strings in free-form strings', () => {
    const sampleJwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEiLCJyb2xlIjoiQURNSU4ifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const message = `Failed request with Bearer ${sampleJwt} to https://api.viaja.app/callback?token=abc123&tripId=99`;

    const scrubbed = redactSensitiveText(message);

    expect(scrubbed).not.toContain(sampleJwt);
    expect(scrubbed).not.toContain('abc123');
    expect(scrubbed).toContain('tripId=99');
    expect(scrubbed).toContain(`Bearer ${REDACTED_VALUE}`);
  });

  it('sanitizes Sentry events keeping user id/role while removing email, IP, cookies and body secrets', () => {
    const event = sanitizeSentryEvent({
      user: {
        id: 'usr-999',
        role: 'PASSENGER',
        email: 'cliente@viaja.app',
        username: 'Cliente Teste',
        ip_address: '200.100.50.25',
      },
      request: {
        url: 'https://api.viaja.app/api/auth/login?token=my-secret',
        headers: {
          authorization: 'Bearer secret-token',
          'user-agent': 'ViajaMobile/0.1.0',
          cookie: 'refresh=xyz',
        },
        cookies: {
          session: 'cookie-secret',
        },
        data: JSON.stringify({
          email: 'cliente@viaja.app',
          password: 'SuperSecretPassword!',
          method: 'PIX',
        }),
      },
      breadcrumbs: [
        {
          message: 'Auth header Bearer my-jwt-token',
          data: { refreshToken: 'rt-123', endpoint: '/api/reservations' },
        },
      ],
    });

    expect(event.user).toEqual({ id: 'usr-999', role: 'PASSENGER' });
    expect(event.request?.url).toBe(`https://api.viaja.app/api/auth/login?token=${REDACTED_VALUE}`);
    expect(event.request?.headers).toEqual({
      authorization: REDACTED_VALUE,
      'user-agent': 'ViajaMobile/0.1.0',
      cookie: REDACTED_VALUE,
    });
    expect(event.request?.cookies).toEqual({ redacted: REDACTED_VALUE });
    expect(JSON.parse(event.request?.data as string)).toEqual({
      email: REDACTED_VALUE,
      password: REDACTED_VALUE,
      method: 'PIX',
    });
    expect(event.breadcrumbs?.[0]?.message).toBe(`Auth header Bearer ${REDACTED_VALUE}`);
    expect(event.breadcrumbs?.[0]?.data).toEqual({
      refreshToken: REDACTED_VALUE,
      endpoint: '/api/reservations',
    });
  });
});
