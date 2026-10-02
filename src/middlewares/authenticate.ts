import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { userRepository } from '../repositories/user.repository';
import { tokenService } from '../services/token.service';

// Exige um JWT válido no cabeçalho "Authorization: Bearer <token>" e preenche req.user
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new AppError(401, 'TOKEN_MISSING', 'Token de autenticação não informado.');
  }

  const userId = tokenService.verifyAccessToken(token);

  // Consulta o banco a cada requisição: desativação e troca de perfil valem na hora
  const user = await userRepository.findById(userId);

  if (!user) {
    throw new AppError(401, 'TOKEN_INVALID', 'Token inválido.');
  }

  if (!user.active) {
    throw new AppError(403, 'USER_INACTIVE', 'Usuário desativado. Procure um administrador.');
  }

  req.user = user;
  next();
}
