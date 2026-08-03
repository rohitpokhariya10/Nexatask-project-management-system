import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { bootstrapAdminFromEnvironment, BootstrapAdminError } from './bootstrapAdmin.service.js';

async function run(): Promise<void> {
  let connected = false;
  try {
    await connectDatabase();
    connected = true;

    const result = await bootstrapAdminFromEnvironment();
    console.info(
      result === 'created'
        ? 'Bootstrap administrator created.'
        : 'An administrator already exists; no changes were made.',
    );
  } catch (error) {
    console.error(
      error instanceof BootstrapAdminError
        ? error.message
        : 'Administrator bootstrap failed unexpectedly; no changes were confirmed.',
    );
    process.exitCode = 1;
  } finally {
    if (connected) {
      try {
        await disconnectDatabase();
      } catch {
        console.error('Administrator bootstrap could not close the database connection cleanly.');
        process.exitCode = 1;
      }
    }
  }
}

void run();
