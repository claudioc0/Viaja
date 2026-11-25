'use client';

import React, { useEffect } from 'react';
import { captureWebException } from '@/lib/monitoring';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureWebException(error, {
      boundary: 'root-global-error',
      digest: error.digest,
    });
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-900">
        <div className="max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-bold">Falha crítica na interface</h1>
          <p className="text-sm text-slate-600">
            Nossa equipe técnica foi notificada automaticamente. Você pode recarregar a aplicação
            com segurança.
          </p>
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Recarregar aplicação
          </button>
        </div>
      </body>
    </html>
  );
}
