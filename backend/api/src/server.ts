import { prisma } from './config/database.js';
import { env } from './config/env.js';
import { captureApiException, flushBackendSentry, initBackendSentry } from './config/sentry.js';

initBackendSentry();

const { app } = await import('./app.js');

const server = app.listen(env.PORT, () => {
  console.info(`VIAJA API running on http://localhost:${env.PORT}`);
  console.info(`Swagger OpenAPI UI available at http://localhost:${env.PORT}/api/docs`);
});

async function shutdown(signal: string) {
  console.info(`Received ${signal}. Closing HTTP server and Prisma connection...`);
  server.close(async () => {
    await flushBackendSentry();
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('unhandledRejection', (reason) => {
  captureApiException(reason, undefined, { lifecycle: 'unhandledRejection' });
  console.error('Unhandled Promise rejection:', reason);
});

process.on('uncaughtException', (error) => {
  captureApiException(error, undefined, { lifecycle: 'uncaughtException' });
  console.error('Uncaught exception:', error);
  void flushBackendSentry().finally(() => {
    process.exit(1);
  });
});

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
