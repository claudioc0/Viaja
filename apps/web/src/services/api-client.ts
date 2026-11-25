import type { ApiErrorEnvelope, AuthResponseDto } from '@viaja/shared';
import { captureWebException, recordWebBreadcrumb } from '../lib/monitoring';
import { webAuthStorage } from './auth-storage';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:3333/api';

export class WebApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'WebApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

let unauthorizedListener: (() => void) | null = null;

export function setWebUnauthorizedListener(listener: () => void): void {
  unauthorizedListener = listener;
}

interface WebRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  authenticated?: boolean;
  retryOnUnauthorized?: boolean;
}

function buildApiUrl(path: string, query?: WebRequestOptions['query']): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${API_BASE_URL}${normalized}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function attemptTokenRefresh(): Promise<string | null> {
  const current = webAuthStorage.load();
  if (!current?.tokens.refreshToken) {
    return null;
  }

  try {
    const res = await fetch(buildApiUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: current.tokens.refreshToken }),
    });

    if (!res.ok) {
      webAuthStorage.clear();
      unauthorizedListener?.();
      return null;
    }

    const refreshed = (await res.json()) as AuthResponseDto;
    webAuthStorage.save(refreshed);
    return refreshed.tokens.accessToken;
  } catch {
    return null;
  }
}

export async function webApiRequest<T>(path: string, options: WebRequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, authenticated = true, retryOnUnauthorized = true } = options;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (authenticated) {
    const session = webAuthStorage.load();
    if (session?.tokens.accessToken) {
      headers.Authorization = `Bearer ${session.tokens.accessToken}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(buildApiUrl(path, query), {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (networkErr) {
    const wrapped = new WebApiError(
      0,
      'NETWORK_ERROR',
      'Falha de conexão com a API VIAJA. Verifique se o backend está em execução.',
    );
    captureWebException(networkErr instanceof Error ? networkErr : wrapped, {
      layer: 'webApiRequest',
      method,
      path,
      query,
      errorCode: 'NETWORK_ERROR',
    });
    throw wrapped;
  }

  if (response.status === 401 && authenticated && retryOnUnauthorized) {
    const nextToken = await attemptTokenRefresh();
    if (nextToken) {
      return webApiRequest<T>(path, { ...options, retryOnUnauthorized: false });
    }
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const isJson = (response.headers.get('content-type') ?? '').includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const errPayload = payload as ApiErrorEnvelope | null;
    const apiError = new WebApiError(
      response.status,
      errPayload?.error?.code ?? 'API_ERROR',
      errPayload?.error?.message ?? 'Não foi possível concluir a operação.',
      errPayload?.error?.details,
    );

    if (response.status >= 500) {
      captureWebException(apiError, {
        layer: 'webApiRequest',
        method,
        path,
        statusCode: response.status,
        errorCode: apiError.code,
        requestId: response.headers.get('x-request-id') ?? undefined,
      });
    } else {
      recordWebBreadcrumb(
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
