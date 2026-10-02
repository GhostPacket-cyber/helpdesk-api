import { z } from 'zod';
import { emailField, nameField, passwordField } from './common.validator';

export const registerSchema = z.object({
  name: nameField,
  email: emailField,
  password: passwordField,
});

// No login não se repetem as regras de tamanho da senha: basta ela ter sido enviada
export const loginSchema = z.object({
  email: emailField,
  password: z.string('Senha é obrigatória.').min(1, 'Senha é obrigatória.'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
