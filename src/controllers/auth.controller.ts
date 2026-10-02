import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { LoginInput, RegisterInput } from '../validators/auth.validator';

export async function register(req: Request, res: Response): Promise<void> {
  // req.body já foi validado pelo middleware validateBody
  const user = await authService.register(req.body as RegisterInput);

  res.status(201).json(user);
}

export async function login(req: Request, res: Response): Promise<void> {
  const result = await authService.login(req.body as LoginInput);

  // 200 e não 201: o login não cria um recurso consultável na API
  res.status(200).json(result);
}

export function me(req: Request, res: Response): void {
  // req.user foi preenchido pelo middleware authenticate
  res.status(200).json(req.user);
}
