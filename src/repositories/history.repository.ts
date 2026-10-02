import { prisma } from '../config/prisma';
import { HistoryAction } from '../generated/prisma/client';

// Um registro de histórico ainda não gravado, montado pelo service
export interface HistoryEntry {
  action: HistoryAction;
  userId: string;
  oldValue?: string;
  newValue?: string;
}

// Registros gravados na mesma transação receberiam do banco exatamente o mesmo horário,
// e a ordem entre eles se perderia. Aqui cada um recebe 1 ms a mais que o anterior,
// preservando a ordem em que o service os listou.
export function timestamped(entries: HistoryEntry[]) {
  const now = Date.now();

  return entries.map((entry, index) => ({ ...entry, createdAt: new Date(now + index) }));
}

export const historyRepository = {
  findByTicket(ticketId: number) {
    return prisma.ticketHistory.findMany({
      where: { ticketId },
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });
  },
};
