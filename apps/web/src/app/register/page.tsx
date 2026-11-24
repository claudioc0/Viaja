'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { registerSchema, type RegisterInput } from '@viaja/shared';
import { SurfaceCard, TextField, ViajaButton } from '@/components/ui/primitives';
import { useAuth } from '@/hooks/use-auth';
import { WebApiError } from '@/services/api-client';

export default function RegisterPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = async (values: RegisterInput) => {
    setFormError(null);
    try {
      await signUp(values);
      router.push('/portal');
    } catch (err) {
      setFormError(
        err instanceof WebApiError ? err.message : 'Não foi possível concluir o cadastro.',
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <SurfaceCard className="w-full max-w-md space-y-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Criar conta de passageiro</h1>
          <p className="mt-1 text-sm text-slate-500">
            Compre passagens simuladas e consulte seus bilhetes digitais.
          </p>
        </div>

        {formError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
            {formError}
          </div>
        ) : null}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <TextField
            label="Nome completo"
            placeholder="Ex.: Ana Beatriz"
            error={errors.name?.message}
            {...register('name')}
          />
          <TextField
            label="E-mail"
            type="email"
            placeholder="ana@viaja.app"
            error={errors.email?.message}
            {...register('email')}
          />
          <TextField
            label="Senha"
            type="password"
            placeholder="Mínimo 6 caracteres"
            error={errors.password?.message}
            {...register('password')}
          />
          <ViajaButton type="submit" className="w-full" isLoading={isSubmitting}>
            Criar conta e continuar
          </ViajaButton>
        </form>

        <p className="text-center text-xs text-slate-500">
          Já possui cadastro?{' '}
          <Link href="/login" className="font-semibold text-blue-700 hover:underline">
            Fazer login
          </Link>
        </p>
      </SurfaceCard>
    </div>
  );
}
