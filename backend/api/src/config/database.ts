import { Prisma, PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Executes a critical database operation inside an interactive transaction
 * with explicit timeout configuration suitable for concurrent seat booking.
 */
export async function withCriticalTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(operation, {
    isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    maxWait: 5000,
    timeout: 10000,
  });
}

/**
 * Acquires row-level pessimistic locks (`FOR UPDATE`) on requested seats
 * sorted deterministically by ID to prevent deadlocks across concurrent requests.
 */
export async function lockBusSeatsForUpdate(
  tx: Prisma.TransactionClient,
  busId: string,
  seatIds: readonly string[],
): Promise<Array<{ id: string; seatNumber: string }>> {
  if (seatIds.length === 0) {
    return [];
  }

  const orderedIds = [...new Set(seatIds)].sort();

  return tx.$queryRaw<Array<{ id: string; seatNumber: string }>>`
    SELECT "id", "seat_number" AS "seatNumber"
    FROM "seats"
    WHERE "bus_id" = ${busId}::uuid
      AND "id" IN (${Prisma.join(orderedIds.map((id) => Prisma.sql`${id}::uuid`))})
    ORDER BY "id" ASC
    FOR UPDATE
  `;
}
