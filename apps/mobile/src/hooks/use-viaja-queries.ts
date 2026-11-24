import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ListTripsQuery, PaymentMethod } from '@viaja/shared';
import { reservationsApi } from '../features/reservations/reservations-api';
import { tripsApi } from '../features/trips/trips-api';

export function useTripsQuery(filters: ListTripsQuery) {
  return useQuery({
    queryKey: ['trips', filters],
    queryFn: () => tripsApi.listTrips(filters),
  });
}

export function useTripDetailsQuery(tripId: string) {
  return useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => tripsApi.getTripById(tripId),
    enabled: Boolean(tripId),
  });
}

/**
 * Queries real-time seat availability directly from the API (`staleTime: 0`).
 * Never relies solely on cached client state.
 */
export function useTripSeatsQuery(tripId: string) {
  return useQuery({
    queryKey: ['trip-seats', tripId],
    queryFn: () => tripsApi.getTripSeats(tripId),
    enabled: Boolean(tripId),
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useMyReservationsQuery() {
  return useQuery({
    queryKey: ['my-reservations'],
    queryFn: () => reservationsApi.listMyReservations(),
  });
}

export function useReservationDetailsQuery(reservationId: string) {
  return useQuery({
    queryKey: ['reservation', reservationId],
    queryFn: () => reservationsApi.getReservationById(reservationId),
    enabled: Boolean(reservationId),
  });
}

export function useCompleteCheckoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { tripId: string; seatIds: string[]; method: PaymentMethod }) => {
      const reservation = await reservationsApi.createReservation({
        tripId: params.tripId,
        seatIds: params.seatIds,
      });

      const paymentOutcome = await reservationsApi.processPayment({
        reservationId: reservation.id,
        method: params.method,
        simulateOutcome: 'APPROVED',
      });

      return paymentOutcome;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['trip-seats', variables.tripId] });
      void queryClient.invalidateQueries({ queryKey: ['trips'] });
      void queryClient.invalidateQueries({ queryKey: ['my-reservations'] });
    },
    onError: (_error, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['trip-seats', variables.tripId] });
    },
  });
}

export function useCancelReservationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reservationId: string) => reservationsApi.cancelReservation(reservationId),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ['reservation', updated.id] });
      void queryClient.invalidateQueries({ queryKey: ['my-reservations'] });
      void queryClient.invalidateQueries({ queryKey: ['trip-seats', updated.tripId] });
      void queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}
