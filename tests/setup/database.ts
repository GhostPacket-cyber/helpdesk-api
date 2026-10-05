import { env } from '../../src/config/env';
import { prisma } from '../../src/config/prisma';

// Cada teste começa com o banco vazio: nenhum depende do que outro criou, e a ordem não importa
beforeEach(async () => {
  // Trava de segurança: jamais apagar tabelas de um banco que não seja o de testes
  if (!new URL(env.DATABASE_URL).pathname.endsWith('_test')) {
    throw new Error('Os testes só podem rodar em um banco cujo nome termine com "_test".');
  }

  await prisma.$executeRaw`TRUNCATE TABLE ticket_history, comments, tickets, users RESTART IDENTITY CASCADE`;
});

afterAll(async () => {
  await prisma.$disconnect();
});
