import { z } from 'zod';
import { emailField, nameField, passwordField } from './common.validator';

const roleField = z.enum(['USER', 'TECH', 'ADMIN'], 'Perfil deve ser USER, TECH ou ADMIN.');

export const createUserSchema = z.object({
  name: nameField,
  email: emailField,
  password: passwordField,
  role: roleField.default('USER'),
});

// Todos os campos são opcionais, mas pelo menos um precisa ser enviado
export const updateUserSchema = z
  .object({
    name: nameField.optional(),
    email: emailField.optional(),
    role: roleField.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Informe ao menos um campo para alterar.');

export const updateUserStatusSchema = z.object({
  active: z.boolean('O campo active deve ser true ou false.'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
