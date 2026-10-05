import { api, bearer, createUser, openTicket } from './helpers';

describe('comentários de um chamado', () => {
  it('solicitante e técnico conversam, e a conversa sai em ordem com os autores', async () => {
    const user = await createUser('USER');
    const tech = await createUser('TECH');
    const ticket = await openTicket(user);
    await api.post(`/tickets/${ticket.id}/assign`).set(...bearer(tech));

    const first = await api
      .post(`/tickets/${ticket.id}/comments`)
      .set(...bearer(user))
      .send({ message: 'Já testei em outra tomada.' });
    await api
      .post(`/tickets/${ticket.id}/comments`)
      .set(...bearer(tech))
      .send({ message: 'Vou trocar o cabo hoje à tarde.' });

    const list = await api.get(`/tickets/${ticket.id}/comments`).set(...bearer(user));

    expect(first.status).toBe(201);
    expect(list.body.map((comment: { message: string; author: { id: string } }) => [comment.author.id, comment.message])).toEqual([
      [user.id, 'Já testei em outra tomada.'],
      [tech.id, 'Vou trocar o cabo hoje à tarde.'],
    ]);
  });

  it('o autor é sempre quem está autenticado, não o que o corpo disser', async () => {
    const user = await createUser('USER');
    const other = await createUser('USER');
    const ticket = await openTicket(user);

    const response = await api
      .post(`/tickets/${ticket.id}/comments`)
      .set(...bearer(user))
      .send({ message: 'Comentário legítimo.', authorId: other.id });

    expect(response.body.authorId).toBe(user.id);
  });

  it('quem não tem acesso ao chamado não comenta', async () => {
    const user = await createUser('USER');
    const outsider = await createUser('USER');
    const ticket = await openTicket(user);

    const response = await api
      .post(`/tickets/${ticket.id}/comments`)
      .set(...bearer(outsider))
      .send({ message: 'Também tenho esse problema.' });

    expect(response.status).toBe(403);
  });
});
