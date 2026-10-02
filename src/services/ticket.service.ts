import { AppError } from '../errors/AppError';
import { Prisma, Status, Ticket } from '../generated/prisma/client';
import { HistoryEntry } from '../repositories/history.repository';
import { ticketRepository } from '../repositories/ticket.repository';
import { userRepository } from '../repositories/user.repository';
import type { AuthUser } from '../types/express';
import {
  AssignTicketInput,
  CreateTicketInput,
  ListTicketsQuery,
  UpdateTicketInput,
  UpdateTicketStatusInput,
} from '../validators/ticket.validator';

type TicketField = keyof UpdateTicketInput;

// Quais chamados cada perfil enxerga:
//   USER  -> os que ele abriu
//   TECH  -> os sem técnico (disponíveis) e os atribuídos a ele
//   ADMIN -> todos
function canView(actor: AuthUser, ticket: Ticket): boolean {
  switch (actor.role) {
    case 'ADMIN':
      return true;
    case 'TECH':
      return ticket.technicianId === null || ticket.technicianId === actor.id;
    case 'USER':
      return ticket.requesterId === actor.id;
  }
}

// A mesma regra de canView, escrita como filtro para o banco aplicar na listagem
function visibilityFilter(actor: AuthUser): Prisma.TicketWhereInput {
  switch (actor.role) {
    case 'ADMIN':
      return {};
    case 'TECH':
      return { OR: [{ technicianId: null }, { technicianId: actor.id }] };
    case 'USER':
      return { requesterId: actor.id };
  }
}

// Quais campos cada pessoa pode alterar em um chamado
function editableFields(actor: AuthUser, ticket: Ticket): TicketField[] {
  if (actor.role === 'ADMIN') {
    return ['title', 'description', 'category', 'priority'];
  }
  if (actor.role === 'TECH' && ticket.technicianId === actor.id) {
    return ['category', 'priority'];
  }
  // O solicitante só corrige o texto enquanto ninguém começou a atender
  if (ticket.requesterId === actor.id && ticket.status === 'OPEN') {
    return ['title', 'description'];
  }
  return [];
}

// Máquina de estados do chamado: para cada status, quais são os próximos permitidos.
// OPEN não tem saída aqui porque só vira IN_PROGRESS ao receber um técnico (rota /assign).
const STATUS_TRANSITIONS: Record<Status, Status[]> = {
  OPEN: [],
  IN_PROGRESS: ['WAITING', 'RESOLVED'],
  WAITING: ['IN_PROGRESS', 'RESOLVED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: [],
};

function alreadyAssigned(): AppError {
  return new AppError(409, 'TICKET_ALREADY_ASSIGNED', 'Este chamado já está atribuído a um técnico.');
}

export const ticketService = {
  create(data: CreateTicketInput, actor: AuthUser) {
    // O solicitante é sempre o usuário autenticado, nunca um valor vindo do body
    return ticketRepository.create({ ...data, requesterId: actor.id }, [{ action: 'CREATED', userId: actor.id }]);
  },

  async list({ status, priority, category, technician, page, limit }: ListTicketsQuery, actor: AuthUser) {
    // Os filtros pedidos só restringem dentro do que o perfil já pode ver, nunca ampliam
    const where: Prisma.TicketWhereInput = {
      AND: [visibilityFilter(actor), { status, priority, category, technicianId: technician }],
    };

    const { items, total } = await ticketRepository.findPage(where, page, limit);

    return {
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getById(id: number, actor: AuthUser) {
    const ticket = await ticketRepository.findById(id);

    if (!ticket) {
      throw new AppError(404, 'TICKET_NOT_FOUND', 'Chamado não encontrado.');
    }

    if (!canView(actor, ticket)) {
      throw new AppError(403, 'TICKET_ACCESS_DENIED', 'Você não tem acesso a este chamado.');
    }

    return ticket;
  },

  async update(id: number, data: UpdateTicketInput, actor: AuthUser) {
    const ticket = await this.getById(id, actor);

    if (ticket.status === 'CLOSED') {
      throw new AppError(409, 'TICKET_CLOSED', 'Chamado encerrado não pode ser alterado.');
    }

    const allowed = editableFields(actor, ticket);
    const denied = (Object.keys(data) as TicketField[]).filter((field) => !allowed.includes(field));

    if (denied.length > 0) {
      throw new AppError(403, 'TICKET_FIELD_NOT_ALLOWED', 'Você não pode alterar estes campos do chamado.', denied);
    }

    // Só entra no histórico o que de fato mudou de valor
    const changed = (Object.keys(data) as TicketField[]).filter((field) => data[field] !== ticket[field]);
    if (changed.length === 0) {
      return ticket;
    }

    const history: HistoryEntry[] = [];

    if (changed.includes('priority')) {
      history.push({ action: 'PRIORITY_CHANGED', oldValue: ticket.priority, newValue: data.priority, userId: actor.id });
    }

    // Título, descrição e categoria: registra-se quais campos mudaram, sem copiar os textos
    const otherFields = changed.filter((field) => field !== 'priority');
    if (otherFields.length > 0) {
      history.push({ action: 'UPDATED', newValue: otherFields.join(', '), userId: actor.id });
    }

    return ticketRepository.update(id, data, history);
  },

  // TECH assume o chamado para si; ADMIN atribui (ou reatribui) a um técnico
  async assign(id: number, { technicianId }: AssignTicketInput, actor: AuthUser) {
    const ticket = await this.getById(id, actor);

    if (ticket.status === 'CLOSED') {
      throw new AppError(409, 'TICKET_CLOSED', 'Chamado encerrado não pode ser alterado.');
    }

    // Chamado que ainda não começou a ser atendido entra em atendimento ao receber um técnico
    const status = ticket.status === 'OPEN' ? 'IN_PROGRESS' : ticket.status;

    const historyFor = (technicianName: string): HistoryEntry[] => {
      const entries: HistoryEntry[] = [
        { action: 'ASSIGNED', oldValue: ticket.technician?.name, newValue: technicianName, userId: actor.id },
      ];
      if (status !== ticket.status) {
        entries.push({ action: 'STATUS_CHANGED', oldValue: ticket.status, newValue: status, userId: actor.id });
      }
      return entries;
    };

    if (actor.role === 'TECH') {
      if (technicianId && technicianId !== actor.id) {
        throw new AppError(403, 'CANNOT_ASSIGN_TO_OTHERS', 'Técnicos só podem assumir chamados para si mesmos.');
      }

      const claimed = await ticketRepository.claim(id, actor.id, status, historyFor(actor.name));
      if (!claimed) {
        throw alreadyAssigned();
      }

      return (await ticketRepository.findById(id))!;
    }

    if (!technicianId) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Dados inválidos.', [
        { field: 'technicianId', message: 'Informe o técnico que receberá o chamado.' },
      ]);
    }

    if (technicianId === ticket.technicianId) {
      throw alreadyAssigned();
    }

    const technician = await userRepository.findById(technicianId);
    if (!technician || technician.role !== 'TECH' || !technician.active) {
      throw new AppError(400, 'INVALID_TECHNICIAN', 'O usuário informado não é um técnico ativo.');
    }

    return ticketRepository.update(id, { technicianId, status }, historyFor(technician.name));
  },

  async changeStatus(id: number, { status: next }: UpdateTicketStatusInput, actor: AuthUser) {
    const ticket = await this.getById(id, actor);

    // Quem atende é quem move o chamado: o técnico responsável ou um administrador
    if (actor.role !== 'ADMIN' && ticket.technicianId !== actor.id) {
      throw new AppError(
        403,
        'NOT_TICKET_TECHNICIAN',
        'Apenas o técnico responsável ou um administrador pode alterar o status.',
      );
    }

    const current = ticket.status;
    const allowed = STATUS_TRANSITIONS[current];

    if (!allowed.includes(next)) {
      throw new AppError(
        409,
        'INVALID_STATUS_TRANSITION',
        `Não é possível alterar o status de ${current} para ${next}.`,
        { from: current, to: next, allowed },
      );
    }

    // A data de encerramento é registrada no momento em que o chamado é fechado
    const closedAt = next === 'CLOSED' ? new Date() : undefined;

    const changed = await ticketRepository.transition(id, current, { status: next, closedAt }, [
      { action: 'STATUS_CHANGED', oldValue: current, newValue: next, userId: actor.id },
    ]);
    if (!changed) {
      throw new AppError(409, 'TICKET_STATUS_CHANGED', 'O status do chamado foi alterado por outra pessoa. Consulte-o novamente.');
    }

    return (await ticketRepository.findById(id))!;
  },
};
