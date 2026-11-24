import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { dashboardController } from './dashboard.controller.js';

export const dashboardRouter: Router = Router();

dashboardRouter.get(
  '/summary',
  authenticate,
  authorize('ADMIN'),
  asyncHandler((req, res) => dashboardController.summary(req, res)),
);
