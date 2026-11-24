import { Router } from 'express';
import { z } from 'zod';
import {
  createTripSchema,
  listTripsQuerySchema,
  updateTripSchema,
  uuidSchema,
} from '@viaja/shared';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { tripsController } from './trips.controller.js';

export const tripsRouter: Router = Router();

tripsRouter.get(
  '/',
  validate({ query: listTripsQuerySchema }),
  asyncHandler((req, res) => tripsController.list(req, res)),
);

tripsRouter.get(
  '/:id',
  validate({ params: z.object({ id: uuidSchema }) }),
  asyncHandler((req, res) => tripsController.getById(req, res)),
);

tripsRouter.get(
  '/:id/seats',
  validate({ params: z.object({ id: uuidSchema }) }),
  asyncHandler((req, res) => tripsController.getSeats(req, res)),
);

tripsRouter.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validate({ body: createTripSchema }),
  asyncHandler((req, res) => tripsController.create(req, res)),
);

tripsRouter.put(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate({ params: z.object({ id: uuidSchema }), body: updateTripSchema }),
  asyncHandler((req, res) => tripsController.update(req, res)),
);

tripsRouter.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate({ params: z.object({ id: uuidSchema }) }),
  asyncHandler((req, res) => tripsController.remove(req, res)),
);
