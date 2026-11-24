import type { Request, Response } from 'express';
import { seatsService } from './seats.service.js';

export class SeatsController {
  async listByBus(req: Request, res: Response): Promise<void> {
    const busId = String(req.params.busId);
    const seats = await seatsService.listSeatsByBus(busId);
    res.status(200).json({ seats });
  }
}

export const seatsController = new SeatsController();
