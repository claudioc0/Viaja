import type { Prisma } from '@prisma/client';
import type {
  CreateTripInput,
  ListTripsQuery,
  SeatAvailabilityDto,
  UpdateTripInput,
} from '@viaja/shared';
import { prisma } from '../../config/database.js';
import { expireOverduePendingReservations } from '../../services/reservation-expiration.service.js';
import { AppError } from '../../utils/app-error.js';
import { decimalToNumber } from '../../utils/serializers.js';

const tripInclude = {
  route: true,
  bus: true,
  _count: {
    select: {
      reservationSeats: {
        where: { isActive: true },
      },
    },
  },
} satisfies Prisma.TripInclude;

type TripWithRelations = Prisma.TripGetPayload<{ include: typeof tripInclude }>;

function serializeTrip(trip: TripWithRelations) {
  const occupiedSeats = trip._count.reservationSeats;
  const availableSeats = Math.max(0, trip.bus.seatCapacity - occupiedSeats);
  const durationMinutes = Math.round(
    (trip.arrivalAt.getTime() - trip.departureAt.getTime()) / (60 * 1000),
  );

  return {
    id: trip.id,
    routeId: trip.routeId,
    busId: trip.busId,
    departureAt: trip.departureAt.toISOString(),
    arrivalAt: trip.arrivalAt.toISOString(),
    durationMinutes,
    price: decimalToNumber(trip.price),
    status: trip.status,
    availableSeats,
    occupiedSeats,
    route: {
      id: trip.route.id,
      origin: trip.route.origin,
      destination: trip.route.destination,
      distance: decimalToNumber(trip.route.distance),
      estimatedDuration: trip.route.estimatedDuration,
    },
    bus: {
      id: trip.bus.id,
      name: trip.bus.name,
      plate: trip.bus.plate,
      seatCapacity: trip.bus.seatCapacity,
    },
  };
}

function toMinutesOfDay(hhmm: string): number {
  const [hours = '0', minutes = '0'] = hhmm.split(':');
  return Number(hours) * 60 + Number(minutes);
}

export class TripsService {
  async listTrips(filters: ListTripsQuery) {
    await expireOverduePendingReservations();

    let departureAtFilter: Prisma.DateTimeFilter | undefined;
    if (filters.date) {
      departureAtFilter = {
        gte: new Date(`${filters.date}T00:00:00.000Z`),
        lte: new Date(`${filters.date}T23:59:59.999Z`),
      };
    }

    let priceFilter: Prisma.DecimalFilter | undefined;
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      priceFilter = {
        ...(filters.minPrice !== undefined ? { gte: filters.minPrice } : {}),
        ...(filters.maxPrice !== undefined ? { lte: filters.maxPrice } : {}),
      };
    }

    const trips = await prisma.trip.findMany({
      where: {
        ...(departureAtFilter ? { departureAt: departureAtFilter } : {}),
        ...(priceFilter ? { price: priceFilter } : {}),
        ...(filters.onlyAvailable ? { status: 'SCHEDULED' } : {}),
        route: {
          ...(filters.origin ? { origin: { contains: filters.origin, mode: 'insensitive' } } : {}),
          ...(filters.destination
            ? { destination: { contains: filters.destination, mode: 'insensitive' } }
            : {}),
        },
      },
      include: tripInclude,
      orderBy: { departureAt: 'asc' },
    });

    let serialized = trips.map(serializeTrip);

    if (filters.minTime || filters.maxTime) {
      const minMinutes = filters.minTime ? toMinutesOfDay(filters.minTime) : 0;
      const maxMinutes = filters.maxTime ? toMinutesOfDay(filters.maxTime) : 23 * 60 + 59;

      serialized = serialized.filter((t) => {
        const dt = new Date(t.departureAt);
        const currentMinutes = dt.getUTCHours() * 60 + dt.getUTCMinutes();
        return currentMinutes >= minMinutes && currentMinutes <= maxMinutes;
      });
    }

    if (filters.onlyAvailable) {
      serialized = serialized.filter((t) => t.availableSeats > 0);
    }

    if (filters.sortBy === 'price_asc') {
      serialized.sort((a, b) => a.price - b.price);
    } else if (filters.sortBy === 'duration_asc') {
      serialized.sort((a, b) => a.durationMinutes - b.durationMinutes);
    } else if (filters.sortBy === 'departure_asc') {
      serialized.sort(
        (a, b) => new Date(a.departureAt).getTime() - new Date(b.departureAt).getTime(),
      );
    }

    return serialized;
  }

  async getTripById(id: string) {
    await expireOverduePendingReservations({ tripId: id });

    const trip = await prisma.trip.findUnique({
      where: { id },
      include: tripInclude,
    });

    if (!trip) {
      throw new AppError(404, 'TRIP_NOT_FOUND', 'Viagem não encontrada.');
    }

    return serializeTrip(trip);
  }

  async getTripSeats(tripId: string): Promise<{
    tripId: string;
    busId: string;
    seatCapacity: number;
    availableCount: number;
    occupiedCount: number;
    seats: SeatAvailabilityDto[];
  }> {
    await expireOverduePendingReservations({ tripId });

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        bus: {
          include: {
            seats: { orderBy: { seatNumber: 'asc' } },
          },
        },
        reservationSeats: {
          where: { isActive: true },
          select: { seatId: true },
        },
      },
    });

    if (!trip) {
      throw new AppError(404, 'TRIP_NOT_FOUND', 'Viagem não encontrada.');
    }

    const occupiedSet = new Set(trip.reservationSeats.map((rs) => rs.seatId));
    const unitPrice = decimalToNumber(trip.price);

    const seats: SeatAvailabilityDto[] = trip.bus.seats.map((seat) => ({
      id: seat.id,
      seatNumber: seat.seatNumber,
      seatType: seat.seatType,
      price: unitPrice,
      status: occupiedSet.has(seat.id) ? 'OCCUPIED' : 'AVAILABLE',
    }));

    const occupiedCount = occupiedSet.size;
    return {
      tripId: trip.id,
      busId: trip.busId,
      seatCapacity: trip.bus.seatCapacity,
      availableCount: Math.max(0, seats.length - occupiedCount),
      occupiedCount,
      seats,
    };
  }

  async createTrip(input: CreateTripInput) {
    const [route, bus] = await Promise.all([
      prisma.route.findUnique({ where: { id: input.routeId } }),
      prisma.bus.findUnique({ where: { id: input.busId } }),
    ]);

    if (!route) {
      throw new AppError(404, 'ROUTE_NOT_FOUND', 'A rota informada não existe.');
    }
    if (!bus) {
      throw new AppError(404, 'BUS_NOT_FOUND', 'O ônibus informado não existe.');
    }

    const created = await prisma.trip.create({
      data: {
        routeId: input.routeId,
        busId: input.busId,
        departureAt: new Date(input.departureAt),
        arrivalAt: new Date(input.arrivalAt),
        price: input.price,
        status: input.status ?? 'SCHEDULED',
      },
      include: tripInclude,
    });

    return serializeTrip(created);
  }

  async updateTrip(id: string, input: UpdateTripInput) {
    const existing = await prisma.trip.findUnique({
      where: { id },
      include: {
        _count: { select: { reservationSeats: { where: { isActive: true } } } },
      },
    });

    if (!existing) {
      throw new AppError(404, 'TRIP_NOT_FOUND', 'Viagem não encontrada.');
    }

    if (input.busId && input.busId !== existing.busId && existing._count.reservationSeats > 0) {
      throw new AppError(
        409,
        'TRIP_HAS_ACTIVE_RESERVATIONS',
        'Não é permitido trocar o ônibus de uma viagem que já possui reservas ativas.',
      );
    }

    const nextDeparture = input.departureAt ? new Date(input.departureAt) : existing.departureAt;
    const nextArrival = input.arrivalAt ? new Date(input.arrivalAt) : existing.arrivalAt;

    if (nextArrival.getTime() <= nextDeparture.getTime()) {
      throw new AppError(
        400,
        'INVALID_TRIP_SCHEDULE',
        'O horário de chegada deve ser posterior ao horário de partida.',
      );
    }

    const updated = await prisma.trip.update({
      where: { id },
      data: {
        ...(input.routeId !== undefined ? { routeId: input.routeId } : {}),
        ...(input.busId !== undefined ? { busId: input.busId } : {}),
        ...(input.departureAt !== undefined ? { departureAt: nextDeparture } : {}),
        ...(input.arrivalAt !== undefined ? { arrivalAt: nextArrival } : {}),
        ...(input.price !== undefined ? { price: input.price } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
      include: tripInclude,
    });

    return serializeTrip(updated);
  }

  async deleteTrip(id: string): Promise<void> {
    const existing = await prisma.trip.findUnique({
      where: { id },
      include: { _count: { select: { reservations: true } } },
    });

    if (!existing) {
      throw new AppError(404, 'TRIP_NOT_FOUND', 'Viagem não encontrada.');
    }

    if (existing._count.reservations > 0) {
      throw new AppError(
        409,
        'TRIP_HAS_RESERVATIONS',
        'Não é possível excluir fisicamente uma viagem com reservas registradas. Altere o status para CANCELLED.',
      );
    }

    await prisma.trip.delete({ where: { id } });
  }
}

export const tripsService = new TripsService();
