import { AppError } from '../errors/AppError';
import { Prisma, Ticket } from '../generated/prisma/client';
import { ticketRepository } from '../repositories/ticket.repository';
import { userRepository } from '../repositories/user.repository';
import type { AuthUser } from '../types/express';
import { AssignTicketInput, CreateTicketInput, UpdateTicketInput } from '../validators/ticket.validator';

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

function alreadyAssigned(): AppError {
  return new AppError(409, 'TICKET_ALREADY_ASSIGNED', 'Este chamado já está atribuído a um técnico.');
}

export const ticketService = {
  create(data: CreateTicketInput, actor: AuthUser) {
    // O solicitante é sempre o usuário autenticado, nunca um valor vindo do body
    return ticketRepository.create({ ...data, requesterId: actor.id });
  },

  list(actor: AuthUser) {
    return ticketRepository.findMany(visibilityFilter(actor));
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

    return ticketRepository.update(id, data);
  },

  // TECH assume o chamado para si; ADMIN atribui (ou reatribui) a um técnico
  async assign(id: number, { technicianId }: AssignTicketInput, actor: AuthUser) {
    const ticket = await this.getById(id, actor);

    if (ticket.status === 'CLOSED') {
      throw new AppError(409, 'TICKET_CLOSED', 'Chamado encerrado não pode ser alterado.');
    }

    // Chamado que ainda não começou a ser atendido entra em atendimento ao receber um técnico
    const status = ticket.status === 'OPEN' ? 'IN_PROGRESS' : ticket.status;

    if (actor.role === 'TECH') {
      if (technicianId && technicianId !== actor.id) {
        throw new AppError(403, 'CANNOT_ASSIGN_TO_OTHERS', 'Técnicos só podem assumir chamados para si mesmos.');
      }

      const claimed = await ticketRepository.claim(id, actor.id, status);
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

    return ticketRepository.update(id, { technicianId, status });
  },
};
