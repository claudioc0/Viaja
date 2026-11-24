import type { Request, Response } from 'express';
import type { ListTripsQuery } from '@viaja/shared';
import { tripsService } from './trips.service.js';

export class TripsController {
  async list(req: Request, res: Response): Promise<void> {
    const trips = await tripsService.listTrips(req.query as unknown as ListTripsQuery);
    res.status(200).json({ trips });
  }

  async getById(req: Request, res: Response): Promise<void> {
    const trip = await tripsService.getTripById(String(req.params.id));
    res.status(200).json({ trip });
  }

  async getSeats(req: Request, res: Response): Promise<void> {
    const result = await tripsService.getTripSeats(String(req.params.id));
    res.status(200).json(result);
  }

  async create(req: Request, res: Response): Promise<void> {
    const trip = await tripsService.createTrip(req.body);
    res.status(201).json({ trip });
  }

  async update(req: Request, res: Response): Promise<void> {
    const trip = await tripsService.updateTrip(String(req.params.id), req.body);
    res.status(200).json({ trip });
  }

  async remove(req: Request, res: Response): Promise<void> {
    await tripsService.deleteTrip(String(req.params.id));
    res.status(204).send();
  }
}

export const tripsController = new TripsController();
