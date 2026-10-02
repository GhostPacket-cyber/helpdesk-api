import bcrypt from 'bcrypt';
import { prisma } from '../src/config/prisma';
import { Role } from '../src/generated/prisma/client';

// Todos os usuários fictícios usam a mesma senha, definida em SEED_USER_PASSWORD no .env
const seedPassword = process.env.SEED_USER_PASSWORD;

const users: { name: string; email: string; role: Role }[] = [
  { name: 'Ana Administradora', email: 'admin@helpdesk.local', role: 'ADMIN' },
  { name: 'Carlos Técnico', email: 'carlos@helpdesk.local', role: 'TECH' },
  { name: 'Beatriz Técnica', email: 'beatriz@helpdesk.local', role: 'TECH' },
  { name: 'João Usuário', email: 'joao@helpdesk.local', role: 'USER' },
  { name: 'Maria Usuária', email: 'maria@helpdesk.local', role: 'USER' },
];

async function seedUsers(passwordHash: string) {
  const byEmail = new Map<string, string>();

  for (const user of users) {
    // upsert: cria se não existir, mantém se já existir — o seed pode rodar várias vezes
    const saved = await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: { ...user, passwordHash },
    });
    byEmail.set(saved.email, saved.id);
  }

  return (email: string) => byEmail.get(email)!;
}

async function seedTickets(idOf: (email: string) => string) {
  if ((await prisma.ticket.count()) > 0) {
    console.log('Chamados já existem, nenhum foi criado.');
    return;
  }

  const joao = idOf('joao@helpdesk.local');
  const maria = idOf('maria@helpdesk.local');
  const carlos = idOf('carlos@helpdesk.local');

  // Aberto, ainda sem técnico
  await prisma.ticket.create({
    data: {
      title: 'Impressora do 2º andar não imprime',
      description: 'A impressora liga, mas os documentos ficam parados na fila.',
      category: 'PRINTER',
      requesterId: joao,
      history: { create: [{ action: 'CREATED', userId: joao }] },
    },
  });

  // Em atendimento
  await prisma.ticket.create({
    data: {
      title: 'Sem acesso à pasta compartilhada do financeiro',
      description: 'Ao abrir a pasta aparece a mensagem de acesso negado.',
      category: 'ACCESS',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      requesterId: maria,
      technicianId: carlos,
      comments: { create: [{ message: 'Verificando as permissões do seu usuário.', authorId: carlos }] },
      history: {
        create: [
          { action: 'CREATED', userId: maria },
          { action: 'ASSIGNED', newValue: 'Carlos Técnico', userId: carlos },
          { action: 'STATUS_CHANGED', oldValue: 'OPEN', newValue: 'IN_PROGRESS', userId: carlos },
          { action: 'PRIORITY_CHANGED', oldValue: 'MEDIUM', newValue: 'HIGH', userId: carlos },
          { action: 'COMMENT_ADDED', userId: carlos },
        ],
      },
    },
  });

  // Encerrado
  await prisma.ticket.create({
    data: {
      title: 'Notebook não conecta ao Wi-Fi',
      description: 'A rede aparece na lista, mas a conexão falha após digitar a senha.',
      category: 'NETWORK',
      status: 'CLOSED',
      closedAt: new Date(),
      requesterId: joao,
      technicianId: carlos,
      history: {
        create: [
          { action: 'CREATED', userId: joao },
          { action: 'ASSIGNED', newValue: 'Carlos Técnico', userId: carlos },
          { action: 'STATUS_CHANGED', oldValue: 'OPEN', newValue: 'IN_PROGRESS', userId: carlos },
          { action: 'STATUS_CHANGED', oldValue: 'IN_PROGRESS', newValue: 'RESOLVED', userId: carlos },
          { action: 'STATUS_CHANGED', oldValue: 'RESOLVED', newValue: 'CLOSED', userId: carlos },
        ],
      },
    },
  });

  console.log('3 chamados criados.');
}

async function main() {
  if (!seedPassword || seedPassword.length < 8) {
    throw new Error('Defina SEED_USER_PASSWORD no .env com pelo menos 8 caracteres.');
  }

  const idOf = await seedUsers(await bcrypt.hash(seedPassword, 10));
  console.log(`${users.length} usuários garantidos.`);

  await seedTickets(idOf);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
