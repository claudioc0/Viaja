import { z } from 'zod';
import {
  MAX_SEATS_PER_RESERVATION,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  RESERVATION_STATUSES,
  SEAT_TYPES,
  TRIP_STATUSES,
  USER_ROLES,
} from '../constants/index.js';

export const uuidSchema = z.string().uuid('Identificador inválido.');
export const emailSchema = z.string().trim().toLowerCase().email('E-mail inválido.');

export const userRoleSchema = z.enum(USER_ROLES);
export const seatTypeSchema = z.enum(SEAT_TYPES);
export const tripStatusSchema = z.enum(TRIP_STATUSES);
export const reservationStatusSchema = z.enum(RESERVATION_STATUSES);
export const paymentMethodSchema = z.enum(PAYMENT_METHODS);
export const paymentStatusSchema = z.enum(PAYMENT_STATUSES);

// Auth Schemas
export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome completo.').max(120),
  email: emailSchema,
  password: z
    .string()
    .min(6, 'A senha deve possuir no mínimo 6 caracteres.')
    .max(72, 'A senha deve possuir no máximo 72 caracteres.'),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Informe sua senha.'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token é obrigatório.'),
});

// Route Schemas
export const createRouteSchema = z
  .object({
    origin: z.string().trim().min(2, 'Informe a cidade de origem.').max(120),
    destination: z.string().trim().min(2, 'Informe a cidade de destino.').max(120),
    distance: z.coerce.number().positive('A distância deve ser maior que zero.'),
    estimatedDuration: z.coerce
      .number()
      .int()
      .positive('A duração estimada (em minutos) deve ser maior que zero.'),
  })
  .refine((data) => data.origin.toLowerCase() !== data.destination.toLowerCase(), {
    message: 'A origem e o destino devem ser diferentes.',
    path: ['destination'],
  });

export const updateRouteSchema = z
  .object({
    origin: z.string().trim().min(2).max(120).optional(),
    destination: z.string().trim().min(2).max(120).optional(),
    distance: z.coerce.number().positive().optional(),
    estimatedDuration: z.coerce.number().int().positive().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo para atualização.',
  });

export const listRoutesQuerySchema = z.object({
  origin: z.string().trim().optional(),
  destination: z.string().trim().optional(),
});

// Bus Schemas
export const createBusSchema = z.object({
  name: z.string().trim().min(2).max(100),
  plate: z.string().trim().toUpperCase().min(7, 'Placa inválida.').max(10, 'Placa inválida.'),
  seatCapacity: z.coerce.number().int().min(4).max(64),
  defaultSeatType: seatTypeSchema.default('EXECUTIVE'),
});

// Trip Schemas
export const createTripSchema = z
  .object({
    routeId: uuidSchema,
    busId: uuidSchema,
    departureAt: z.string().datetime({ message: 'Data/hora de partida inválida (ISO 8601).' }),
    arrivalAt: z.string().datetime({ message: 'Data/hora de chegada inválida (ISO 8601).' }),
    price: z.coerce.number().nonnegative('O preço não pode ser negativo.'),
    status: tripStatusSchema.optional().default('SCHEDULED'),
  })
  .refine((data) => new Date(data.arrivalAt).getTime() > new Date(data.departureAt).getTime(), {
    message: 'O horário de chegada deve ser posterior ao horário de partida.',
    path: ['arrivalAt'],
  });

export const updateTripSchema = z
  .object({
    routeId: uuidSchema.optional(),
    busId: uuidSchema.optional(),
    departureAt: z.string().datetime().optional(),
    arrivalAt: z.string().datetime().optional(),
    price: z.coerce.number().nonnegative().optional(),
    status: tripStatusSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo para atualização.',
  });

export const listTripsQuerySchema = z.object({
  origin: z.string().trim().optional(),
  destination: z.string().trim().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD')
    .optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  minTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Formato esperado: HH:MM')
    .optional(),
  maxTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Formato esperado: HH:MM')
    .optional(),
  onlyAvailable: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((val) => val === true || val === 'true')
    .optional(),
  sortBy: z.enum(['price_asc', 'duration_asc', 'departure_asc']).optional(),
});

// Reservation Schemas
export const createReservationSchema = z.object({
  tripId: uuidSchema,
  seatIds: z
    .array(uuidSchema)
    .min(1, 'Selecione ao menos um assento.')
    .max(
      MAX_SEATS_PER_RESERVATION,
      `É permitido selecionar no máximo ${MAX_SEATS_PER_RESERVATION} assentos por reserva.`,
    )
    .refine((ids) => new Set(ids).size === ids.length, {
      message: 'Não envie assentos repetidos na mesma solicitação.',
    }),
});

export const listReservationsQuerySchema = z.object({
  tripId: uuidSchema.optional(),
  status: reservationStatusSchema.optional(),
  code: z.string().trim().optional(),
});

// Payment Schemas
export const createPaymentSchema = z.object({
  reservationId: uuidSchema,
  method: paymentMethodSchema,
  simulateOutcome: z.enum(['APPROVED', 'REJECTED', 'PENDING']).optional().default('APPROVED'),
  cardLastFour: z
    .string()
    .regex(/^\d{4}$/, 'Informe os 4 últimos dígitos do cartão.')
    .optional(),
});
