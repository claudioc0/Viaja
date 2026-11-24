import type { Request, Response } from 'express';
import type { ListRoutesQuery } from '@viaja/shared';
import { routesService } from './routes.service.js';

export class RoutesController {
  async list(req: Request, res: Response): Promise<void> {
    const routes = await routesService.listRoutes(req.query as unknown as ListRoutesQuery);
    res.status(200).json({ routes });
  }

  async getById(req: Request, res: Response): Promise<void> {
    const route = await routesService.getRouteById(String(req.params.id));
    res.status(200).json({ route });
  }

  async create(req: Request, res: Response): Promise<void> {
    const route = await routesService.createRoute(req.body);
    res.status(201).json({ route });
  }

  async update(req: Request, res: Response): Promise<void> {
    const route = await routesService.updateRoute(String(req.params.id), req.body);
    res.status(200).json({ route });
  }

  async remove(req: Request, res: Response): Promise<void> {
    await routesService.deleteRoute(String(req.params.id));
    res.status(204).send();
  }
}

export const routesController = new RoutesController();
