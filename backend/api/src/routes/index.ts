import { Router } from 'express';
import { prisma } from '../config/database.js';
import { openApiSpec } from '../config/swagger.js';
import { authRouter } from '../modules/auth/auth.routes.js';
import { busesRouter } from '../modules/buses/buses.routes.js';
import { dashboardRouter } from '../modules/dashboard/dashboard.routes.js';
import { paymentsRouter } from '../modules/payments/payments.routes.js';
import { reservationsRouter } from '../modules/reservations/reservations.routes.js';
import { routesRouter } from '../modules/routes/routes.routes.js';
import { seatsRouter } from '../modules/seats/seats.routes.js';
import { tripsRouter } from '../modules/trips/trips.routes.js';
import { usersRouter } from '../modules/users/users.routes.js';
import { asyncHandler } from '../utils/async-handler.js';

export const apiRouter: Router = Router();

apiRouter.get(
  '/health',
  asyncHandler(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ok',
      service: '@viaja/api',
      timestamp: new Date().toISOString(),
    });
  }),
);

apiRouter.get('/docs.json', (_req, res) => {
  res.status(200).json(openApiSpec);
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/buses', busesRouter);
apiRouter.use('/seats', seatsRouter);
apiRouter.use('/routes', routesRouter);
apiRouter.use('/trips', tripsRouter);
apiRouter.use('/reservations', reservationsRouter);
apiRouter.use('/payments', paymentsRouter);
apiRouter.use('/dashboard', dashboardRouter);
