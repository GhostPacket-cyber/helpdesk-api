import { z } from 'zod';

const email = z
  .string('Email é obrigatório.')
  .trim()
  .toLowerCase()
  .pipe(z.email('Email inválido.'));

export const registerSchema = z.object({
  name: z
    .string('Nome é obrigatório.')
    .trim()
    .min(2, 'Nome deve ter pelo menos 2 caracteres.')
    .max(100, 'Nome deve ter no máximo 100 caracteres.'),
  email,
  // O bcrypt considera apenas os primeiros 72 bytes da senha
  password: z
    .string('Senha é obrigatória.')
    .min(8, 'Senha deve ter pelo menos 8 caracteres.')
    .max(72, 'Senha deve ter no máximo 72 caracteres.'),
});

// No login não se repetem as regras de tamanho da senha: basta ela ter sido enviada
export const loginSchema = z.object({
  email,
  password: z.string('Senha é obrigatória.').min(1, 'Senha é obrigatória.'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
