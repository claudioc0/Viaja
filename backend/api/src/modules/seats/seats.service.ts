import { prisma } from '../../config/database.js';
import { AppError } from '../../utils/app-error.js';

export class SeatsService {
  async listSeatsByBus(busId: string) {
    const bus = await prisma.bus.findUnique({ where: { id: busId } });
    if (!bus) {
      throw new AppError(404, 'BUS_NOT_FOUND', 'Ônibus não encontrado.');
    }

    return prisma.seat.findMany({
      where: { busId },
      orderBy: { seatNumber: 'asc' },
    });
  }
}

export const seatsService = new SeatsService();
