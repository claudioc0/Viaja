import type { Request, Response } from 'express';
import { busesService } from './buses.service.js';

export class BusesController {
  async list(_req: Request, res: Response): Promise<void> {
    const buses = await busesService.listBuses();
    res.status(200).json({ buses });
  }

  async getById(req: Request, res: Response): Promise<void> {
    const bus = await busesService.getBusById(String(req.params.id));
    res.status(200).json({ bus });
  }

  async create(req: Request, res: Response): Promise<void> {
    const bus = await busesService.createBus(req.body);
    res.status(201).json({ bus });
  }
}

export const busesController = new BusesController();
