import type { DashboardSummaryDto } from '@viaja/shared';
import { prisma } from '../../config/database.js';
import { expireOverduePendingReservations } from '../../services/reservation-expiration.service.js';
import { decimalToNumber } from '../../utils/serializers.js';

export class DashboardService {
  async getSummary(): Promise<DashboardSummaryDto> {
    await expireOverduePendingReservations();

    const [totalTrips, totalReservations, confirmedReservations, approvedRevenueAgg, trips] =
      await Promise.all([
        prisma.trip.count(),
        prisma.reservation.count(),
        prisma.reservation.count({ where: { status: 'CONFIRMED' } }),
        prisma.payment.aggregate({
          where: { status: 'APPROVED' },
          _sum: { amount: true },
        }),
        prisma.trip.findMany({
          where: { status: { not: 'CANCELLED' } },
          include: {
            route: true,
            bus: true,
            reservationSeats: {
              where: { isActive: true },
              select: { id: true, price: true },
            },
            reservations: {
              where: { status: 'CONFIRMED' },
              select: { totalPrice: true },
            },
          },
        }),
      ]);

    let totalCapacity = 0;
    let totalOccupied = 0;

    const tripStats = trips.map((t) => {
      const occupied = t.reservationSeats.length;
      const cap = t.bus.seatCapacity;
      totalCapacity += cap;
      totalOccupied += occupied;

      const tripRevenue = t.reservations.reduce((sum, r) => sum + decimalToNumber(r.totalPrice), 0);

      return {
        tripId: t.id,
        origin: t.route.origin,
        destination: t.route.destination,
        departureAt: t.departureAt.toISOString(),
        busName: t.bus.name,
        seatCapacity: cap,
        occupiedSeats: occupied,
        occupancyRate: cap > 0 ? Number(((occupied / cap) * 100).toFixed(1)) : 0,
        revenue: Number(tripRevenue.toFixed(2)),
      };
    });

    tripStats.sort((a, b) => b.occupiedSeats - a.occupiedSeats || b.revenue - a.revenue);

    const occupancyRate =
      totalCapacity > 0 ? Number(((totalOccupied / totalCapacity) * 100).toFixed(1)) : 0;

    return {
      totalTrips,
      totalReservations,
      confirmedReservations,
      simulatedRevenue: decimalToNumber(approvedRevenueAgg._sum.amount ?? 0),
      occupancyRate,
      topTrips: tripStats.slice(0, 5),
    };
  }
}

export const dashboardService = new DashboardService();
