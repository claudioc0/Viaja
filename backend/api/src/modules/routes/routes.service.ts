import type { Route } from '@prisma/client';
import type { CreateRouteInput, ListRoutesQuery, UpdateRouteInput } from '@viaja/shared';
import { prisma } from '../../config/database.js';
import { AppError } from '../../utils/app-error.js';
import { decimalToNumber } from '../../utils/serializers.js';

function serializeRoute(route: Route & { _count?: { trips: number } }) {
  return {
    id: route.id,
    origin: route.origin,
    destination: route.destination,
    distance: decimalToNumber(route.distance),
    estimatedDuration: route.estimatedDuration,
    ...(route._count ? { tripsCount: route._count.trips } : {}),
  };
}

export class RoutesService {
  async listRoutes(filters: ListRoutesQuery) {
    const routes = await prisma.route.findMany({
      where: {
        ...(filters.origin ? { origin: { contains: filters.origin, mode: 'insensitive' } } : {}),
        ...(filters.destination
          ? { destination: { contains: filters.destination, mode: 'insensitive' } }
          : {}),
      },
      include: { _count: { select: { trips: true } } },
      orderBy: [{ origin: 'asc' }, { destination: 'asc' }],
    });

    return routes.map(serializeRoute);
  }

  async getRouteById(id: string) {
    const route = await prisma.route.findUnique({
      where: { id },
      include: { _count: { select: { trips: true } } },
    });

    if (!route) {
      throw new AppError(404, 'ROUTE_NOT_FOUND', 'Rota não encontrada.');
    }

    return serializeRoute(route);
  }

  async createRoute(input: CreateRouteInput) {
    const duplicate = await prisma.route.findFirst({
      where: {
        origin: { equals: input.origin, mode: 'insensitive' },
        destination: { equals: input.destination, mode: 'insensitive' },
      },
    });

    if (duplicate) {
      throw new AppError(
        409,
        'ROUTE_ALREADY_EXISTS',
        'Já existe uma rota cadastrada para esta origem e destino.',
      );
    }

    const created = await prisma.route.create({
      data: {
        origin: input.origin,
        destination: input.destination,
        distance: input.distance,
        estimatedDuration: input.estimatedDuration,
      },
    });

    return serializeRoute(created);
  }

  async updateRoute(id: string, input: UpdateRouteInput) {
    const existing = await prisma.route.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, 'ROUTE_NOT_FOUND', 'Rota não encontrada.');
    }

    const nextOrigin = input.origin ?? existing.origin;
    const nextDestination = input.destination ?? existing.destination;

    if (nextOrigin.toLowerCase() === nextDestination.toLowerCase()) {
      throw new AppError(
        400,
        'INVALID_ROUTE_ENDPOINTS',
        'A origem e o destino da rota devem ser diferentes.',
      );
    }

    const updated = await prisma.route.update({
      where: { id },
      data: {
        ...(input.origin !== undefined ? { origin: input.origin } : {}),
        ...(input.destination !== undefined ? { destination: input.destination } : {}),
        ...(input.distance !== undefined ? { distance: input.distance } : {}),
        ...(input.estimatedDuration !== undefined
          ? { estimatedDuration: input.estimatedDuration }
          : {}),
      },
    });

    return serializeRoute(updated);
  }

  async deleteRoute(id: string): Promise<void> {
    const existing = await prisma.route.findUnique({
      where: { id },
      include: { _count: { select: { trips: true } } },
    });

    if (!existing) {
      throw new AppError(404, 'ROUTE_NOT_FOUND', 'Rota não encontrada.');
    }

    if (existing._count.trips > 0) {
      throw new AppError(
        409,
        'ROUTE_HAS_LINKED_TRIPS',
        'Não é possível excluir uma rota que já possui viagens vinculadas.',
      );
    }

    await prisma.route.delete({ where: { id } });
  }
}

export const routesService = new RoutesService();
