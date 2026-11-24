import type {
  CreatePaymentInput,
  CreateReservationInput,
  PaymentMethod,
  PaymentStatus,
  ReservationStatus,
  SeatType,
  TripStatus,
} from '@viaja/shared';
import { apiRequest } from '../../services/api';

export interface MobileReservationDetail {
  id: string;
  code: string;
  userId: string;
  tripId: string;
  status: ReservationStatus;
  totalPrice: number;
  expiresAt: string | null;
  createdAt: string;
  qrCodePayload: string;
  passenger: {
    id: string;
    name: string;
    email: string;
  };
  trip: {
    id: string;
    departureAt: string;
    arrivalAt: string;
    price: number;
    status: TripStatus;
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
  };
  seats: Array<{
    id: string;
    seatId: string;
    seatNumber: string;
    seatType: SeatType;
    price: number;
    isActive: boolean;
  }>;
  payment: {
    id: string;
    amount: number;
    method: PaymentMethod;
    status: PaymentStatus;
    transactionReference: string;
    createdAt: string;
  } | null;
}

export interface ProcessPaymentResponse {
  payment: {
    id: string;
    reservationId: string;
    amount: number;
    method: PaymentMethod;
    status: PaymentStatus;
    transactionReference: string;
    createdAt: string;
    pixCopyPaste?: string;
  };
  reservation: MobileReservationDetail;
}

export const reservationsApi = {
  async createReservation(input: CreateReservationInput): Promise<MobileReservationDetail> {
    const response = await apiRequest<{ reservation: MobileReservationDetail }>('/reservations', {
      method: 'POST',
      body: input,
    });
    return response.reservation;
  },

  processPayment(input: CreatePaymentInput): Promise<ProcessPaymentResponse> {
    return apiRequest<ProcessPaymentResponse>('/payments', {
      method: 'POST',
      body: input,
    });
  },

  async listMyReservations(): Promise<MobileReservationDetail[]> {
    const response = await apiRequest<{ reservations: MobileReservationDetail[] }>('/reservations');
    return response.reservations;
  },

  async getReservationById(id: string): Promise<MobileReservationDetail> {
    const response = await apiRequest<{ reservation: MobileReservationDetail }>(
      `/reservations/${id}`,
    );
    return response.reservation;
  },

  async cancelReservation(id: string): Promise<MobileReservationDetail> {
    const response = await apiRequest<{ reservation: MobileReservationDetail }>(
      `/reservations/${id}/cancel`,
      { method: 'POST' },
    );
    return response.reservation;
  },
};
