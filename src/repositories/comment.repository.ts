import { prisma } from '../config/prisma';

// Todo comentário é devolvido com um resumo de quem o escreveu
const include = { author: { select: { id: true, name: true, role: true } } };

interface CreateCommentData {
  message: string;
  ticketId: number;
  authorId: string;
}

export const commentRepository = {
  create(data: CreateCommentData) {
    return prisma.comment.create({ data, include });
  },

  // Do mais antigo para o mais novo, na ordem em que a conversa aconteceu
  findByTicket(ticketId: number) {
    return prisma.comment.findMany({ where: { ticketId }, include, orderBy: { createdAt: 'asc' } });
  },
};
