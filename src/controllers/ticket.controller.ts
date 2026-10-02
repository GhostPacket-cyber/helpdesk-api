import { Request, Response } from 'express';
import { ticketService } from '../services/ticket.service';
import {
  AssignTicketInput,
  CreateTicketInput,
  UpdateTicketInput,
  UpdateTicketStatusInput,
} from '../validators/ticket.validator';

type IdParams = { id: string };

// req.user! — todas as rotas de chamados passam por authenticate antes de chegar aqui

export async function createTicket(req: Request, res: Response): Promise<void> {
  const ticket = await ticketService.create(req.body as CreateTicketInput, req.user!);

  res.status(201).json(ticket);
}

export async function listTickets(req: Request, res: Response): Promise<void> {
  res.status(200).json(await ticketService.list(req.user!));
}

export async function getTicket(req: Request<IdParams>, res: Response): Promise<void> {
  // O formato do id já foi conferido por validateParams
  res.status(200).json(await ticketService.getById(Number(req.params.id), req.user!));
}

export async function updateTicket(req: Request<IdParams>, res: Response): Promise<void> {
  const ticket = await ticketService.update(Number(req.params.id), req.body as UpdateTicketInput, req.user!);

  res.status(200).json(ticket);
}

export async function assignTicket(req: Request<IdParams>, res: Response): Promise<void> {
  const ticket = await ticketService.assign(Number(req.params.id), req.body as AssignTicketInput, req.user!);

  // 200 e não 201: a ação altera um chamado existente, não cria um recurso novo
  res.status(200).json(ticket);
}

export async function updateTicketStatus(req: Request<IdParams>, res: Response): Promise<void> {
  const ticket = await ticketService.changeStatus(
    Number(req.params.id),
    req.body as UpdateTicketStatusInput,
    req.user!,
  );

  res.status(200).json(ticket);
}
