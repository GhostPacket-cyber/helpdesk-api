import { User } from '../generated/prisma/client';

// Usuário autenticado, como fica disponível em req.user (sem o passwordHash)
export type AuthUser = Omit<User, 'passwordHash'>;

// Acrescenta `user` ao tipo Request do Express
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
