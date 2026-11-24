import { create } from 'zustand';
import { MAX_SEATS_PER_RESERVATION, type SeatAvailabilityDto } from '@viaja/shared';
import type { MobileTripItem } from '../features/trips/trips-api';
import { getTomorrowIsoDate } from '../utils/formatters';

export interface SearchFiltersDraft {
  origin: string;
  destination: string;
  date: string;
  maxPrice?: number;
  onlyAvailable: boolean;
  sortBy: 'price_asc' | 'duration_asc' | 'departure_asc';
}

interface BookingDraftState {
  searchFilters: SearchFiltersDraft;
  selectedTrip: MobileTripItem | null;
  selectedSeats: SeatAvailabilityDto[];
  setSearchFilters: (partial: Partial<SearchFiltersDraft>) => void;
  swapOriginDestination: () => void;
  startSeatSelection: (trip: MobileTripItem) => void;
  toggleSeatSelection: (seat: SeatAvailabilityDto) => {
    added: boolean;
    limitReached: boolean;
  };
  syncSelectionWithFreshAvailability: (freshSeats: SeatAvailabilityDto[]) => string[];
  clearBookingDraft: () => void;
}

export const useBookingStore = create<BookingDraftState>((set, get) => ({
  searchFilters: {
    origin: 'São Paulo',
    destination: 'Rio de Janeiro',
    date: getTomorrowIsoDate(1),
    onlyAvailable: true,
    sortBy: 'price_asc',
  },
  selectedTrip: null,
  selectedSeats: [],

  setSearchFilters(partial) {
    set((state) => ({
      searchFilters: { ...state.searchFilters, ...partial },
    }));
  },

  swapOriginDestination() {
    set((state) => ({
      searchFilters: {
        ...state.searchFilters,
        origin: state.searchFilters.destination,
        destination: state.searchFilters.origin,
      },
    }));
  },

  startSeatSelection(trip) {
    const currentTripId = get().selectedTrip?.id;
    set({
      selectedTrip: trip,
      selectedSeats: currentTripId === trip.id ? get().selectedSeats : [],
    });
  },

  toggleSeatSelection(seat) {
    if (seat.status !== 'AVAILABLE') {
      return { added: false, limitReached: false };
    }

    const current = get().selectedSeats;
    const exists = current.some((s) => s.id === seat.id);
    if (exists) {
      set({ selectedSeats: current.filter((s) => s.id !== seat.id) });
      return { added: false, limitReached: false };
    }

    if (current.length >= MAX_SEATS_PER_RESERVATION) {
      return { added: false, limitReached: true };
    }

    const updated = [...current, seat].sort((a, b) => a.seatNumber.localeCompare(b.seatNumber));
    set({ selectedSeats: updated });
    return { added: true, limitReached: false };
  },

  syncSelectionWithFreshAvailability(freshSeats) {
    const availableIds = new Set(
      freshSeats.filter((s) => s.status === 'AVAILABLE').map((s) => s.id),
    );
    const removedNumbers: string[] = [];
    const kept = get().selectedSeats.filter((seat) => {
      const stillFree = availableIds.has(seat.id);
      if (!stillFree) {
        removedNumbers.push(seat.seatNumber);
      }
      return stillFree;
    });

    if (removedNumbers.length > 0) {
      set({ selectedSeats: kept });
    }
    return removedNumbers;
  },

  clearBookingDraft() {
    set({ selectedTrip: null, selectedSeats: [] });
  },
}));
