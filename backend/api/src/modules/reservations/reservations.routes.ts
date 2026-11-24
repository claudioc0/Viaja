import { Router } from 'express';
import { z } from 'zod';
import { createReservationSchema, listReservationsQuerySchema, uuidSchema } from '@viaja/shared';
import { authenticate } from '../../middlewares/authenticate.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { reservationsController } from './reservations.controller.js';

export const reservationsRouter: Router = Router();

reservationsRouter.use(authenticate);

reservationsRouter.post(
  '/',
  validate({ body: createReservationSchema }),
  asyncHandler((req, res) => reservationsController.create(req, res)),
);

reservationsRouter.get(
  '/',
  validate({ query: listReservationsQuerySchema }),
  asyncHandler((req, res) => reservationsController.list(req, res)),
);

reservationsRouter.get(
  '/:id',
  validate({ params: z.object({ id: uuidSchema }) }),
  asyncHandler((req, res) => reservationsController.getById(req, res)),
);

reservationsRouter.post(
  '/:id/cancel',
  validate({ params: z.object({ id: uuidSchema }) }),
  asyncHandler((req, res) => reservationsController.cancel(req, res)),
);
