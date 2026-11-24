import { RESERVATION_EXPIRATION_MINUTES, USER_ROLES } from '@viaja/shared';

export const apiBootstrapInfo = {
  service: '@viaja/api',
  supportedRoles: USER_ROLES,
  reservationExpirationMinutes: RESERVATION_EXPIRATION_MINUTES,
} as const;
