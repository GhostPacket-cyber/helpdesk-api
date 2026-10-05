import dotenv from 'dotenv';
import { z } from 'zod';

// Carrega o .env em process.env (variáveis já definidas no sistema têm prioridade)
dotenv.config({ quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url(),
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres.')
    // Impede subir a aplicação com o valor de exemplo do .env.example
    .refine((value) => !value.toLowerCase().includes('troque'), 'JWT_SECRET ainda está com o valor de exemplo.'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  // Origens (sites) autorizadas a chamar a API pelo navegador, separadas por vírgula.
  // Vazio: nenhum site de outra origem é autorizado.
  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Variáveis de ambiente inválidas:');
  console.error(z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
