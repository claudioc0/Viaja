import { Router } from 'express';
import { z } from 'zod';
import { uuidSchema } from '@viaja/shared';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { usersController } from './users.controller.js';

export const usersRouter: Router = Router();

usersRouter.get(
  '/',
  authenticate,
  authorize('ADMIN'),
  asyncHandler((req, res) => usersController.list(req, res)),
);

usersRouter.get(
  '/:id',
  authenticate,
  validate({ params: z.object({ id: uuidSchema }) }),
  asyncHandler((req, res) => usersController.getById(req, res)),
);
