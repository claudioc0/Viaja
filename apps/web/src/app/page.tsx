import React from 'react';
import Link from 'next/link';
import { Bus, ShieldCheck, Ticket } from 'lucide-react';
import { StatusPill, SurfaceCard } from '@/components/ui/primitives';

export default function HomePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
      <div className="space-y-4 text-center">
        <StatusPill tone="info">VIAJA · PLATAFORMA DE MOBILIDADE RODOVIÁRIA</StatusPill>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
          Gestão operacional e passagens digitais em tempo real
        </h1>
        <p className="mx-auto max-w-2xl text-base text-slate-600">
          Acesse o painel administrativo para gerenciar rotas, frota, viagens e reservas, ou utilize
          o portal web do passageiro para simular compras com controle transacional de assentos.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-blue-700 px-6 text-sm font-semibold text-white transition-colors hover:bg-blue-800"
          >
            Acessar Plataforma
          </Link>
          <Link
            href="/portal"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
          >
            Pesquisar Passagens
          </Link>
        </div>
      </div>

      <div className="mt-14 grid gap-6 md:grid-cols-3">
        <SurfaceCard className="space-y-2">
          <ShieldCheck className="h-6 w-6 text-blue-700" />
          <h2 className="text-base font-bold text-slate-900">Painel Administrativo</h2>
          <p className="text-sm text-slate-600">
            Indicadores reais de receita, taxa de ocupação, cadastro de rotas e gestão de viagens.
          </p>
        </SurfaceCard>
        <SurfaceCard className="space-y-2">
          <Bus className="h-6 w-6 text-blue-700" />
          <h2 className="text-base font-bold text-slate-900">Controle de Concorrência</h2>
          <p className="text-sm text-slate-600">
            Mapa de poltronas sincronizado diretamente com locks transacionais no PostgreSQL.
          </p>
        </SurfaceCard>
        <SurfaceCard className="space-y-2">
          <Ticket className="h-6 w-6 text-blue-700" />
          <h2 className="text-base font-bold text-slate-900">Passagem Digital</h2>
          <p className="text-sm text-slate-600">
            Checkout simulado via PIX e Cartão de Crédito com código localizador instantâneo.
          </p>
        </SurfaceCard>
      </div>
    </div>
  );
}
