'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { loginSchema, type LoginInput } from '@viaja/shared';
import { StatusPill, SurfaceCard, TextField, ViajaButton } from '@/components/ui/primitives';
import { useAuth } from '@/hooks/use-auth';
import { WebApiError } from '@/services/api-client';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginInput) => {
    setAuthError(null);
    try {
      const loggedUser = await signIn(values);
      if (loggedUser.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/portal');
      }
    } catch (err) {
      setAuthError(err instanceof WebApiError ? err.message : 'Não foi possível realizar o login.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <SurfaceCard className="w-full max-w-md space-y-5">
        <div className="space-y-1.5">
          <StatusPill tone="info">AUTENTICAÇÃO SEGURA · JWT</StatusPill>
          <h1 className="text-2xl font-extrabold text-slate-900">Entrar no VIAJA</h1>
          <p className="text-sm text-slate-500">
            Administradores são direcionados ao VIAJA Control; passageiros ao portal de viagens.
          </p>
        </div>

        {authError ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700"
          >
            {authError}
          </div>
        ) : null}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <TextField
            label="E-mail"
            type="email"
            placeholder="admin@viaja.app"
            error={errors.email?.message}
            {...register('email')}
          />

          <TextField
            label="Senha"
            type="password"
            placeholder="Informe sua senha"
            error={errors.password?.message}
            {...register('password')}
          />

          <ViajaButton type="submit" className="w-full" isLoading={isSubmitting}>
            Acessar Plataforma
          </ViajaButton>
        </form>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <div className="mb-2 font-bold text-slate-700">Contas locais de demonstração:</div>
          <div className="flex flex-wrap gap-2">
            <ViajaButton
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setValue('email', 'admin@viaja.app');
                setValue('password', 'Admin@123');
              }}
            >
              Preencher Admin
            </ViajaButton>
            <ViajaButton
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setValue('email', 'passageiro@viaja.app');
                setValue('password', 'Viaja@123');
              }}
            >
              Preencher Passageiro
            </ViajaButton>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500">
          Novo passageiro?{' '}
          <Link href="/register" className="font-semibold text-blue-700 hover:underline">
            Criar conta gratuita
          </Link>
        </p>
      </SurfaceCard>
    </div>
  );
}
