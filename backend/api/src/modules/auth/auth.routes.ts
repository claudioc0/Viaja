import { Router } from 'express';
import { loginSchema, refreshTokenSchema, registerSchema } from '@viaja/shared';
import { authenticate } from '../../middlewares/authenticate.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { authController } from './auth.controller.js';

export const authRouter: Router = Router();

authRouter.post(
  '/register',
  validate({ body: registerSchema }),
  asyncHandler((req, res) => authController.register(req, res)),
);

authRouter.post(
  '/login',
  validate({ body: loginSchema }),
  asyncHandler((req, res) => authController.login(req, res)),
);

authRouter.post(
  '/refresh',
  validate({ body: refreshTokenSchema }),
  asyncHandler((req, res) => authController.refresh(req, res)),
);

authRouter.post(
  '/logout',
  authenticate,
  asyncHandler((req, res) => authController.logout(req, res)),
);

authRouter.get(
  '/me',
  authenticate,
  asyncHandler((req, res) => authController.me(req, res)),
);
