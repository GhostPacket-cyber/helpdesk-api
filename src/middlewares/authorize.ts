import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { Role } from '../generated/prisma/client';

// Libera a rota apenas para os perfis informados. Deve vir sempre depois de authenticate.
export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(401, 'TOKEN_MISSING', 'Token de autenticação não informado.');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(403, 'FORBIDDEN', 'Você não tem permissão para acessar este recurso.');
    }

    next();
  };
}
