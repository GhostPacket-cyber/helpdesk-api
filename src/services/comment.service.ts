import { AppError } from '../errors/AppError';
import { commentRepository } from '../repositories/comment.repository';
import type { AuthUser } from '../types/express';
import { CreateCommentInput } from '../validators/comment.validator';
import { ticketService } from './ticket.service';

// Comentários não têm regra de acesso própria: quem enxerga o chamado enxerga e escreve comentários.
// ticketService.getById já responde 404 (não existe) ou 403 (sem acesso).
export const commentService = {
  async create(ticketId: number, { message }: CreateCommentInput, actor: AuthUser) {
    const ticket = await ticketService.getById(ticketId, actor);

    if (ticket.status === 'CLOSED') {
      throw new AppError(409, 'TICKET_CLOSED', 'Chamado encerrado não aceita novos comentários.');
    }

    // O autor é sempre o usuário autenticado, nunca um valor vindo do body
    return commentRepository.create({ message, ticketId, authorId: actor.id }, [
      { action: 'COMMENT_ADDED', userId: actor.id },
    ]);
  },

  async list(ticketId: number, actor: AuthUser) {
    await ticketService.getById(ticketId, actor);

    return commentRepository.findByTicket(ticketId);
  },
};
