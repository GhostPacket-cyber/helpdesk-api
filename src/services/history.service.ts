import { HistoryAction } from '../generated/prisma/client';
import { historyRepository } from '../repositories/history.repository';
import type { AuthUser } from '../types/express';
import { ticketService } from './ticket.service';

interface DescribableEntry {
  action: HistoryAction;
  oldValue: string | null;
  newValue: string | null;
  user: { name: string };
}

// Frase pronta para exibição, montada a partir dos dados estruturados do registro
function describe({ action, oldValue, newValue, user }: DescribableEntry): string {
  switch (action) {
    case 'CREATED':
      return `Chamado criado por ${user.name}`;
    case 'ASSIGNED':
      if (oldValue) {
        return `Chamado reatribuído de ${oldValue} para ${newValue}`;
      }
      return newValue === user.name
        ? `Chamado assumido pelo técnico ${newValue}`
        : `Chamado atribuído ao técnico ${newValue} por ${user.name}`;
    case 'STATUS_CHANGED':
      return `Status alterado de ${oldValue} para ${newValue}`;
    case 'PRIORITY_CHANGED':
      return `Prioridade alterada de ${oldValue} para ${newValue}`;
    case 'COMMENT_ADDED':
      return `Comentário adicionado por ${user.name}`;
    case 'UPDATED':
      return `Campos alterados por ${user.name}: ${newValue}`;
  }
}

export const historyService = {
  // Segue a mesma regra dos comentários: quem enxerga o chamado enxerga o histórico dele
  async list(ticketId: number, actor: AuthUser) {
    await ticketService.getById(ticketId, actor);

    const entries = await historyRepository.findByTicket(ticketId);

    return entries.map((entry) => ({ ...entry, description: describe(entry) }));
  },
};
