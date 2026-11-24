import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';

/**
 * Releases seats held by PENDING reservations whose expiration window has elapsed.
 * Can run inside an existing Prisma transaction (`tx`) or standalone.
 */
export async function expireOverduePendingReservations(
  options: {
    tx?: Prisma.TransactionClient;
    tripId?: string;
  } = {},
): Promise<number> {
  const client = options.tx ?? prisma;
  const now = new Date();

  const expiredReservations = await client.reservation.findMany({
    where: {
      status: 'PENDING',
      expiresAt: { lt: now },
      ...(options.tripId ? { tripId: options.tripId } : {}),
    },
    select: { id: true },
  });

  if (expiredReservations.length === 0) {
    return 0;
  }

  const expiredIds = expiredReservations.map((r) => r.id);

  await client.reservationSeat.updateMany({
    where: {
      reservationId: { in: expiredIds },
      isActive: true,
    },
    data: { isActive: false },
  });

  await client.reservation.updateMany({
    where: {
      id: { in: expiredIds },
      status: 'PENDING',
    },
    data: { status: 'EXPIRED' },
  });

  await client.payment.updateMany({
    where: {
      reservationId: { in: expiredIds },
      status: 'PENDING',
    },
    data: { status: 'REJECTED' },
  });

  return expiredIds.length;
}
