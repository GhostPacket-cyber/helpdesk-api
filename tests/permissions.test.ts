import { api, bearer, createUser, openTicket, TEST_PASSWORD } from './helpers';

describe('administração de usuários', () => {
  it.each(['USER', 'TECH'] as const)('é negada ao perfil %s', async (role) => {
    const user = await createUser(role);

    const list = await api.get('/users').set(...bearer(user));
    const create = await api
      .post('/users')
      .set(...bearer(user))
      .send({ name: 'Novo Admin', email: 'novo@teste.com', password: TEST_PASSWORD, role: 'ADMIN' });

    expect(list.status).toBe(403);
    expect(create.status).toBe(403);
    expect(create.body.error).toBe('FORBIDDEN');
  });

  it('é permitida ao ADMIN, que pode criar usuários de qualquer perfil', async () => {
    const admin = await createUser('ADMIN');

    const create = await api
      .post('/users')
      .set(...bearer(admin))
      .send({ name: 'Novo Técnico', email: 'tecnico@teste.com', password: TEST_PASSWORD, role: 'TECH' });
    const list = await api.get('/users').set(...bearer(admin));

    expect(create.status).toBe(201);
    expect(create.body.role).toBe('TECH');
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(2);
    expect(list.body.every((user: object) => !('passwordHash' in user))).toBe(true);
  });

  it('impede o ADMIN de desativar a própria conta', async () => {
    const admin = await createUser('ADMIN');

    const response = await api
      .patch(`/users/${admin.id}/status`)
      .set(...bearer(admin))
      .send({ active: false });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('CANNOT_DEACTIVATE_SELF');
  });
});

describe('ações de chamado por perfil', () => {
  it('TECH não abre chamados', async () => {
    const tech = await createUser('TECH');

    const response = await api
      .post('/tickets')
      .set(...bearer(tech))
      .send({ title: 'Monitor não liga', description: 'O monitor da mesa 14 não liga.', category: 'HARDWARE' });

    expect(response.status).toBe(403);
  });

  it('USER não assume chamados nem altera status, nem dos próprios', async () => {
    const user = await createUser('USER');
    const ticket = await openTicket(user);

    const assign = await api.post(`/tickets/${ticket.id}/assign`).set(...bearer(user));
    const status = await api
      .patch(`/tickets/${ticket.id}/status`)
      .set(...bearer(user))
      .send({ status: 'RESOLVED' });

    expect(assign.status).toBe(403);
    expect(status.status).toBe(403);
  });
});
