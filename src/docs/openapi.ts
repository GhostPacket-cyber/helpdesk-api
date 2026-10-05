import { components } from './components';
import { paths } from './paths';

// Especificação OpenAPI da API: é a partir deste objeto que o Swagger UI monta a página /api/docs
export const openapiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Help Desk API',
    version: '1.0.0',
    description:
      'API REST para gerenciamento de chamados de suporte técnico.\n\n' +
      '**Como testar:** execute `POST /auth/login`, copie o `token` da resposta, ' +
      'clique em **Authorize** e cole-o. As demais rotas passam a enviar o token automaticamente.\n\n' +
      '**Perfis:** `USER` abre e acompanha os próprios chamados; `TECH` assume e atende chamados; ' +
      '`ADMIN` gerencia usuários e vê tudo.\n\n' +
      '**Erros:** toda resposta de erro tem o formato `{ "error": "CODIGO", "message": "..." }`, ' +
      'com um campo `details` opcional.',
  },
  // URL relativa: o Swagger chama a mesma origem de onde a página foi servida
  servers: [{ url: '/' }],
  tags: [
    { name: 'Autenticação', description: 'Cadastro, login e perfil' },
    { name: 'Chamados', description: 'Abertura, consulta, atribuição e status' },
    { name: 'Comentários', description: 'Conversa dentro de um chamado' },
    { name: 'Histórico', description: 'Trilha de auditoria de um chamado' },
    { name: 'Usuários', description: 'Administração de usuários (somente ADMIN)' },
    { name: 'Sistema', description: 'Monitoramento' },
  ],
  // Por padrão toda rota exige token; as públicas declaram `security: []`
  security: [{ bearerAuth: [] }],
  paths,
  components,
};
