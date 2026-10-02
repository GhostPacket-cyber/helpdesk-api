import { prisma } from '../config/prisma';
import { HistoryEntry, timestamped } from './history.repository';

// Todo comentário é devolvido com um resumo de quem o escreveu
const include = { author: { select: { id: true, name: true, role: true } } };

interface CreateCommentData {
  message: string;
  ticketId: number;
  authorId: string;
}

export const commentRepository = {
  // O comentário e o registro no histórico do chamado são gravados na mesma transação
  create(data: CreateCommentData, history: HistoryEntry[]) {
    return prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({ data, include });

      await tx.ticketHistory.createMany({
        data: timestamped(history).map((entry) => ({ ...entry, ticketId: data.ticketId })),
      });

      return comment;
    });
  },

  // Do mais antigo para o mais novo, na ordem em que a conversa aconteceu
  findByTicket(ticketId: number) {
    return prisma.comment.findMany({ where: { ticketId }, include, orderBy: { createdAt: 'asc' } });
  },
};
