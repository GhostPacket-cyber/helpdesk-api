import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { Role } from '../generated/prisma/client';

export const tokenService = {
  // O payload é apenas codificado, não criptografado: nunca coloque dados sensíveis nele
  signAccessToken(user: { id: string; role: Role }): string {
    return jwt.sign({ role: user.role }, env.JWT_SECRET, {
      subject: user.id,
      expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    });
  },
};
