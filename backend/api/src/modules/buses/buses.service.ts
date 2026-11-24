import type { CreateBusInput } from '@viaja/shared';
import { prisma } from '../../config/database.js';
import { AppError } from '../../utils/app-error.js';

export class BusesService {
  async listBuses() {
    const buses = await prisma.bus.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { seats: true, trips: true } },
      },
    });

    return buses.map((b) => ({
      id: b.id,
      name: b.name,
      plate: b.plate,
      seatCapacity: b.seatCapacity,
      createdAt: b.createdAt.toISOString(),
      seatsCount: b._count.seats,
      tripsCount: b._count.trips,
    }));
  }

  async getBusById(id: string) {
    const bus = await prisma.bus.findUnique({
      where: { id },
      include: {
        seats: { orderBy: { seatNumber: 'asc' } },
      },
    });

    if (!bus) {
      throw new AppError(404, 'BUS_NOT_FOUND', 'Ônibus não encontrado.');
    }

    return {
      id: bus.id,
      name: bus.name,
      plate: bus.plate,
      seatCapacity: bus.seatCapacity,
      createdAt: bus.createdAt.toISOString(),
      seats: bus.seats,
    };
  }

  async createBus(input: CreateBusInput) {
    const existingPlate = await prisma.bus.findUnique({
      where: { plate: input.plate },
    });

    if (existingPlate) {
      throw new AppError(
        409,
        'PLATE_ALREADY_EXISTS',
        'Já existe um ônibus cadastrado com esta placa.',
      );
    }

    const bus = await prisma.$transaction(async (tx) => {
      const created = await tx.bus.create({
        data: {
          name: input.name,
          plate: input.plate,
          seatCapacity: input.seatCapacity,
        },
      });

      const seatsData = Array.from({ length: input.seatCapacity }, (_, index) => ({
        busId: created.id,
        seatNumber: String(index + 1).padStart(2, '0'),
        seatType: input.defaultSeatType,
      }));

      await tx.seat.createMany({ data: seatsData });

      return tx.bus.findUniqueOrThrow({
        where: { id: created.id },
        include: { seats: { orderBy: { seatNumber: 'asc' } } },
      });
    });

    return {
      id: bus.id,
      name: bus.name,
      plate: bus.plate,
      seatCapacity: bus.seatCapacity,
      createdAt: bus.createdAt.toISOString(),
      seats: bus.seats,
    };
  }
}

export const busesService = new BusesService();
