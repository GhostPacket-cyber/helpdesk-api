import { z } from 'zod';

export const registerSchema = z.object({
  name: z
    .string('Nome é obrigatório.')
    .trim()
    .min(2, 'Nome deve ter pelo menos 2 caracteres.')
    .max(100, 'Nome deve ter no máximo 100 caracteres.'),
  email: z
    .string('Email é obrigatório.')
    .trim()
    .toLowerCase()
    .pipe(z.email('Email inválido.')),
  // O bcrypt considera apenas os primeiros 72 bytes da senha
  password: z
    .string('Senha é obrigatória.')
    .min(8, 'Senha deve ter pelo menos 8 caracteres.')
    .max(72, 'Senha deve ter no máximo 72 caracteres.'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
