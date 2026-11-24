import type { z } from 'zod';
import type {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  RESERVATION_STATUSES,
  SEAT_TYPES,
  TRIP_STATUSES,
  USER_ROLES,
} from '../constants/index.js';
import type {
  createBusSchema,
  createPaymentSchema,
  createReservationSchema,
  createRouteSchema,
  createTripSchema,
  listReservationsQuerySchema,
  listRoutesQuerySchema,
  listTripsQuerySchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  updateRouteSchema,
  updateTripSchema,
} from '../schemas/index.js';

export type UserRole = (typeof USER_ROLES)[number];
export type SeatType = (typeof SEAT_TYPES)[number];
export type TripStatus = (typeof TRIP_STATUSES)[number];
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type CreateRouteInput = z.infer<typeof createRouteSchema>;
export type UpdateRouteInput = z.infer<typeof updateRouteSchema>;
export type ListRoutesQuery = z.infer<typeof listRoutesQuerySchema>;
export type CreateBusInput = z.infer<typeof createBusSchema>;
export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripInput = z.infer<typeof updateTripSchema>;
export type ListTripsQuery = z.infer<typeof listTripsQuerySchema>;
export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type ListReservationsQuery = z.infer<typeof listReservationsQuerySchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export interface PublicUserDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthResponseDto {
  user: PublicUserDto;
  tokens: AuthTokensDto;
}

export interface SeatAvailabilityDto {
  id: string;
  seatNumber: string;
  seatType: SeatType;
  price: number;
  status: 'AVAILABLE' | 'OCCUPIED';
}

export interface DashboardSummaryDto {
  totalTrips: number;
  totalReservations: number;
  confirmedReservations: number;
  simulatedRevenue: number;
  occupancyRate: number;
  topTrips: Array<{
    tripId: string;
    origin: string;
    destination: string;
    departureAt: string;
    busName: string;
    seatCapacity: number;
    occupiedSeats: number;
    occupancyRate: number;
    revenue: number;
  }>;
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
