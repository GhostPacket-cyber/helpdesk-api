import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { env } from './env';

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

// Uma única instância para a aplicação inteira: ela gerencia o pool de conexões
export const prisma = new PrismaClient({
  adapter,
  // passwordHash nunca é retornado, a menos que uma consulta peça explicitamente
  omit: {
    user: { passwordHash: true },
  },
});
