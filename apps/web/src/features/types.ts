import type {
  PaymentMethod,
  PaymentStatus,
  ReservationStatus,
  SeatAvailabilityDto,
  SeatType,
  TripStatus,
} from '@viaja/shared';

export interface RouteDto {
  id: string;
  origin: string;
  destination: string;
  distance: number;
  estimatedDuration: number;
  tripsCount?: number;
}

export interface BusDto {
  id: string;
  name: string;
  plate: string;
  seatCapacity: number;
  createdAt: string;
  seatsCount?: number;
  tripsCount?: number;
}

export interface TripDto {
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
  route: RouteDto;
  bus: BusDto;
}

export interface TripSeatsDto {
  tripId: string;
  busId: string;
  seatCapacity: number;
  availableCount: number;
  occupiedCount: number;
  seats: SeatAvailabilityDto[];
}

export interface ReservationDto {
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
    route: RouteDto;
    bus: BusDto;
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
