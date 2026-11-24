import { Router } from 'express';
import { z } from 'zod';
import { createPaymentSchema, uuidSchema } from '@viaja/shared';
import { authenticate } from '../../middlewares/authenticate.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { paymentsController } from './payments.controller.js';

export const paymentsRouter: Router = Router();

paymentsRouter.use(authenticate);

paymentsRouter.post(
  '/',
  validate({ body: createPaymentSchema }),
  asyncHandler((req, res) => paymentsController.create(req, res)),
);

paymentsRouter.get(
  '/:id',
  validate({ params: z.object({ id: uuidSchema }) }),
  asyncHandler((req, res) => paymentsController.getById(req, res)),
);
