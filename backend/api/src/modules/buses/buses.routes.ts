import { Router } from 'express';
import { z } from 'zod';
import { createBusSchema, uuidSchema } from '@viaja/shared';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { seatsController } from '../seats/seats.controller.js';
import { busesController } from './buses.controller.js';

export const busesRouter: Router = Router();

busesRouter.get(
  '/',
  asyncHandler((req, res) => busesController.list(req, res)),
);

busesRouter.get(
  '/:id',
  validate({ params: z.object({ id: uuidSchema }) }),
  asyncHandler((req, res) => busesController.getById(req, res)),
);

busesRouter.get(
  '/:busId/seats',
  validate({ params: z.object({ busId: uuidSchema }) }),
  asyncHandler((req, res) => seatsController.listByBus(req, res)),
);

busesRouter.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validate({ body: createBusSchema }),
  asyncHandler((req, res) => busesController.create(req, res)),
);
