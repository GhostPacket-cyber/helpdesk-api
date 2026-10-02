import { z } from 'zod';

// Autor, chamado e data não são aceitos no body: são definidos pelo sistema
export const createCommentSchema = z.object({
  message: z
    .string('Mensagem é obrigatória.')
    .trim()
    .min(1, 'Mensagem não pode ficar vazia.')
    .max(2000, 'Mensagem deve ter no máximo 2000 caracteres.'),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
