import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';
import { Role } from '../generated/prisma/client';

export const tokenService = {
  // O payload é apenas codificado, não criptografado: nunca coloque dados sensíveis nele
  signAccessToken(user: { id: string; role: Role }): string {
    return jwt.sign({ role: user.role }, env.JWT_SECRET, {
      subject: user.id,
      expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    });
  },

  // Confere assinatura e validade, e devolve o id do usuário dono do token
  verifyAccessToken(token: string): string {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET);

      if (typeof payload === 'string' || !payload.sub) {
        throw new AppError(401, 'TOKEN_INVALID', 'Token inválido.');
      }

      return payload.sub;
    } catch (err) {
      if (err instanceof AppError) {
        throw err;
      }
      if (err instanceof jwt.TokenExpiredError) {
        throw new AppError(401, 'TOKEN_EXPIRED', 'Token expirado. Faça login novamente.');
      }
      throw new AppError(401, 'TOKEN_INVALID', 'Token inválido.');
    }
  },
};
