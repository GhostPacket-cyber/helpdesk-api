import { Request, Response } from 'express';
import { commentService } from '../services/comment.service';
import { CreateCommentInput } from '../validators/comment.validator';

// O :id da URL é o id do chamado ao qual os comentários pertencem
type IdParams = { id: string };

export async function createComment(req: Request<IdParams>, res: Response): Promise<void> {
  const comment = await commentService.create(Number(req.params.id), req.body as CreateCommentInput, req.user!);

  res.status(201).json(comment);
}

export async function listComments(req: Request<IdParams>, res: Response): Promise<void> {
  res.status(200).json(await commentService.list(Number(req.params.id), req.user!));
}
