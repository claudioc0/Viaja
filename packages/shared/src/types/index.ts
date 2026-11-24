import type {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  RESERVATION_STATUSES,
  SEAT_TYPES,
  TRIP_STATUSES,
  USER_ROLES,
} from '../constants/index.js';

export type UserRole = (typeof USER_ROLES)[number];
export type SeatType = (typeof SEAT_TYPES)[number];
export type TripStatus = (typeof TRIP_STATUSES)[number];
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
