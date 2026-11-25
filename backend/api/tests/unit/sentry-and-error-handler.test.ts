import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../src/middlewares/error-handler.js';
import { requestContextMiddleware } from '../../src/middlewares/request-context.js';
import { AppError } from '../../src/utils/app-error.js';

describe('@viaja/api — Request Correlation & Error Telemetry Safety', () => {
  it('generates and propagates x-request-id header via requestContextMiddleware', () => {
    const headers: Record<string, string> = {};
    const req = {
      header: vi.fn().mockReturnValue(undefined),
      method: 'GET',
      path: '/api/trips',
    } as unknown as Request;

    const res = {
      statusCode: 200,
      setHeader: vi.fn((key: string, val: string) => {
        headers[key] = val;
      }),
      on: vi.fn(),
    } as unknown as Response;

    const next = vi.fn() as NextFunction;

    requestContextMiddleware(req, res, next);

    expect(req.requestId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(headers['x-request-id']).toBe(req.requestId);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('includes requestId and hides internal stack details on unexpected 500 errors', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const jsonSpy = vi.fn();
    const statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });

    const req = {
      requestId: 'req-correlation-123',
      method: 'POST',
      path: '/api/reservations',
    } as unknown as Request;

    const res = {
      status: statusSpy,
    } as unknown as Response;

    errorHandler(
      new Error('Connection pool exhausted with password=super_secret_db_pwd'),
      req,
      res,
      vi.fn(),
    );

    expect(statusSpy).toHaveBeenCalledWith(500);
    const body = jsonSpy.mock.calls[0]?.[0] as { error: Record<string, unknown> };
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(body.error.requestId).toBe('req-correlation-123');
    expect(JSON.stringify(body)).not.toContain('super_secret_db_pwd');

    consoleSpy.mockRestore();
  });

  it('preserves operational AppError status codes and attaches requestId', () => {
    const jsonSpy = vi.fn();
    const statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });

    const req = {
      requestId: 'req-conflict-409',
      method: 'POST',
      path: '/api/reservations',
    } as unknown as Request;

    const res = {
      status: statusSpy,
    } as unknown as Response;

    errorHandler(new AppError(409, 'SEAT_UNAVAILABLE', 'Poltrona já ocupada.'), req, res, vi.fn());

    expect(statusSpy).toHaveBeenCalledWith(409);
    expect(jsonSpy).toHaveBeenCalledWith({
      error: {
        code: 'SEAT_UNAVAILABLE',
        message: 'Poltrona já ocupada.',
        requestId: 'req-conflict-409',
      },
    });
  });
});
