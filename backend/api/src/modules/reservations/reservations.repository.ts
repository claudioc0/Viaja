import type { Prisma } from '@prisma/client';

export const reservationInclude = {
  user: true,
  trip: {
    include: {
      route: true,
      bus: true,
    },
  },
  seats: {
    include: {
      seat: true,
    },
    orderBy: {
      seat: {
        seatNumber: 'asc',
      },
    },
  },
  payment: true,
} satisfies Prisma.ReservationInclude;

export type ReservationWithDetails = Prisma.ReservationGetPayload<{
  include: typeof reservationInclude;
}>;
