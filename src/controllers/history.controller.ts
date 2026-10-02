import { Request, Response } from 'express';
import { historyService } from '../services/history.service';

// O :id da URL é o id do chamado ao qual o histórico pertence
type IdParams = { id: string };

export async function listHistory(req: Request<IdParams>, res: Response): Promise<void> {
  res.status(200).json(await historyService.list(Number(req.params.id), req.user!));
}
