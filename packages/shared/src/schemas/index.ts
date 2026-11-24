import { z } from 'zod';
import {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  RESERVATION_STATUSES,
  SEAT_TYPES,
  TRIP_STATUSES,
  USER_ROLES,
} from '../constants/index.js';

export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().trim().toLowerCase().email();

export const userRoleSchema = z.enum(USER_ROLES);
export const seatTypeSchema = z.enum(SEAT_TYPES);
export const tripStatusSchema = z.enum(TRIP_STATUSES);
export const reservationStatusSchema = z.enum(RESERVATION_STATUSES);
export const paymentMethodSchema = z.enum(PAYMENT_METHODS);
export const paymentStatusSchema = z.enum(PAYMENT_STATUSES);
