import { Router } from 'express';
import { z } from 'zod';
import { uuidSchema } from '@viaja/shared';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { seatsController } from './seats.controller.js';

export const seatsRouter: Router = Router();

seatsRouter.get(
  '/bus/:busId',
  validate({ params: z.object({ busId: uuidSchema }) }),
  asyncHandler((req, res) => seatsController.listByBus(req, res)),
);
