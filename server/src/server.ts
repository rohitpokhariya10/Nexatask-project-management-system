import http from 'node:http';
import { app } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';

async function start(): Promise<void> {
  await connectDatabase();
  console.info('MongoDB connected.');
  console.info(`Allowed client origins: ${env.CLIENT_URL}.`);
  const server = http.createServer(app);
  server.listen(env.PORT, () => {
    console.info(`CountryEdu NexaTask API listening on port ${env.PORT}.`);
  });

  const shutdown = (signal: string) => {
    console.info(`${signal} received. Shutting down.`);
    server.close(() => {
      void disconnectDatabase().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Server startup failed.');
  process.exit(1);
});
