import { prisma } from '../config/prisma';
import { Category, Priority, Prisma, Status } from '../generated/prisma/client';

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
  status?: Status;
  technicianId?: string;
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

  // Atribui o técnico somente se o chamado ainda estiver sem responsável.
  // A condição faz parte do próprio UPDATE, então dois técnicos simultâneos não se sobrescrevem:
  // o banco altera a linha para o primeiro e devolve 0 linhas afetadas para o segundo.
  async claim(id: number, technicianId: string, status: Status): Promise<boolean> {
    const { count } = await prisma.ticket.updateMany({
      where: { id, technicianId: null },
      data: { technicianId, status },
    });

    return count === 1;
  },
};
