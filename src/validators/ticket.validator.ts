import { z } from 'zod';

const titleField = z
  .string('Título é obrigatório.')
  .trim()
  .min(5, 'Título deve ter pelo menos 5 caracteres.')
  .max(150, 'Título deve ter no máximo 150 caracteres.');

const descriptionField = z
  .string('Descrição é obrigatória.')
  .trim()
  .min(10, 'Descrição deve ter pelo menos 10 caracteres.')
  .max(5000, 'Descrição deve ter no máximo 5000 caracteres.');

const categoryField = z.enum(
  ['HARDWARE', 'SOFTWARE', 'NETWORK', 'ACCESS', 'PRINTER', 'OTHER'],
  'Categoria deve ser HARDWARE, SOFTWARE, NETWORK, ACCESS, PRINTER ou OTHER.',
);

const priorityField = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], 'Prioridade deve ser LOW, MEDIUM, HIGH ou CRITICAL.');

// Status, prioridade, solicitante e técnico não são aceitos na criação: são definidos pelo sistema
export const createTicketSchema = z.object({
  title: titleField,
  description: descriptionField,
  category: categoryField,
});

export const updateTicketSchema = z
  .object({
    title: titleField.optional(),
    description: descriptionField.optional(),
    category: categoryField.optional(),
    priority: priorityField.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Informe ao menos um campo para alterar.');

// TECH assume o chamado para si e não envia body; ADMIN informa o técnico em technicianId
export const assignTicketSchema = z.object({
  technicianId: z.uuid('technicianId deve ser um identificador válido.').optional(),
});

const statusField = z.enum(
  ['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED'],
  'Status deve ser OPEN, IN_PROGRESS, WAITING, RESOLVED ou CLOSED.',
);

// Aqui só se confere que o valor é um status existente; se a transição é permitida é regra do service
export const updateTicketStatusSchema = z.object({
  status: statusField,
});

// Parâmetros de GET /tickets. Tudo na query string chega como texto, por isso page e limit são convertidos.
// Todos os filtros são opcionais e combináveis: ?status=OPEN&priority=HIGH&page=2
export const listTicketsQuerySchema = z.object({
  status: statusField.optional(),
  priority: priorityField.optional(),
  category: categoryField.optional(),
  technician: z.uuid('technician deve ser o identificador de um técnico.').optional(),
  page: z.coerce
    .number('page deve ser um número.')
    .int('page deve ser um número inteiro.')
    .min(1, 'page deve ser no mínimo 1.')
    .default(1),
  // O teto impede que um cliente peça o banco inteiro em uma única requisição
  limit: z.coerce
    .number('limit deve ser um número.')
    .int('limit deve ser um número inteiro.')
    .min(1, 'limit deve ser no mínimo 1.')
    .max(100, 'limit deve ser no máximo 100.')
    .default(20),
});

// O id do chamado é numérico. Na URL ele chega como texto: aceita-se apenas dígitos
// (sem "1e3", "0x10" ou espaços) e dentro do limite do tipo inteiro do banco.
export const ticketIdParamSchema = z.object({
  id: z
    .string()
    .refine((value) => /^[1-9]\d{0,9}$/.test(value) && Number(value) <= 2147483647, 'Identificador inválido.'),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type AssignTicketInput = z.infer<typeof assignTicketSchema>;
export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;
export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;
