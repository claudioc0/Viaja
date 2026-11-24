'use client';

import React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DataStateBox, StatusPill, SurfaceCard, ViajaButton } from '@/components/ui/primitives';
import { useDashboardSummaryQuery } from '@/hooks/use-viaja-web';
import { formatCurrencyBRL, formatDateTimeBR } from '@/lib/utils';

export default function AdminDashboardPage() {
  const { data: summary, isLoading, isError, error, refetch } = useDashboardSummaryQuery();

  if (isLoading) {
    return (
      <DataStateBox
        kind="loading"
        title="Carregando indicadores operacionais..."
        description="Consultando métricas em tempo real na API VIAJA."
      />
    );
  }

  if (isError || !summary) {
    return (
      <DataStateBox
        kind="error"
        title="Falha ao carregar o dashboard"
        description={error instanceof Error ? error.message : 'Erro inesperado.'}
        actionText="Tentar novamente"
        onAction={() => void refetch()}
      />
    );
  }

  const chartData = summary.topTrips.map((item) => ({
    label: `${item.origin.split(',')[0]} → ${item.destination.split(',')[0]}`,
    ocupacao: item.occupancyRate,
    receita: item.revenue,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Dashboard Operacional</h1>
          <p className="text-sm text-slate-500">
            Indicadores consolidados em tempo real a partir do banco de dados PostgreSQL.
          </p>
        </div>
        <ViajaButton variant="outline" size="sm" onClick={() => void refetch()}>
          Atualizar indicadores
        </ViajaButton>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SurfaceCard className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Total de Viagens
          </div>
          <div className="font-mono text-3xl font-extrabold text-slate-900" data-testid="kpi-trips">
            {summary.totalTrips}
          </div>
          <div className="text-xs text-slate-400">Viagens cadastradas na malha</div>
        </SurfaceCard>

        <SurfaceCard className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Total de Reservas
          </div>
          <div
            className="font-mono text-3xl font-extrabold text-slate-900"
            data-testid="kpi-reservations"
          >
            {summary.totalReservations}
          </div>
          <div className="text-xs text-emerald-700">
            {summary.confirmedReservations} confirmada(s)
          </div>
        </SurfaceCard>

        <SurfaceCard className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Receita Simulada
          </div>
          <div
            className="font-mono text-3xl font-extrabold text-blue-700"
            data-testid="kpi-revenue"
          >
            {formatCurrencyBRL(summary.simulatedRevenue)}
          </div>
          <div className="text-xs text-slate-400">Pagamentos com status APPROVED</div>
        </SurfaceCard>

        <SurfaceCard className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Taxa de Ocupação
          </div>
          <div
            className="font-mono text-3xl font-extrabold text-emerald-600"
            data-testid="kpi-occupancy"
          >
            {summary.occupancyRate}%
          </div>
          <div className="text-xs text-slate-400">Média global das viagens ativas</div>
        </SurfaceCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SurfaceCard className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Ocupação por Viagem Mais Procurada (%)
            </h2>
            <p className="text-xs text-slate-500">
              Percentual de assentos reservados nas principais viagens
            </p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis unit="%" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="ocupacao" name="Ocupação (%)" fill="#1d4ed8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SurfaceCard>

        <SurfaceCard className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Ranking de Viagens Mais Procuradas
            </h2>
            <p className="text-xs text-slate-500">
              Detalhamento de assentos ocupados e receita aprovada
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <th className="py-2.5">Trecho</th>
                  <th className="py-2.5">Partida</th>
                  <th className="py-2.5">Ocupação</th>
                  <th className="py-2.5">Receita</th>
                </tr>
              </thead>
              <tbody>
                {summary.topTrips.map((trip) => (
                  <tr key={trip.tripId} className="border-b border-slate-100">
                    <td className="py-3 font-medium text-slate-900">
                      <div>
                        {trip.origin} → {trip.destination}
                      </div>
                      <div className="text-xs text-slate-400">{trip.busName}</div>
                    </td>
                    <td className="py-3 font-mono text-xs text-slate-600">
                      {formatDateTimeBR(trip.departureAt)}
                    </td>
                    <td className="py-3">
                      <StatusPill tone={trip.occupancyRate >= 50 ? 'success' : 'info'}>
                        {trip.occupiedSeats}/{trip.seatCapacity} ({trip.occupancyRate}%)
                      </StatusPill>
                    </td>
                    <td className="py-3 font-mono font-semibold text-slate-900">
                      {formatCurrencyBRL(trip.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
