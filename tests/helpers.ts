import bcrypt from 'bcrypt';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';
import { Role } from '../src/generated/prisma/client';
import { tokenService } from '../src/services/token.service';

export const api = request(app);

export const TEST_PASSWORD = 'senha-de-teste-123';

// Custo mínimo do bcrypt: nos testes interessa a rapidez, não a resistência do hash
const passwordHash = bcrypt.hashSync(TEST_PASSWORD, 4);

let sequence = 0;

// Cria um usuário direto no banco e devolve um token válido para ele.
// Ir pelo banco, e não pela API, mantém cada teste focado no que ele quer verificar.
export async function createUser(role: Role = 'USER', overrides: { name?: string; active?: boolean } = {}) {
  sequence += 1;

  const user = await prisma.user.create({
    data: {
      name: overrides.name ?? `${role} ${sequence}`,
      email: `${role.toLowerCase()}${sequence}@teste.com`,
      passwordHash,
      role,
      active: overrides.active ?? true,
    },
  });

  return { ...user, token: tokenService.signAccessToken(user) };
}

export function bearer(user: { token: string }): [string, string] {
  return ['Authorization', `Bearer ${user.token}`];
}

// Abre um chamado pela API, em nome do usuário informado
export async function openTicket(requester: { token: string }) {
  const response = await api
    .post('/tickets')
    .set(...bearer(requester))
    .send({ title: 'Monitor não liga', description: 'O monitor da mesa 14 não liga.', category: 'HARDWARE' });

  return response.body as { id: number };
}

export function setStatus(ticketId: number, user: { token: string }, status: string) {
  return api
    .patch(`/tickets/${ticketId}/status`)
    .set(...bearer(user))
    .send({ status });
}
