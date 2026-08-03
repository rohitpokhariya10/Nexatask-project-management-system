import type { Types } from 'mongoose';
import type { UserRole } from '../shared/constants.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        objectId: Types.ObjectId;
        name: string;
        email: string;
        role: UserRole;
      };
    }
  }
}

export {};
