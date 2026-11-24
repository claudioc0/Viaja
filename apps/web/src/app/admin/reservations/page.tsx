'use client';

import React, { useState } from 'react';
import { RESERVATION_STATUSES, type ReservationStatus } from '@viaja/shared';
import { ModalDialog } from '@/components/ui/modal';
import {
  DataStateBox,
  StatusPill,
  SurfaceCard,
  TextField,
  ViajaButton,
} from '@/components/ui/primitives';
import type { ReservationDto } from '@/features/types';
import {
  useCancelReservationMutation,
  useReservationsQuery,
  useTripsQuery,
} from '@/hooks/use-viaja-web';
import {
  formatCurrencyBRL,
  formatDateTimeBR,
  paymentStatusLabel,
  reservationStatusLabel,
} from '@/lib/utils';
import { WebApiError } from '@/services/api-client';

export default function AdminReservationsPage() {
  const [selectedTripId, setSelectedTripId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [codeSearch, setCodeSearch] = useState('');
  const [inspected, setInspected] = useState<ReservationDto | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const tripsQuery = useTripsQuery();
  const reservationsQuery = useReservationsQuery({
    tripId: selectedTripId || undefined,
    status: (selectedStatus || undefined) as ReservationStatus | undefined,
    code: codeSearch || undefined,
  });

  const cancelMutation = useCancelReservationMutation();

  const handleAdminCancel = async (reservation: ReservationDto) => {
    setActionError(null);
    try {
      const updated = await cancelMutation.mutateAsync(reservation.id);
      if (inspected?.id === updated.id) {
        setInspected(updated);
      }
    } catch (err) {
      setActionError(
        err instanceof WebApiError ? err.message : 'Não foi possível cancelar a reserva.',
      );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Gerenciamento de Reservas</h1>
        <p className="text-sm text-slate-500">
          Consulte passageiros, assentos, pagamentos simulados e realize cancelamentos
          administrativos.
        </p>
      </div>

      {actionError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {actionError}
        </div>
      ) : null}

      <SurfaceCard className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="filter-trip" className="block text-xs font-semibold text-slate-700">
            Filtrar por Viagem
          </label>
          <select
            id="filter-trip"
            value={selectedTripId}
            onChange={(e) => setSelectedTripId(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">Todas as viagens</option>
            {(tripsQuery.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.route.origin} → {t.route.destination} ({formatDateTimeBR(t.departureAt)})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="filter-status" className="block text-xs font-semibold text-slate-700">
            Status da Reserva
          </label>
          <select
            id="filter-status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">Todos os status</option>
            {RESERVATION_STATUSES.map((st) => (
              <option key={st} value={st}>
                {reservationStatusLabel(st)}
              </option>
            ))}
          </select>
        </div>

        <TextField
          label="Código Localizador"
          placeholder="Ex.: VJ-8F4K92"
          value={codeSearch}
          onChange={(e) => setCodeSearch(e.target.value)}
        />
      </SurfaceCard>

      {reservationsQuery.isLoading ? (
        <DataStateBox kind="loading" title="Carregando reservas..." />
      ) : reservationsQuery.isError ? (
        <DataStateBox
          kind="error"
          title="Falha ao consultar reservas"
          actionText="Tentar novamente"
          onAction={() => void reservationsQuery.refetch()}
        />
      ) : (reservationsQuery.data ?? []).length === 0 ? (
        <DataStateBox
          kind="empty"
          title="Nenhuma reserva encontrada"
          description="Ajuste os filtros selecionados para visualizar outros registros."
        />
      ) : (
        <SurfaceCard className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <th className="px-6 py-3">Código</th>
                <th className="px-6 py-3">Passageiro</th>
                <th className="px-6 py-3">Trecho</th>
                <th className="px-6 py-3">Poltronas</th>
                <th className="px-6 py-3">Pagamento</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(reservationsQuery.data ?? []).map((res) => {
                const canCancel = res.status === 'CONFIRMED' || res.status === 'PENDING';
                return (
                  <tr key={res.id} className="border-b border-slate-100">
                    <td className="px-6 py-4 font-mono font-bold text-blue-700">{res.code}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{res.passenger.name}</div>
                      <div className="text-xs text-slate-400">{res.passenger.email}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      <div>
                        {res.trip.route.origin} → {res.trip.route.destination}
                      </div>
                      <div className="font-mono text-xs text-slate-400">
                        {formatDateTimeBR(res.trip.departureAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-700">
                      {res.seats.map((s) => s.seatNumber).join(', ')}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div className="font-mono font-bold text-slate-900">
                        {formatCurrencyBRL(res.totalPrice)}
                      </div>
                      <div className="text-slate-500">
                        {res.payment
                          ? `${res.payment.method} · ${paymentStatusLabel(res.payment.status)}`
                          : 'Sem pagamento'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusPill
                        tone={
                          res.status === 'CONFIRMED'
                            ? 'success'
                            : res.status === 'PENDING'
                              ? 'warning'
                              : 'danger'
                        }
                      >
                        {reservationStatusLabel(res.status)}
                      </StatusPill>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex gap-2">
                        <ViajaButton variant="outline" size="sm" onClick={() => setInspected(res)}>
                          Detalhes
                        </ViajaButton>
                        {canCancel ? (
                          <ViajaButton
                            variant="danger"
                            size="sm"
                            isLoading={cancelMutation.isPending}
                            onClick={() => void handleAdminCancel(res)}
                          >
                            Cancelar
                          </ViajaButton>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </SurfaceCard>
      )}

      <ModalDialog
        open={Boolean(inspected)}
        onOpenChange={(open) => {
          if (!open) setInspected(null);
        }}
        title={inspected ? `Reserva ${inspected.code}` : 'Detalhes da Reserva'}
        description="Auditoria completa de passageiro, poltronas e transação financeira simulada."
      >
        {inspected ? (
          <div className="space-y-4 text-sm">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase text-slate-400">Passageiro</div>
              <div className="font-bold text-slate-900">{inspected.passenger.name}</div>
              <div className="text-xs text-slate-500">{inspected.passenger.email}</div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase text-slate-400">Viagem e Assentos</div>
              <div className="font-bold text-slate-900">
                {inspected.trip.route.origin} → {inspected.trip.route.destination}
              </div>
              <div className="font-mono text-xs text-slate-600">
                Partida: {formatDateTimeBR(inspected.trip.departureAt)} · Ônibus:{' '}
                {inspected.trip.bus.name} ({inspected.trip.bus.plate})
              </div>
              <div className="mt-2 font-mono text-xs font-semibold text-blue-700">
                Poltronas: {inspected.seats.map((s) => s.seatNumber).join(', ')}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase text-slate-400">Pagamento Simulado</div>
              {inspected.payment ? (
                <div className="space-y-1 text-xs text-slate-700">
                  <div>
                    Método: <b>{inspected.payment.method}</b> · Status:{' '}
                    <b>{paymentStatusLabel(inspected.payment.status)}</b>
                  </div>
                  <div>
                    Valor:{' '}
                    <b className="font-mono">{formatCurrencyBRL(inspected.payment.amount)}</b>
                  </div>
                  <div className="font-mono text-slate-500">
                    Ref: {inspected.payment.transactionReference}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500">
                  Nenhum pagamento registrado até o momento.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </ModalDialog>
    </div>
  );
}
