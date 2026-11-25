'use client';

import React, { useEffect } from 'react';
import { captureWebException } from '@/lib/monitoring';
import { SurfaceCard, ViajaButton } from '@/components/ui/primitives';

export default function AppErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureWebException(error, {
      boundary: 'app-error-boundary',
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <SurfaceCard className="max-w-md space-y-4 text-center">
        <h2 className="text-lg font-bold text-slate-900">Algo inesperado aconteceu</h2>
        <p className="text-sm text-slate-600">
          O incidente foi registrado automaticamente para diagnóstico sem expor seus dados pessoais.
        </p>
        <div className="flex justify-center">
          <ViajaButton onClick={reset}>Tentar novamente</ViajaButton>
        </div>
      </SurfaceCard>
    </div>
  );
}
