import mongoose from 'mongoose';
import { z } from 'zod';

export const objectIdSchema = z.string().refine(mongoose.isValidObjectId, 'Invalid identifier.');

export function objectId(value: string): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(value);
}
