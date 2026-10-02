import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { RegisterInput } from '../validators/auth.validator';

export async function register(req: Request, res: Response): Promise<void> {
  // req.body já foi validado pelo middleware validateBody
  const user = await authService.register(req.body as RegisterInput);

  res.status(201).json(user);
}
