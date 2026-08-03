import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/appError.js';
import { UserModel } from '../users/user.model.js';

interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

function signAccessToken(userId: string): string {
  const expiresIn = env.JWT_EXPIRES_IN as NonNullable<SignOptions['expiresIn']>;
  return jwt.sign({}, env.JWT_SECRET, {
    subject: userId,
    expiresIn,
  });
}

export async function registerUser(input: RegisterInput) {
  const existing = await UserModel.exists({ email: input.email });
  if (existing) throw new AppError('An account with this email already exists.', 409);

  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);
  const user = await UserModel.create({
    name: input.name,
    email: input.email,
    passwordHash,
    role: 'TEAM_MEMBER',
  });

  return { user, accessToken: signAccessToken(String(user._id)) };
}

export async function loginUser(input: LoginInput) {
  const user = await UserModel.findOne({ email: input.email }).select('+passwordHash');
  const validPassword = user ? await bcrypt.compare(input.password, user.passwordHash) : false;
  if (!user || !validPassword || !user.isActive) {
    throw new AppError('Invalid email or password.', 401);
  }
  return { user, accessToken: signAccessToken(String(user._id)) };
}
