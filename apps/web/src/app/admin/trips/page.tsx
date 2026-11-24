'use client';

import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { TRIP_STATUSES, type TripStatus } from '@viaja/shared';
import { ModalDialog } from '@/components/ui/modal';
import {
  DataStateBox,
  StatusPill,
  SurfaceCard,
  TextField,
  ViajaButton,
} from '@/components/ui/primitives';
import type { TripDto } from '@/features/types';
import {
  useBusesQuery,
  useCreateTripMutation,
  useDeleteTripMutation,
  useRoutesQuery,
  useTripsQuery,
  useUpdateTripMutation,
} from '@/hooks/use-viaja-web';
import { formatCurrencyBRL, formatDateTimeBR, tripStatusLabel } from '@/lib/utils';
import { WebApiError } from '@/services/api-client';

const tripFormSchema = z
  .object({
    routeId: z.string().uuid('Selecione uma rota válida.'),
    busId: z.string().uuid('Selecione um ônibus válido.'),
    departureLocal: z.string().min(1, 'Informe a data/hora de partida.'),
    arrivalLocal: z.string().min(1, 'Informe a data/hora de chegada.'),
    price: z.coerce.number().positive('Informe um preço válido maior que zero.'),
    status: z.enum(TRIP_STATUSES),
  })
  .refine((v) => new Date(v.arrivalLocal).getTime() > new Date(v.departureLocal).getTime(), {
    message: 'A chegada deve ser posterior à partida.',
    path: ['arrivalLocal'],
  });

type TripFormValues = z.infer<typeof tripFormSchema>;

function toDateTimeLocalValue(iso: string): string {
  return new Date(iso).toISOString().slice(0, 16);
}

export default function AdminTripsPage() {
  const [originFilter, setOriginFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<TripDto | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const tripsQuery = useTripsQuery({ origin: originFilter || undefined });
  const routesQuery = useRoutesQuery();
  const busesQuery = useBusesQuery();

  const createMutation = useCreateTripMutation();
  const updateMutation = useUpdateTripMutation();
  const deleteMutation = useDeleteTripMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TripFormValues>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: {
      routeId: '',
      busId: '',
      departureLocal: '',
      arrivalLocal: '',
      price: 129.9,
      status: 'SCHEDULED',
    },
  });

  const openCreateModal = () => {
    setEditingTrip(null);
    setErrorMsg(null);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const plusSix = new Date(tomorrow.getTime() + 6 * 60 * 60 * 1000);
    reset({
      routeId: routesQuery.data?.[0]?.id ?? '',
      busId: busesQuery.data?.[0]?.id ?? '',
      departureLocal: tomorrow.toISOString().slice(0, 16),
      arrivalLocal: plusSix.toISOString().slice(0, 16),
      price: 129.9,
      status: 'SCHEDULED',
    });
    setModalOpen(true);
  };

  const openEditModal = (trip: TripDto) => {
    setEditingTrip(trip);
    setErrorMsg(null);
    reset({
      routeId: trip.routeId,
      busId: trip.busId,
      departureLocal: toDateTimeLocalValue(trip.departureAt),
      arrivalLocal: toDateTimeLocalValue(trip.arrivalAt),
      price: trip.price,
      status: trip.status,
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: TripFormValues) => {
    setErrorMsg(null);
    try {
      const payload = {
        routeId: values.routeId,
        busId: values.busId,
        departureAt: new Date(`${values.departureLocal}:00.000Z`).toISOString(),
        arrivalAt: new Date(`${values.arrivalLocal}:00.000Z`).toISOString(),
        price: values.price,
        status: values.status as TripStatus,
      };

      if (editingTrip) {
        await updateMutation.mutateAsync({ id: editingTrip.id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setModalOpen(false);
    } catch (err) {
      setErrorMsg(err instanceof WebApiError ? err.message : 'Erro ao salvar viagem.');
    }
  };

  const handleDelete = async (tripId: string) => {
    setErrorMsg(null);
    try {
      await deleteMutation.mutateAsync(tripId);
    } catch (err) {
      setErrorMsg(err instanceof WebApiError ? err.message : 'Erro ao remover viagem.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Gerenciamento de Viagens</h1>
          <p className="text-sm text-slate-500">
            Associe rotas e ônibus, defina horários, tarifas e acompanhe a disponibilidade.
          </p>
        </div>
        <ViajaButton onClick={openCreateModal}>+ Cadastrar Viagem</ViajaButton>
      </div>

      {errorMsg ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {errorMsg}
        </div>
      ) : null}

      <SurfaceCard>
        <TextField
          label="Filtrar por cidade de origem"
          placeholder="Ex.: São Paulo"
          value={originFilter}
          onChange={(e) => setOriginFilter(e.target.value)}
        />
      </SurfaceCard>

      {tripsQuery.isLoading ? (
        <DataStateBox kind="loading" title="Consultando grade de viagens..." />
      ) : tripsQuery.isError ? (
        <DataStateBox
          kind="error"
          title="Erro ao carregar viagens"
          actionText="Tentar novamente"
          onAction={() => void tripsQuery.refetch()}
        />
      ) : (tripsQuery.data ?? []).length === 0 ? (
        <DataStateBox
          kind="empty"
          title="Nenhuma viagem cadastrada"
          description="Cadastre uma nova viagem para disponibilizar poltronas."
        />
      ) : (
        <SurfaceCard className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <th className="px-6 py-3">Rota</th>
                <th className="px-6 py-3">Ônibus</th>
                <th className="px-6 py-3">Partida → Chegada</th>
                <th className="px-6 py-3">Preço</th>
                <th className="px-6 py-3">Disponibilidade</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(tripsQuery.data ?? []).map((trip) => (
                <tr key={trip.id} className="border-b border-slate-100">
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    {trip.route.origin} → {trip.route.destination}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    <div>{trip.bus.name}</div>
                    <div className="font-mono text-xs text-slate-400">{trip.bus.plate}</div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-600">
                    <div>{formatDateTimeBR(trip.departureAt)}</div>
                    <div>até {formatDateTimeBR(trip.arrivalAt)}</div>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-blue-700">
                    {formatCurrencyBRL(trip.price)}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-700">
                    {trip.availableSeats} livres / {trip.bus.seatCapacity}
                  </td>
                  <td className="px-6 py-4">
                    <StatusPill
                      tone={
                        trip.status === 'SCHEDULED'
                          ? 'success'
                          : trip.status === 'CANCELLED'
                            ? 'danger'
                            : 'info'
                      }
                    >
                      {tripStatusLabel(trip.status)}
                    </StatusPill>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex gap-2">
                      <ViajaButton variant="outline" size="sm" onClick={() => openEditModal(trip)}>
                        Editar
                      </ViajaButton>
                      <ViajaButton
                        variant="danger"
                        size="sm"
                        onClick={() => void handleDelete(trip.id)}
                      >
                        Excluir
                      </ViajaButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SurfaceCard>
      )}

      <ModalDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editingTrip ? 'Editar Viagem' : 'Cadastrar Nova Viagem'}
        description="Configure rota, ônibus, janela horária (UTC) e tarifa por poltrona."
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="routeId" className="block text-xs font-semibold text-slate-700">
              Rota
            </label>
            <select
              id="routeId"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
              {...register('routeId')}
            >
              <option value="">Selecione uma rota...</option>
              {(routesQuery.data ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.origin} → {r.destination}
                </option>
              ))}
            </select>
            {errors.routeId ? (
              <p className="text-xs text-red-600">{errors.routeId.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="busId" className="block text-xs font-semibold text-slate-700">
              Ônibus
            </label>
            <select
              id="busId"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
              {...register('busId')}
            >
              <option value="">Selecione um ônibus...</option>
              {(busesQuery.data ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.plate} · {b.seatCapacity} lugares)
                </option>
              ))}
            </select>
            {errors.busId ? <p className="text-xs text-red-600">{errors.busId.message}</p> : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Partida (UTC)"
              type="datetime-local"
              error={errors.departureLocal?.message}
              {...register('departureLocal')}
            />
            <TextField
              label="Chegada (UTC)"
              type="datetime-local"
              error={errors.arrivalLocal?.message}
              {...register('arrivalLocal')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Tarifa (R$)"
              type="number"
              step="0.01"
              error={errors.price?.message}
              {...register('price', { valueAsNumber: true })}
            />

            <div className="space-y-1.5">
              <label htmlFor="status" className="block text-xs font-semibold text-slate-700">
                Status Operacional
              </label>
              <select
                id="status"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                {...register('status')}
              >
                {TRIP_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {tripStatusLabel(st)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <ViajaButton type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </ViajaButton>
            <ViajaButton type="submit" isLoading={isSubmitting}>
              Salvar Viagem
            </ViajaButton>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}
