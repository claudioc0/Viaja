import type { CreatePaymentInput } from '@viaja/shared';
import { prisma, withCriticalTransaction } from '../../config/database.js';
import type { AuthenticatedUser } from '../../types/express.js';
import { AppError } from '../../utils/app-error.js';
import { decimalToNumber, generateTransactionReference } from '../../utils/serializers.js';
import { reservationInclude } from '../reservations/reservations.repository.js';
import { serializeReservation } from '../reservations/reservations.service.js';

export class PaymentsService {
  async processSimulatedPayment(actor: AuthenticatedUser, input: CreatePaymentInput) {
    const result = await withCriticalTransaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id: input.reservationId },
        include: { payment: true },
      });

      if (!reservation) {
        throw new AppError(404, 'RESERVATION_NOT_FOUND', 'Reserva não encontrada.');
      }

      if (actor.role !== 'ADMIN' && reservation.userId !== actor.id) {
        throw new AppError(
          403,
          'FORBIDDEN',
          'Você não tem permissão para realizar pagamento desta reserva.',
        );
      }

      if (reservation.status === 'CONFIRMED' && reservation.payment?.status === 'APPROVED') {
        throw new AppError(
          409,
          'RESERVATION_ALREADY_PAID',
          'Esta reserva já está paga e confirmada.',
        );
      }

      if (reservation.status === 'CANCELLED' || reservation.status === 'EXPIRED') {
        throw new AppError(
          409,
          'RESERVATION_INACTIVE',
          `Não é possível pagar uma reserva com status ${reservation.status}.`,
        );
      }

      // Check expiration window before accepting payment
      if (reservation.expiresAt && reservation.expiresAt.getTime() < Date.now()) {
        await tx.reservationSeat.updateMany({
          where: { reservationId: reservation.id },
          data: { isActive: false },
        });
        await tx.reservation.update({
          where: { id: reservation.id },
          data: { status: 'EXPIRED' },
        });
        throw new AppError(
          409,
          'RESERVATION_EXPIRED',
          'O prazo para pagamento desta reserva expirou e os assentos foram liberados.',
        );
      }

      const outcome = input.simulateOutcome ?? 'APPROVED';
      const transactionReference = generateTransactionReference(input.method);

      const payment = await tx.payment.upsert({
        where: { reservationId: reservation.id },
        update: {
          amount: reservation.totalPrice,
          method: input.method,
          status: outcome,
          transactionReference,
        },
        create: {
          reservationId: reservation.id,
          amount: reservation.totalPrice,
          method: input.method,
          status: outcome,
          transactionReference,
        },
      });

      if (outcome === 'APPROVED') {
        await tx.reservation.update({
          where: { id: reservation.id },
          data: {
            status: 'CONFIRMED',
            expiresAt: null,
          },
        });
      } else if (outcome === 'REJECTED') {
        await tx.reservationSeat.updateMany({
          where: { reservationId: reservation.id },
          data: { isActive: false },
        });
        await tx.reservation.update({
          where: { id: reservation.id },
          data: {
            status: 'CANCELLED',
            expiresAt: null,
          },
        });
      }

      const updatedReservation = await tx.reservation.findUniqueOrThrow({
        where: { id: reservation.id },
        include: reservationInclude,
      });

      return {
        payment: {
          id: payment.id,
          reservationId: payment.reservationId,
          amount: decimalToNumber(payment.amount),
          method: payment.method,
          status: payment.status,
          transactionReference: payment.transactionReference,
          createdAt: payment.createdAt.toISOString(),
          ...(input.method === 'PIX'
            ? {
                pixCopyPaste: `00020126580014BR.GOV.BCB.PIX0136${payment.transactionReference}5204000053039865802BR`,
              }
            : {}),
        },
        reservation: serializeReservation(updatedReservation),
      };
    });

    return result;
  }

  async getPaymentById(id: string, actor: AuthenticatedUser) {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        reservation: {
          select: {
            id: true,
            code: true,
            userId: true,
            status: true,
          },
        },
      },
    });

    if (!payment) {
      throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Pagamento não encontrado.');
    }

    if (actor.role !== 'ADMIN' && payment.reservation.userId !== actor.id) {
      throw new AppError(
        403,
        'FORBIDDEN',
        'Você não possui permissão para consultar este pagamento.',
      );
    }

    return {
      id: payment.id,
      reservationId: payment.reservationId,
      reservationCode: payment.reservation.code,
      reservationStatus: payment.reservation.status,
      amount: decimalToNumber(payment.amount),
      method: payment.method,
      status: payment.status,
      transactionReference: payment.transactionReference,
      createdAt: payment.createdAt.toISOString(),
    };
  }
}

export const paymentsService = new PaymentsService();
