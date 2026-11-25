import type { ApiErrorEnvelope, AuthResponseDto } from '@viaja/shared';
import { recordMobileBreadcrumb, recordMobileError } from './monitoring';
import { secureSessionStorage } from './secure-session';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:3333/api';

export class ApiClientError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

let onUnauthorizedCallback: (() => void) | null = null;

export function registerUnauthorizedHandler(handler: () => void): void {
  onUnauthorizedCallback = handler;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  authenticated?: boolean;
  retryOnUnauthorized?: boolean;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${API_BASE_URL}${normalizedPath}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

async function tryRefreshSession(): Promise<string | null> {
  const current = await secureSessionStorage.loadSession();
  if (!current?.tokens.refreshToken) {
    return null;
  }

  try {
    const response = await fetch(buildUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: current.tokens.refreshToken }),
    });

    if (!response.ok) {
      await secureSessionStorage.clearSession();
      onUnauthorizedCallback?.();
      return null;
    }

    const refreshed = (await response.json()) as AuthResponseDto;
    await secureSessionStorage.saveSession(refreshed);
    return refreshed.tokens.accessToken;
  } catch {
    return null;
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, authenticated = true, retryOnUnauthorized = true } = options;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (authenticated) {
    const stored = await secureSessionStorage.loadSession();
    if (stored?.tokens.accessToken) {
      headers.Authorization = `Bearer ${stored.tokens.accessToken}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (networkErr) {
    const clientErr = new ApiClientError(
      0,
      'NETWORK_ERROR',
      'Não foi possível conectar ao servidor VIAJA. Verifique sua conexão de rede.',
    );
    recordMobileError(networkErr instanceof Error ? networkErr : clientErr, {
      layer: 'mobileApiRequest',
      method,
      path,
      query,
      errorCode: 'NETWORK_ERROR',
    });
    throw clientErr;
  }

  if (response.status === 401 && authenticated && retryOnUnauthorized) {
    const newAccessToken = await tryRefreshSession();
    if (newAccessToken) {
      return apiRequest<T>(path, { ...options, retryOnUnauthorized: false });
    }
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    const envelope = payload as ApiErrorEnvelope | null;
    const apiError = new ApiClientError(
      response.status,
      envelope?.error?.code ?? 'API_ERROR',
      envelope?.error?.message ?? 'Ocorreu um erro ao processar sua solicitação.',
      envelope?.error?.details,
    );

    if (response.status >= 500) {
      recordMobileError(apiError, {
        layer: 'mobileApiRequest',
        method,
        path,
        statusCode: response.status,
        errorCode: apiError.code,
        requestId: response.headers.get('x-request-id') ?? undefined,
      });
    } else {
      recordMobileBreadcrumb(
        'http.client',
        `${method} ${path} -> ${response.status} (${apiError.code})`,
        { method, path, statusCode: response.status, errorCode: apiError.code },
        'warning',
      );
    }

    throw apiError;
  }

  return payload as T;
}
