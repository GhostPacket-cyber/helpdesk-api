import { prisma } from '../src/config/prisma';
import { api, bearer, createUser, TEST_PASSWORD } from './helpers';

describe('POST /auth/register', () => {
  it('cria a conta como USER e não devolve a senha', async () => {
    const response = await api
      .post('/auth/register')
      .send({ name: 'Pedro Teste', email: 'Pedro@Teste.com', password: TEST_PASSWORD, role: 'ADMIN' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ name: 'Pedro Teste', email: 'pedro@teste.com', role: 'USER', active: true });
    expect(response.body).not.toHaveProperty('password');
    expect(response.body).not.toHaveProperty('passwordHash');
  });

  it('guarda a senha como hash, nunca em texto puro', async () => {
    await api.post('/auth/register').send({ name: 'Pedro Teste', email: 'pedro@teste.com', password: TEST_PASSWORD });

    const stored = await prisma.user.findUniqueOrThrow({
      where: { email: 'pedro@teste.com' },
      omit: { passwordHash: false },
    });

    expect(stored.passwordHash).not.toBe(TEST_PASSWORD);
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('recusa um email já cadastrado', async () => {
    const existing = await createUser();

    const response = await api
      .post('/auth/register')
      .send({ name: 'Outra Pessoa', email: existing.email, password: TEST_PASSWORD });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('EMAIL_ALREADY_EXISTS');
  });
});

describe('POST /auth/login', () => {
  it('devolve um token que dá acesso às rotas protegidas', async () => {
    const user = await createUser();

    const login = await api.post('/auth/login').send({ email: user.email, password: TEST_PASSWORD });

    expect(login.status).toBe(200);
    expect(login.body.user).toMatchObject({ id: user.id, email: user.email });
    expect(login.body.user).not.toHaveProperty('passwordHash');

    const me = await api.get('/auth/me').set('Authorization', `Bearer ${login.body.token}`);

    expect(me.status).toBe(200);
    expect(me.body.id).toBe(user.id);
  });

  it('recusa senha incorreta', async () => {
    const user = await createUser();

    const response = await api.post('/auth/login').send({ email: user.email, password: 'senha-errada' });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('INVALID_CREDENTIALS');
    expect(response.body).not.toHaveProperty('token');
  });

  it('responde igual para email inexistente, sem revelar quais emails existem', async () => {
    const user = await createUser();

    const wrongPassword = await api.post('/auth/login').send({ email: user.email, password: 'senha-errada' });
    const unknownEmail = await api.post('/auth/login').send({ email: 'ninguem@teste.com', password: 'senha-errada' });

    expect(unknownEmail.status).toBe(wrongPassword.status);
    expect(unknownEmail.body).toEqual(wrongPassword.body);
  });

  it('recusa usuário desativado, mesmo com a senha correta', async () => {
    const user = await createUser('USER', { active: false });

    const response = await api.post('/auth/login').send({ email: user.email, password: TEST_PASSWORD });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('USER_INACTIVE');
  });
});

describe('rotas protegidas', () => {
  it('recusam requisição sem token', async () => {
    const response = await api.get('/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('TOKEN_MISSING');
  });

  it('recusam token adulterado', async () => {
    const user = await createUser();

    const response = await api.get('/auth/me').set('Authorization', `Bearer ${user.token}x`);

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('TOKEN_INVALID');
  });

  it('deixam de aceitar o token quando o usuário é desativado', async () => {
    const user = await createUser();
    await prisma.user.update({ where: { id: user.id }, data: { active: false } });

    const response = await api.get('/auth/me').set(...bearer(user));

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('USER_INACTIVE');
  });
});
