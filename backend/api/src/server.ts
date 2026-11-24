import { app } from './app.js';
import { prisma } from './config/database.js';
import { env } from './config/env.js';

const server = app.listen(env.PORT, () => {
  console.info(`VIAJA API running on http://localhost:${env.PORT}`);
  console.info(`Swagger OpenAPI UI available at http://localhost:${env.PORT}/api/docs`);
});

async function shutdown(signal: string) {
  console.info(`Received ${signal}. Closing HTTP server and Prisma connection...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
