import type { ListTripsQuery, SeatAvailabilityDto, TripStatus } from '@viaja/shared';
import { apiRequest } from '../../services/api';

export interface MobileTripItem {
  id: string;
  routeId: string;
  busId: string;
  departureAt: string;
  arrivalAt: string;
  durationMinutes: number;
  price: number;
  status: TripStatus;
  availableSeats: number;
  occupiedSeats: number;
  route: {
    id: string;
    origin: string;
    destination: string;
    distance: number;
    estimatedDuration: number;
  };
  bus: {
    id: string;
    name: string;
    plate: string;
    seatCapacity: number;
  };
}

export interface TripSeatsResponse {
  tripId: string;
  busId: string;
  seatCapacity: number;
  availableCount: number;
  occupiedCount: number;
  seats: SeatAvailabilityDto[];
}

export const tripsApi = {
  async listTrips(filters: ListTripsQuery): Promise<MobileTripItem[]> {
    const response = await apiRequest<{ trips: MobileTripItem[] }>('/trips', {
      authenticated: false,
      query: {
        origin: filters.origin,
        destination: filters.destination,
        date: filters.date,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        minTime: filters.minTime,
        maxTime: filters.maxTime,
        onlyAvailable: filters.onlyAvailable,
        sortBy: filters.sortBy,
      },
    });
    return response.trips;
  },

  async getTripById(tripId: string): Promise<MobileTripItem> {
    const response = await apiRequest<{ trip: MobileTripItem }>(`/trips/${tripId}`, {
      authenticated: false,
    });
    return response.trip;
  },

  getTripSeats(tripId: string): Promise<TripSeatsResponse> {
    return apiRequest<TripSeatsResponse>(`/trips/${tripId}/seats`, {
      authenticated: false,
    });
  },
};
