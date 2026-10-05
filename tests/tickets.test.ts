import { api, bearer, createUser, openTicket } from './helpers';

const validTicket = {
  title: 'Monitor não liga',
  description: 'O monitor da mesa 14 não liga.',
  category: 'HARDWARE',
};

describe('POST /tickets', () => {
  it('abre o chamado como OPEN, MEDIUM, sem técnico e em nome de quem pediu', async () => {
    const user = await createUser('USER');
    const other = await createUser('USER');

    const response = await api
      .post('/tickets')
      .set(...bearer(user))
      // Campos controlados pelo sistema, enviados de propósito: devem ser ignorados
      .send({ ...validTicket, status: 'CLOSED', priority: 'CRITICAL', requesterId: other.id });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      ...validTicket,
      status: 'OPEN',
      priority: 'MEDIUM',
      requesterId: user.id,
      technicianId: null,
      closedAt: null,
    });
  });

  it('registra a criação no histórico', async () => {
    const user = await createUser('USER');
    const ticket = await openTicket(user);

    const history = await api.get(`/tickets/${ticket.id}/history`).set(...bearer(user));

    expect(history.body).toHaveLength(1);
    expect(history.body[0]).toMatchObject({ action: 'CREATED', userId: user.id });
  });

  it('recusa dados inválidos apontando cada campo com problema', async () => {
    const user = await createUser('USER');

    const response = await api
      .post('/tickets')
      .set(...bearer(user))
      .send({ title: 'abc', category: 'CAFE' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('VALIDATION_ERROR');
    expect(response.body.details.map((detail: { field: string }) => detail.field).sort()).toEqual([
      'category',
      'description',
      'title',
    ]);
  });
});

describe('visibilidade dos chamados', () => {
  it('USER não acessa o chamado de outro usuário', async () => {
    const owner = await createUser('USER');
    const intruder = await createUser('USER');
    const ticket = await openTicket(owner);

    const read = await api.get(`/tickets/${ticket.id}`).set(...bearer(intruder));
    const edit = await api
      .patch(`/tickets/${ticket.id}`)
      .set(...bearer(intruder))
      .send({ title: 'Título invadido' });
    const comments = await api.get(`/tickets/${ticket.id}/comments`).set(...bearer(intruder));
    const history = await api.get(`/tickets/${ticket.id}/history`).set(...bearer(intruder));

    for (const response of [read, edit, comments, history]) {
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('TICKET_ACCESS_DENIED');
    }
  });

  it('a listagem mostra a cada perfil apenas o que ele pode ver', async () => {
    const admin = await createUser('ADMIN');
    const tech = await createUser('TECH');
    const otherTech = await createUser('TECH');
    const userA = await createUser('USER');
    const userB = await createUser('USER');

    const free = await openTicket(userA);
    const mine = await openTicket(userB);
    const theirs = await openTicket(userB);
    await api.post(`/tickets/${mine.id}/assign`).set(...bearer(tech));
    await api.post(`/tickets/${theirs.id}/assign`).set(...bearer(otherTech));

    const idsSeenBy = async (user: { token: string }) => {
      const response = await api.get('/tickets').set(...bearer(user));
      return response.body.data.map((ticket: { id: number }) => ticket.id).sort();
    };

    expect(await idsSeenBy(userA)).toEqual([free.id]);
    expect(await idsSeenBy(userB)).toEqual([mine.id, theirs.id]);
    // TECH: os sem técnico e os atribuídos a ele, nunca os de outro técnico
    expect(await idsSeenBy(tech)).toEqual([free.id, mine.id]);
    expect(await idsSeenBy(admin)).toEqual([free.id, mine.id, theirs.id]);
  });

  it('diferencia chamado inexistente de chamado sem acesso', async () => {
    const user = await createUser('USER');

    const response = await api.get('/tickets/999999').set(...bearer(user));

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('TICKET_NOT_FOUND');
  });
});

describe('GET /tickets com filtros e paginação', () => {
  it('filtra por status e pagina sem repetir nem pular chamados', async () => {
    const admin = await createUser('ADMIN');
    const tech = await createUser('TECH');
    const user = await createUser('USER');

    const tickets = [];
    for (let i = 0; i < 5; i++) {
      tickets.push(await openTicket(user));
    }
    await api.post(`/tickets/${tickets[0].id}/assign`).set(...bearer(tech));

    const open = await api.get('/tickets?status=OPEN').set(...bearer(admin));
    const page1 = await api.get('/tickets?limit=2&page=1').set(...bearer(admin));
    const page2 = await api.get('/tickets?limit=2&page=2').set(...bearer(admin));
    const page3 = await api.get('/tickets?limit=2&page=3').set(...bearer(admin));

    expect(open.body.meta.total).toBe(4);
    expect(page1.body.meta).toEqual({ page: 1, limit: 2, total: 5, totalPages: 3 });

    const paged = [...page1.body.data, ...page2.body.data, ...page3.body.data].map((ticket) => ticket.id);
    expect(paged.sort()).toEqual(tickets.map((ticket) => ticket.id).sort());
  });

  it('recusa filtro com valor inexistente em vez de ignorá-lo', async () => {
    const admin = await createUser('ADMIN');

    const response = await api.get('/tickets?status=ABERTO').set(...bearer(admin));

    expect(response.status).toBe(400);
  });
});
