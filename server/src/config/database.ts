import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDatabase(uri = env.MONGODB_URI): Promise<void> {
  mongoose.set('strictQuery', true);
  const autoIndex = env.AUTO_INDEX ? env.AUTO_INDEX === 'true' : env.NODE_ENV !== 'production';
  await mongoose.connect(uri, { autoIndex });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

export function databaseHealth(): 'connected' | 'connecting' | 'disconnected' {
  if (mongoose.connection.readyState === mongoose.ConnectionStates.connected) return 'connected';
  if (mongoose.connection.readyState === mongoose.ConnectionStates.connecting) return 'connecting';
  return 'disconnected';
}
