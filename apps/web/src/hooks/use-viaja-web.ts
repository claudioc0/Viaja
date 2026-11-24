'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateRouteInput,
  CreateTripInput,
  DashboardSummaryDto,
  ListReservationsQuery,
  ListRoutesQuery,
  ListTripsQuery,
  PaymentMethod,
  UpdateRouteInput,
  UpdateTripInput,
} from '@viaja/shared';
import type { BusDto, ReservationDto, RouteDto, TripDto, TripSeatsDto } from '../features/types';
import { webApiRequest } from '../services/api-client';

export function useDashboardSummaryQuery() {
  return useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const res = await webApiRequest<{ summary: DashboardSummaryDto }>('/dashboard/summary');
      return res.summary;
    },
  });
}

export function useRoutesQuery(filters: ListRoutesQuery = {}) {
  return useQuery({
    queryKey: ['routes', filters],
    queryFn: async () => {
      const res = await webApiRequest<{ routes: RouteDto[] }>('/routes', {
        authenticated: false,
        query: {
          origin: filters.origin,
          destination: filters.destination,
        },
      });
      return res.routes;
    },
  });
}

export function useCreateRouteMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateRouteInput) => {
      const res = await webApiRequest<{ route: RouteDto }>('/routes', {
        method: 'POST',
        body: input,
      });
      return res.route;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['routes'] });
    },
  });
}

export function useUpdateRouteMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateRouteInput }) => {
      const res = await webApiRequest<{ route: RouteDto }>(`/routes/${id}`, {
        method: 'PUT',
        body: data,
      });
      return res.route;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['routes'] });
      void qc.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}

export function useDeleteRouteMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await webApiRequest<void>(`/routes/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['routes'] });
    },
  });
}

export function useBusesQuery() {
  return useQuery({
    queryKey: ['buses'],
    queryFn: async () => {
      const res = await webApiRequest<{ buses: BusDto[] }>('/buses', {
        authenticated: false,
      });
      return res.buses;
    },
  });
}

export function useTripsQuery(filters: ListTripsQuery = {}) {
  return useQuery({
    queryKey: ['trips', filters],
    queryFn: async () => {
      const res = await webApiRequest<{ trips: TripDto[] }>('/trips', {
        authenticated: false,
        query: {
          origin: filters.origin,
          destination: filters.destination,
          date: filters.date,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
          onlyAvailable: filters.onlyAvailable,
          sortBy: filters.sortBy,
        },
      });
      return res.trips;
    },
  });
}

export function useTripSeatsQuery(tripId: string | null) {
  return useQuery({
    queryKey: ['trip-seats', tripId],
    queryFn: () =>
      webApiRequest<TripSeatsDto>(`/trips/${tripId}/seats`, {
        authenticated: false,
      }),
    enabled: Boolean(tripId),
    staleTime: 0,
  });
}

export function useCreateTripMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTripInput) => {
      const res = await webApiRequest<{ trip: TripDto }>('/trips', {
        method: 'POST',
        body: input,
      });
      return res.trip;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['trips'] });
      void qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
  });
}

export function useUpdateTripMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTripInput }) => {
      const res = await webApiRequest<{ trip: TripDto }>(`/trips/${id}`, {
        method: 'PUT',
        body: data,
      });
      return res.trip;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['trips'] });
      void qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
  });
}

export function useDeleteTripMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await webApiRequest<void>(`/trips/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['trips'] });
      void qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
  });
}

export function useReservationsQuery(filters: ListReservationsQuery = {}) {
  return useQuery({
    queryKey: ['reservations', filters],
    queryFn: async () => {
      const res = await webApiRequest<{ reservations: ReservationDto[] }>('/reservations', {
        query: {
          tripId: filters.tripId,
          status: filters.status,
          code: filters.code,
        },
      });
      return res.reservations;
    },
  });
}

export function useCancelReservationMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reservationId: string) => {
      const res = await webApiRequest<{ reservation: ReservationDto }>(
        `/reservations/${reservationId}/cancel`,
        { method: 'POST' },
      );
      return res.reservation;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['reservations'] });
      void qc.invalidateQueries({ queryKey: ['trips'] });
      void qc.invalidateQueries({ queryKey: ['trip-seats'] });
      void qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
  });
}

export function useWebBookingCheckoutMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { tripId: string; seatIds: string[]; method: PaymentMethod }) => {
      const created = await webApiRequest<{ reservation: ReservationDto }>('/reservations', {
        method: 'POST',
        body: {
          tripId: params.tripId,
          seatIds: params.seatIds,
        },
      });

      const paid = await webApiRequest<{ reservation: ReservationDto }>('/payments', {
        method: 'POST',
        body: {
          reservationId: created.reservation.id,
          method: params.method,
          simulateOutcome: 'APPROVED',
        },
      });

      return paid.reservation;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['trips'] });
      void qc.invalidateQueries({ queryKey: ['trip-seats'] });
      void qc.invalidateQueries({ queryKey: ['reservations'] });
      void qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
  });
}
