import { prisma } from '../config/prisma';
import { Category, Priority, Prisma } from '../generated/prisma/client';

// Todo chamado é devolvido com um resumo do solicitante e do técnico
const personSummary = { select: { id: true, name: true, email: true } };
const include = { requester: personSummary, technician: personSummary };

interface CreateTicketData {
  title: string;
  description: string;
  category: Category;
  requesterId: string;
}

interface UpdateTicketData {
  title?: string;
  description?: string;
  category?: Category;
  priority?: Priority;
}

export const ticketRepository = {
  create(data: CreateTicketData) {
    return prisma.ticket.create({ data, include });
  },

  findMany(where: Prisma.TicketWhereInput) {
    return prisma.ticket.findMany({ where, include, orderBy: { createdAt: 'desc' } });
  },

  findById(id: number) {
    return prisma.ticket.findUnique({ where: { id }, include });
  },

  update(id: number, data: UpdateTicketData) {
    return prisma.ticket.update({ where: { id }, data, include });
  },
};
