import type { Request, Response } from 'express';
import type { ListReservationsQuery } from '@viaja/shared';
import { reservationsService } from './reservations.service.js';

export class ReservationsController {
  async create(req: Request, res: Response): Promise<void> {
    const reservation = await reservationsService.createReservation(req.user!.id, req.body);
    res.status(201).json({ reservation });
  }

  async list(req: Request, res: Response): Promise<void> {
    const reservations = await reservationsService.listReservations(
      req.user!,
      req.query as unknown as ListReservationsQuery,
    );
    res.status(200).json({ reservations });
  }

  async getById(req: Request, res: Response): Promise<void> {
    const reservation = await reservationsService.getReservationById(
      String(req.params.id),
      req.user!,
    );
    res.status(200).json({ reservation });
  }

  async cancel(req: Request, res: Response): Promise<void> {
    const reservation = await reservationsService.cancelReservation(
      String(req.params.id),
      req.user!,
    );
    res.status(200).json({ reservation });
  }
}

export const reservationsController = new ReservationsController();
