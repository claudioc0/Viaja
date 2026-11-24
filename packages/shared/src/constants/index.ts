export const USER_ROLES = ['PASSENGER', 'ADMIN'] as const;
export const SEAT_TYPES = ['CONVENTIONAL', 'EXECUTIVE', 'SEMI_SLEEPER', 'SLEEPER'] as const;
export const TRIP_STATUSES = [
  'SCHEDULED',
  'BOARDING',
  'IN_TRANSIT',
  'COMPLETED',
  'CANCELLED',
] as const;
export const RESERVATION_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED'] as const;
export const PAYMENT_METHODS = ['PIX', 'CREDIT_CARD'] as const;
export const PAYMENT_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'REFUNDED'] as const;

export const MAX_SEATS_PER_RESERVATION = 4;
export const RESERVATION_EXPIRATION_MINUTES = 15;
