import { Prisma } from '@prisma/client';
import {
  RESERVATION_EXPIRATION_MINUTES,
  type CreateReservationInput,
  type ListReservationsQuery,
} from '@viaja/shared';
import { lockBusSeatsForUpdate, prisma, withCriticalTransaction } from '../../config/database.js';
import type { AuthenticatedUser } from '../../types/express.js';
import { expireOverduePendingReservations } from '../../services/reservation-expiration.service.js';
import { AppError } from '../../utils/app-error.js';
import { decimalToNumber, generateReservationCode } from '../../utils/serializers.js';
import { reservationInclude, type ReservationWithDetails } from './reservations.repository.js';

export function serializeReservation(reservation: ReservationWithDetails) {
  const seatNumbers = reservation.seats.map((rs) => rs.seat.seatNumber);

  return {
    id: reservation.id,
    code: reservation.code,
    userId: reservation.userId,
    tripId: reservation.tripId,
    status: reservation.status,
    totalPrice: decimalToNumber(reservation.totalPrice),
    expiresAt: reservation.expiresAt ? reservation.expiresAt.toISOString() : null,
    createdAt: reservation.createdAt.toISOString(),
    qrCodePayload: JSON.stringify({
      code: reservation.code,
      reservationId: reservation.id,
      tripId: reservation.tripId,
      seats: seatNumbers,
      passenger: reservation.user.name,
    }),
    passenger: {
      id: reservation.user.id,
      name: reservation.user.name,
      email: reservation.user.email,
    },
    trip: {
      id: reservation.trip.id,
      departureAt: reservation.trip.departureAt.toISOString(),
      arrivalAt: reservation.trip.arrivalAt.toISOString(),
      price: decimalToNumber(reservation.trip.price),
      status: reservation.trip.status,
      route: {
        id: reservation.trip.route.id,
        origin: reservation.trip.route.origin,
        destination: reservation.trip.route.destination,
        distance: decimalToNumber(reservation.trip.route.distance),
        estimatedDuration: reservation.trip.route.estimatedDuration,
      },
      bus: {
        id: reservation.trip.bus.id,
        name: reservation.trip.bus.name,
        plate: reservation.trip.bus.plate,
        seatCapacity: reservation.trip.bus.seatCapacity,
      },
    },
    seats: reservation.seats.map((rs) => ({
      id: rs.id,
      seatId: rs.seatId,
      seatNumber: rs.seat.seatNumber,
      seatType: rs.seat.seatType,
      price: decimalToNumber(rs.price),
      isActive: rs.isActive,
    })),
    payment: reservation.payment
      ? {
          id: reservation.payment.id,
          amount: decimalToNumber(reservation.payment.amount),
          method: reservation.payment.method,
          status: reservation.payment.status,
          transactionReference: reservation.payment.transactionReference,
          createdAt: reservation.payment.createdAt.toISOString(),
        }
      : null,
  };
}

export class ReservationsService {
  async createReservation(userId: string, input: CreateReservationInput) {
    try {
      const created = await withCriticalTransaction(async (tx) => {
        const trip = await tx.trip.findUnique({
          where: { id: input.tripId },
        });

        if (!trip) {
          throw new AppError(404, 'TRIP_NOT_FOUND', 'Viagem não encontrada.');
        }

        if (trip.status !== 'SCHEDULED' && trip.status !== 'BOARDING') {
          throw new AppError(
            409,
            'TRIP_NOT_AVAILABLE',
            'Esta viagem não está disponível para novas reservas.',
          );
        }

        if (trip.departureAt.getTime() <= Date.now()) {
          throw new AppError(
            409,
            'TRIP_ALREADY_DEPARTED',
            'Não é possível reservar assentos para uma viagem cujo horário de partida já passou.',
          );
        }

        // Release any expired PENDING seats on this trip first
        await expireOverduePendingReservations({ tx, tripId: trip.id });

        // Acquire row-level locks on the target seats in deterministic UUID order
        const lockedSeats = await lockBusSeatsForUpdate(tx, trip.busId, input.seatIds);
        if (lockedSeats.length !== input.seatIds.length) {
          throw new AppError(
            400,
            'INVALID_SEAT_SELECTION',
            'Um ou mais assentos informados não pertencem ao ônibus desta viagem.',
          );
        }

        // Verify none of the locked seats has an active reservation on this trip
        const alreadyActive = await tx.reservationSeat.findMany({
          where: {
            tripId: trip.id,
            seatId: { in: input.seatIds },
            isActive: true,
          },
          include: { seat: { select: { seatNumber: true } } },
        });

        if (alreadyActive.length > 0) {
          throw new AppError(
            409,
            'SEAT_ALREADY_RESERVED',
            'Um ou mais assentos selecionados acabaram de ser reservados por outro passageiro.',
            {
              unavailableSeatIds: alreadyActive.map((a) => a.seatId),
              unavailableSeatNumbers: alreadyActive.map((a) => a.seat.seatNumber),
            },
          );
        }

        const unitPrice = decimalToNumber(trip.price);
        const totalPrice = Number((unitPrice * input.seatIds.length).toFixed(2));
        const expiresAt = new Date(Date.now() + RESERVATION_EXPIRATION_MINUTES * 60 * 1000);

        let code = generateReservationCode();
        const codeCollision = await tx.reservation.findUnique({ where: { code } });
        if (codeCollision) {
          code = generateReservationCode();
        }

        return tx.reservation.create({
          data: {
            code,
            userId,
            tripId: trip.id,
            status: 'PENDING',
            totalPrice,
            expiresAt,
            seats: {
              create: input.seatIds.map((seatId) => ({
                tripId: trip.id,
                seatId,
                price: unitPrice,
                isActive: true,
              })),
            },
          },
          include: reservationInclude,
        });
      });

      return serializeReservation(created);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError(
          409,
          'SEAT_ALREADY_RESERVED',
          'Conflito de concorrência: um dos assentos selecionados já possui reserva ativa.',
        );
      }
      throw error;
    }
  }

  async listReservations(actor: AuthenticatedUser, query: ListReservationsQuery) {
    await expireOverduePendingReservations();

    const reservations = await prisma.reservation.findMany({
      where: {
        ...(actor.role !== 'ADMIN' ? { userId: actor.id } : {}),
        ...(query.tripId ? { tripId: query.tripId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.code ? { code: { contains: query.code, mode: 'insensitive' } } : {}),
      },
      include: reservationInclude,
      orderBy: { createdAt: 'desc' },
    });

    return reservations.map(serializeReservation);
  }

  async getReservationById(id: string, actor: AuthenticatedUser) {
    await expireOverduePendingReservations();

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: reservationInclude,
    });

    if (!reservation) {
      throw new AppError(404, 'RESERVATION_NOT_FOUND', 'Reserva não encontrada.');
    }

    if (actor.role !== 'ADMIN' && reservation.userId !== actor.id) {
      throw new AppError(403, 'FORBIDDEN', 'Você não tem permissão para visualizar esta reserva.');
    }

    return serializeReservation(reservation);
  }

  async cancelReservation(id: string, actor: AuthenticatedUser) {
    const cancelled = await withCriticalTransaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id },
        include: {
          trip: true,
          payment: true,
        },
      });

      if (!reservation) {
        throw new AppError(404, 'RESERVATION_NOT_FOUND', 'Reserva não encontrada.');
      }

      if (actor.role !== 'ADMIN' && reservation.userId !== actor.id) {
        throw new AppError(403, 'FORBIDDEN', 'Você não tem permissão para cancelar esta reserva.');
      }

      if (reservation.status === 'CANCELLED' || reservation.status === 'EXPIRED') {
        throw new AppError(
          409,
          'RESERVATION_ALREADY_INACTIVE',
          `Esta reserva já se encontra com status ${reservation.status}.`,
        );
      }

      if (reservation.trip.status === 'COMPLETED') {
        throw new AppError(
          409,
          'TRIP_ALREADY_COMPLETED',
          'Não é possível cancelar uma reserva de viagem já concluída.',
        );
      }

      // Passengers cannot cancel after departure; ADMIN retains administrative override before COMPLETED
      if (actor.role !== 'ADMIN' && reservation.trip.departureAt.getTime() <= Date.now()) {
        throw new AppError(
          409,
          'CANCELLATION_WINDOW_CLOSED',
          'O prazo para cancelamento pelo passageiro encerrou-se no horário de partida.',
        );
      }

      await tx.reservationSeat.updateMany({
        where: { reservationId: id },
        data: { isActive: false },
      });

      if (reservation.payment) {
        const nextPaymentStatus =
          reservation.payment.status === 'APPROVED' ? 'REFUNDED' : 'REJECTED';
        await tx.payment.update({
          where: { id: reservation.payment.id },
          data: { status: nextPaymentStatus },
        });
      }

      return tx.reservation.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          expiresAt: null,
        },
        include: reservationInclude,
      });
    });

    return serializeReservation(cancelled);
  }
}

export const reservationsService = new ReservationsService();
