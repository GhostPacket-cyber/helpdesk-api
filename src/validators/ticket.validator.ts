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

// O id do chamado é numérico; na URL ele chega como texto e é convertido
export const ticketIdParamSchema = z.object({
  id: z.coerce
    .number('Identificador inválido.')
    .int('Identificador inválido.')
    .positive('Identificador inválido.')
    .max(2147483647, 'Identificador inválido.'),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
