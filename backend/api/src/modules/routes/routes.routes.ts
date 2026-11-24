import { Router } from 'express';
import { z } from 'zod';
import {
  createRouteSchema,
  listRoutesQuerySchema,
  updateRouteSchema,
  uuidSchema,
} from '@viaja/shared';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { routesController } from './routes.controller.js';

export const routesRouter: Router = Router();

routesRouter.get(
  '/',
  validate({ query: listRoutesQuerySchema }),
  asyncHandler((req, res) => routesController.list(req, res)),
);

routesRouter.get(
  '/:id',
  validate({ params: z.object({ id: uuidSchema }) }),
  asyncHandler((req, res) => routesController.getById(req, res)),
);

routesRouter.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validate({ body: createRouteSchema }),
  asyncHandler((req, res) => routesController.create(req, res)),
);

routesRouter.put(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate({ params: z.object({ id: uuidSchema }), body: updateRouteSchema }),
  asyncHandler((req, res) => routesController.update(req, res)),
);

routesRouter.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate({ params: z.object({ id: uuidSchema }) }),
  asyncHandler((req, res) => routesController.remove(req, res)),
);
