'use client';

import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { createRouteSchema, type CreateRouteInput } from '@viaja/shared';
import { ModalDialog } from '@/components/ui/modal';
import { DataStateBox, SurfaceCard, TextField, ViajaButton } from '@/components/ui/primitives';
import type { RouteDto } from '@/features/types';
import {
  useCreateRouteMutation,
  useDeleteRouteMutation,
  useRoutesQuery,
  useUpdateRouteMutation,
} from '@/hooks/use-viaja-web';
import { formatDurationMinutes } from '@/lib/utils';
import { WebApiError } from '@/services/api-client';

export default function AdminRoutesPage() {
  const [originSearch, setOriginSearch] = useState('');
  const [destinationSearch, setDestinationSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteDto | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const routesQuery = useRoutesQuery({
    origin: originSearch || undefined,
    destination: destinationSearch || undefined,
  });

  const createMutation = useCreateRouteMutation();
  const updateMutation = useUpdateRouteMutation();
  const deleteMutation = useDeleteRouteMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateRouteInput>({
    resolver: zodResolver(createRouteSchema),
    defaultValues: {
      origin: '',
      destination: '',
      distance: 100,
      estimatedDuration: 120,
    },
  });

  const openCreateModal = () => {
    setEditingRoute(null);
    setFeedbackError(null);
    reset({
      origin: '',
      destination: '',
      distance: 100,
      estimatedDuration: 120,
    });
    setModalOpen(true);
  };

  const openEditModal = (route: RouteDto) => {
    setEditingRoute(route);
    setFeedbackError(null);
    reset({
      origin: route.origin,
      destination: route.destination,
      distance: route.distance,
      estimatedDuration: route.estimatedDuration,
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: CreateRouteInput) => {
    setFeedbackError(null);
    try {
      if (editingRoute) {
        await updateMutation.mutateAsync({ id: editingRoute.id, data: values });
      } else {
        await createMutation.mutateAsync(values);
      }
      setModalOpen(false);
    } catch (err) {
      setFeedbackError(err instanceof WebApiError ? err.message : 'Erro ao salvar a rota.');
    }
  };

  const handleDelete = async (route: RouteDto) => {
    setFeedbackError(null);
    try {
      await deleteMutation.mutateAsync(route.id);
    } catch (err) {
      setFeedbackError(
        err instanceof WebApiError ? err.message : 'Não foi possível excluir a rota.',
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Gerenciamento de Rotas</h1>
          <p className="text-sm text-slate-500">
            Cadastre, pesquise, edite e exclua rotas da malha rodoviária.
          </p>
        </div>
        <ViajaButton onClick={openCreateModal}>+ Nova Rota</ViajaButton>
      </div>

      {feedbackError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {feedbackError}
        </div>
      ) : null}

      <SurfaceCard className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Pesquisar por Origem"
          placeholder="Ex.: São Paulo"
          value={originSearch}
          onChange={(e) => setOriginSearch(e.target.value)}
        />
        <TextField
          label="Pesquisar por Destino"
          placeholder="Ex.: Curitiba"
          value={destinationSearch}
          onChange={(e) => setDestinationSearch(e.target.value)}
        />
      </SurfaceCard>

      {routesQuery.isLoading ? (
        <DataStateBox kind="loading" title="Carregando rotas..." />
      ) : routesQuery.isError ? (
        <DataStateBox
          kind="error"
          title="Falha ao consultar rotas"
          description={routesQuery.error instanceof Error ? routesQuery.error.message : undefined}
          actionText="Tentar novamente"
          onAction={() => void routesQuery.refetch()}
        />
      ) : (routesQuery.data ?? []).length === 0 ? (
        <DataStateBox
          kind="empty"
          title="Nenhuma rota encontrada"
          description="Cadastre uma nova rota ou limpe os filtros de pesquisa."
        />
      ) : (
        <SurfaceCard className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <th className="px-6 py-3">Origem</th>
                <th className="px-6 py-3">Destino</th>
                <th className="px-6 py-3">Distância</th>
                <th className="px-6 py-3">Duração Est.</th>
                <th className="px-6 py-3">Viagens</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(routesQuery.data ?? []).map((route) => (
                <tr key={route.id} className="border-b border-slate-100">
                  <td className="px-6 py-4 font-semibold text-slate-900">{route.origin}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">{route.destination}</td>
                  <td className="px-6 py-4 font-mono text-slate-600">{route.distance} km</td>
                  <td className="px-6 py-4 font-mono text-slate-600">
                    {formatDurationMinutes(route.estimatedDuration)}
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-600">{route.tripsCount ?? 0}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex gap-2">
                      <ViajaButton variant="outline" size="sm" onClick={() => openEditModal(route)}>
                        Editar
                      </ViajaButton>
                      <ViajaButton
                        variant="danger"
                        size="sm"
                        onClick={() => void handleDelete(route)}
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
        title={editingRoute ? 'Editar Rota' : 'Cadastrar Nova Rota'}
        description="Preencha os dados do trecho rodoviário."
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <TextField
            label="Cidade / UF de Origem"
            placeholder="Ex.: São Paulo, SP"
            error={errors.origin?.message}
            {...register('origin')}
          />
          <TextField
            label="Cidade / UF de Destino"
            placeholder="Ex.: Florianópolis, SC"
            error={errors.destination?.message}
            {...register('destination')}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Distância (km)"
              type="number"
              step="0.1"
              error={errors.distance?.message}
              {...register('distance', { valueAsNumber: true })}
            />
            <TextField
              label="Duração estimada (minutos)"
              type="number"
              error={errors.estimatedDuration?.message}
              {...register('estimatedDuration', { valueAsNumber: true })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <ViajaButton type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </ViajaButton>
            <ViajaButton type="submit" isLoading={isSubmitting}>
              Salvar Rota
            </ViajaButton>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}
