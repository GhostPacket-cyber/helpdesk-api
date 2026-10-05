import { api, bearer, createUser, openTicket, setStatus } from './helpers';

describe('atribuição de chamados', () => {
  it('técnico assume um chamado livre, que entra em atendimento', async () => {
    const user = await createUser('USER');
    const tech = await createUser('TECH');
    const ticket = await openTicket(user);

    const response = await api.post(`/tickets/${ticket.id}/assign`).set(...bearer(tech));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'IN_PROGRESS', technicianId: tech.id });
    expect(response.body.technician.name).toBe(tech.name);
  });

  it('um chamado já assumido não pode ser assumido de novo', async () => {
    const user = await createUser('USER');
    const tech = await createUser('TECH');
    const ticket = await openTicket(user);
    await api.post(`/tickets/${ticket.id}/assign`).set(...bearer(tech));

    const again = await api.post(`/tickets/${ticket.id}/assign`).set(...bearer(tech));

    expect(again.status).toBe(409);
    expect(again.body.error).toBe('TICKET_ALREADY_ASSIGNED');
  });

  it('dois técnicos simultâneos: apenas um fica com o chamado', async () => {
    const user = await createUser('USER');
    const techA = await createUser('TECH');
    const techB = await createUser('TECH');
    const admin = await createUser('ADMIN');
    const ticket = await openTicket(user);

    const responses = await Promise.all([
      api.post(`/tickets/${ticket.id}/assign`).set(...bearer(techA)),
      api.post(`/tickets/${ticket.id}/assign`).set(...bearer(techB)),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);

    const winner = responses.find((response) => response.status === 200)!;
    const final = await api.get(`/tickets/${ticket.id}`).set(...bearer(admin));
    expect(final.body.technicianId).toBe(winner.body.technicianId);
  });

  it('ADMIN atribui a um técnico, e só a um técnico ativo', async () => {
    const admin = await createUser('ADMIN');
    const user = await createUser('USER');
    const tech = await createUser('TECH');
    const ticket = await openTicket(user);

    const toUser = await api
      .post(`/tickets/${ticket.id}/assign`)
      .set(...bearer(admin))
      .send({ technicianId: user.id });
    const toTech = await api
      .post(`/tickets/${ticket.id}/assign`)
      .set(...bearer(admin))
      .send({ technicianId: tech.id });

    expect(toUser.status).toBe(400);
    expect(toUser.body.error).toBe('INVALID_TECHNICIAN');
    expect(toTech.status).toBe(200);
    expect(toTech.body.technicianId).toBe(tech.id);
  });
});

describe('alteração de status', () => {
  // Deixa um chamado em atendimento (IN_PROGRESS) com um técnico responsável
  async function ticketInProgress() {
    const user = await createUser('USER');
    const tech = await createUser('TECH');
    const ticket = await openTicket(user);
    await api.post(`/tickets/${ticket.id}/assign`).set(...bearer(tech));

    return { user, tech, ticket };
  }

  it('segue o fluxo de atendimento até a resolução', async () => {
    const { tech, ticket } = await ticketInProgress();

    const waiting = await setStatus(ticket.id, tech, 'WAITING');
    const resumed = await setStatus(ticket.id, tech, 'IN_PROGRESS');
    const resolved = await setStatus(ticket.id, tech, 'RESOLVED');

    expect([waiting.status, resumed.status, resolved.status]).toEqual([200, 200, 200]);
    expect(resolved.body.status).toBe('RESOLVED');
    expect(resolved.body.closedAt).toBeNull();
  });

  it('recusa transição que pula etapas, informando as permitidas', async () => {
    const { tech, ticket } = await ticketInProgress();

    const response = await setStatus(ticket.id, tech, 'CLOSED');

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('INVALID_STATUS_TRANSITION');
    expect(response.body.details).toEqual({ from: 'IN_PROGRESS', to: 'CLOSED', allowed: ['WAITING', 'RESOLVED'] });
  });

  it('chamado sem técnico não muda de status', async () => {
    const admin = await createUser('ADMIN');
    const user = await createUser('USER');
    const ticket = await openTicket(user);

    const response = await setStatus(ticket.id, admin, 'IN_PROGRESS');

    expect(response.status).toBe(409);
  });

  it('só o técnico responsável ou um ADMIN altera o status', async () => {
    const { ticket } = await ticketInProgress();
    const otherTech = await createUser('TECH');
    const admin = await createUser('ADMIN');

    const byOtherTech = await setStatus(ticket.id, otherTech, 'RESOLVED');
    const byAdmin = await setStatus(ticket.id, admin, 'RESOLVED');

    expect(byOtherTech.status).toBe(403);
    expect(byAdmin.status).toBe(200);
  });

  it('permite reabrir um chamado resolvido', async () => {
    const { tech, ticket } = await ticketInProgress();
    await setStatus(ticket.id, tech, 'RESOLVED');

    const response = await setStatus(ticket.id, tech, 'IN_PROGRESS');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('IN_PROGRESS');
  });
});

describe('encerramento de chamado', () => {
  async function closedTicket() {
    const user = await createUser('USER');
    const tech = await createUser('TECH');
    const ticket = await openTicket(user);
    await api.post(`/tickets/${ticket.id}/assign`).set(...bearer(tech));
    await setStatus(ticket.id, tech, 'RESOLVED');
    const closed = await setStatus(ticket.id, tech, 'CLOSED');

    return { user, tech, ticket, closed };
  }

  it('registra a data de encerramento', async () => {
    const before = Date.now();

    const { closed } = await closedTicket();

    expect(closed.status).toBe(200);
    expect(closed.body.status).toBe('CLOSED');
    const closedAt = new Date(closed.body.closedAt).getTime();
    expect(closedAt).toBeGreaterThanOrEqual(before - 1000);
    expect(closedAt).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it('torna o chamado definitivo: sem novo status, edição, atribuição ou comentário', async () => {
    const { user, tech, ticket } = await closedTicket();
    const admin = await createUser('ADMIN');

    const reopen = await setStatus(ticket.id, admin, 'IN_PROGRESS');
    const edit = await api
      .patch(`/tickets/${ticket.id}`)
      .set(...bearer(admin))
      .send({ priority: 'LOW' });
    const reassign = await api
      .post(`/tickets/${ticket.id}/assign`)
      .set(...bearer(admin))
      .send({ technicianId: tech.id });
    const comment = await api
      .post(`/tickets/${ticket.id}/comments`)
      .set(...bearer(user))
      .send({ message: 'Ainda dá para comentar?' });

    expect([reopen.status, edit.status, reassign.status, comment.status]).toEqual([409, 409, 409, 409]);
  });

  it('deixa o histórico completo do atendimento, em ordem', async () => {
    const { user, ticket } = await closedTicket();

    const history = await api.get(`/tickets/${ticket.id}/history`).set(...bearer(user));

    expect(history.body.map((entry: { action: string; newValue: string | null }) => [entry.action, entry.newValue])).toEqual([
      ['CREATED', null],
      ['ASSIGNED', expect.any(String)],
      ['STATUS_CHANGED', 'IN_PROGRESS'],
      ['STATUS_CHANGED', 'RESOLVED'],
      ['STATUS_CHANGED', 'CLOSED'],
    ]);
  });
});
