import { describe, expect, it } from 'vitest';
import {
  createPaymentSchema,
  createReservationSchema,
  createRouteSchema,
  createTripSchema,
  listTripsQuerySchema,
  registerSchema,
} from '../schemas/index.js';

describe('@viaja/shared Zod validation schemas', () => {
  it('normalizes email to lowercase and trims name on registerSchema', () => {
    const parsed = registerSchema.parse({
      name: '  Claudio Silva  ',
      email: '  CLAUDIO@VIAJA.APP ',
      password: 'Password123',
    });

    expect(parsed.name).toBe('Claudio Silva');
    expect(parsed.email).toBe('claudio@viaja.app');
  });

  it('rejects routes where origin and destination are identical (case-insensitive)', () => {
    const result = createRouteSchema.safeParse({
      origin: 'Curitiba, PR',
      destination: 'curitiba, pr',
      distance: 100,
      estimatedDuration: 90,
    });

    expect(result.success).toBe(false);
  });

  it('rejects trips when arrivalAt is earlier than or equal to departureAt', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';
    const result = createTripSchema.safeParse({
      routeId: validUuid,
      busId: validUuid,
      departureAt: '2026-12-10T14:00:00.000Z',
      arrivalAt: '2026-12-10T12:00:00.000Z',
      price: 120,
    });

    expect(result.success).toBe(false);
  });

  it('enforces seat limits (1..4) and rejects duplicate seatIds in createReservationSchema', () => {
    const tripId = '550e8400-e29b-41d4-a716-446655440000';
    const seatA = '550e8400-e29b-41d4-a716-446655440001';
    const seatB = '550e8400-e29b-41d4-a716-446655440002';
    const seatC = '550e8400-e29b-41d4-a716-446655440003';
    const seatD = '550e8400-e29b-41d4-a716-446655440004';
    const seatE = '550e8400-e29b-41d4-a716-446655440005';

    expect(createReservationSchema.safeParse({ tripId, seatIds: [] }).success).toBe(false);
    expect(createReservationSchema.safeParse({ tripId, seatIds: [seatA, seatA] }).success).toBe(
      false,
    );
    expect(
      createReservationSchema.safeParse({
        tripId,
        seatIds: [seatA, seatB, seatC, seatD, seatE],
      }).success,
    ).toBe(false);

    expect(createReservationSchema.safeParse({ tripId, seatIds: [seatA, seatB] }).success).toBe(
      true,
    );
  });

  it('transforms string query params properly in listTripsQuerySchema and defaults payment outcome', () => {
    const query = listTripsQuerySchema.parse({
      origin: 'São Paulo',
      minPrice: '100',
      onlyAvailable: 'true',
      sortBy: 'price_asc',
    });

    expect(query.minPrice).toBe(100);
    expect(query.onlyAvailable).toBe(true);

    const payment = createPaymentSchema.parse({
      reservationId: '550e8400-e29b-41d4-a716-446655440000',
      method: 'PIX',
    });
    expect(payment.simulateOutcome).toBe('APPROVED');
  });
});
