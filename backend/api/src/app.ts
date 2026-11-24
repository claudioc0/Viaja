import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { openApiSpec } from './config/swagger.js';
import { errorHandler } from './middlewares/error-handler.js';
import { apiRouter } from './routes/index.js';
import { AppError } from './utils/app-error.js';

export function createApp(): Express {
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );

  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '1mb' }));

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
  app.use('/api', apiRouter);

  app.use((req, _res, next) => {
    next(
      new AppError(
        404,
        'ENDPOINT_NOT_FOUND',
        `Rota não encontrada: ${req.method} ${req.originalUrl}`,
      ),
    );
  });

  app.use(errorHandler);

  return app;
}

export const app = createApp();
