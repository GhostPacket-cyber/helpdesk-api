import { prisma } from '../config/prisma';
import { Category, Priority, Prisma, Status } from '../generated/prisma/client';
import { HistoryEntry, timestamped } from './history.repository';

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

// Toda escrita recebe os registros de histórico e os grava na MESMA transação da alteração:
// ou o chamado muda e o histórico é registrado, ou nada acontece.
export const ticketRepository = {
  // Escrita aninhada: o Prisma executa o INSERT do chamado e os do histórico em uma transação
  create(data: CreateTicketData, history: HistoryEntry[]) {
    return prisma.ticket.create({
      data: { ...data, history: { create: timestamped(history) } },
      include,
    });
  },

  // Devolve uma página de chamados e o total que atende ao filtro (necessário para calcular as páginas).
  // As duas consultas rodam na mesma transação, para o total corresponder à página lida.
  async findPage(where: Prisma.TicketWhereInput, page: number, limit: number) {
    const [items, total] = await prisma.$transaction([
      prisma.ticket.findMany({
        where,
        include,
        // O id desempata chamados com a mesma data, mantendo a ordem estável entre as páginas
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.ticket.count({ where }),
    ]);

    return { items, total };
  },

  findById(id: number) {
    return prisma.ticket.findUnique({ where: { id }, include });
  },

  update(id: number, data: UpdateTicketData, history: HistoryEntry[]) {
    return prisma.ticket.update({
      where: { id },
      data: { ...data, history: { create: timestamped(history) } },
      include,
    });
  },

  // Atribui o técnico somente se o chamado ainda estiver sem responsável.
  // A condição faz parte do próprio UPDATE, então dois técnicos simultâneos não se sobrescrevem:
  // o banco altera a linha para o primeiro e devolve 0 linhas afetadas para o segundo.
  claim(id: number, technicianId: string, status: Status, history: HistoryEntry[]): Promise<boolean> {
    return conditionalUpdate({ id, technicianId: null }, { technicianId, status }, id, history);
  },

  // Muda o status somente se ele ainda for o que o service leu (`from`).
  // Mesma ideia do claim: evita que duas alterações simultâneas passem por cima uma da outra.
  transition(
    id: number,
    from: Status,
    data: { status: Status; closedAt?: Date },
    history: HistoryEntry[],
  ): Promise<boolean> {
    return conditionalUpdate({ id, status: from }, data, id, history);
  },
};

// updateMany não aceita escrita aninhada, então a transação é aberta explicitamente.
// Se a condição não for atendida (0 linhas), nada é gravado no histórico.
function conditionalUpdate(
  where: Prisma.TicketWhereInput,
  data: Prisma.TicketUncheckedUpdateManyInput,
  ticketId: number,
  history: HistoryEntry[],
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.ticket.updateMany({ where, data });

    if (count === 0) {
      return false;
    }

    await tx.ticketHistory.createMany({
      data: timestamped(history).map((entry) => ({ ...entry, ticketId })),
    });

    return true;
  });
}
