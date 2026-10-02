import { Request, Response } from 'express';
import { userService } from '../services/user.service';
import { CreateUserInput, UpdateUserInput, UpdateUserStatusInput } from '../validators/user.validator';

type IdParams = { id: string };

export async function listUsers(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await userService.list());
}

export async function getUser(req: Request<IdParams>, res: Response): Promise<void> {
  res.status(200).json(await userService.getById(req.params.id));
}

export async function createUser(req: Request, res: Response): Promise<void> {
  const user = await userService.create(req.body as CreateUserInput);

  res.status(201).json(user);
}

export async function updateUser(req: Request<IdParams>, res: Response): Promise<void> {
  // req.user existe: a rota passa por authenticate antes de chegar aqui
  const user = await userService.update(req.params.id, req.body as UpdateUserInput, req.user!);

  res.status(200).json(user);
}

export async function updateUserStatus(req: Request<IdParams>, res: Response): Promise<void> {
  const { active } = req.body as UpdateUserStatusInput;
  const user = await userService.setActive(req.params.id, active, req.user!);

  res.status(200).json(user);
}
