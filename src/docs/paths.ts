import { errorResponse, ref } from './components';

// Atalhos para os trechos que se repetem em quase toda rota

const json = (description: string, schema: object) => ({
  description,
  content: { 'application/json': { schema } },
});

const body = (schemaName: string, required = true) => ({
  required,
  content: { 'application/json': { schema: ref(schemaName) } },
});

const response = (name: string) => ({ $ref: `#/components/responses/${name}` });

const ticketId = {
  name: 'id',
  in: 'path',
  required: true,
  description: 'Número do chamado.',
  schema: { type: 'integer', minimum: 1 },
  example: 1,
};

const userId = {
  name: 'id',
  in: 'path',
  required: true,
  description: 'Identificador (UUID) do usuário.',
  schema: { type: 'string', format: 'uuid' },
};

const ticketClosed = errorResponse('O chamado está encerrado.', 'TICKET_CLOSED', 'Chamado encerrado não pode ser alterado.');
const emailConflict = errorResponse('Email já cadastrado.', 'EMAIL_ALREADY_EXISTS', 'Já existe um usuário com este email.');

// Rotas públicas declaram `security: []` para sobrepor a exigência global de token
const publicRoute = { security: [] };

export const paths = {
  '/health': {
    get: {
      tags: ['Sistema'],
      summary: 'Verifica se a API e o banco estão no ar',
      ...publicRoute,
      responses: {
        200: json('API e banco funcionando.', ref('Health')),
        503: json('API no ar, banco inacessível.', ref('Health')),
      },
    },
  },

  '/auth/register': {
    post: {
      tags: ['Autenticação'],
      summary: 'Cria uma conta',
      description: 'Cadastro público. A conta é sempre criada com o perfil USER; um campo `role` no corpo é ignorado.',
      ...publicRoute,
      requestBody: body('RegisterInput'),
      responses: {
        201: json('Conta criada.', ref('User')),
        400: response('ValidationError'),
        409: emailConflict,
      },
    },
  },

  '/auth/login': {
    post: {
      tags: ['Autenticação'],
      summary: 'Autentica e devolve um token JWT',
      description:
        'Copie o `token` da resposta, clique em **Authorize** no topo da página e cole-o. ' +
        'Os usuários do seed (`admin@helpdesk.local`, `carlos@helpdesk.local`, `joao@helpdesk.local`...) ' +
        'usam a senha definida em `SEED_USER_PASSWORD` no arquivo `.env`.',
      ...publicRoute,
      requestBody: body('LoginInput'),
      responses: {
        200: json('Login realizado.', ref('LoginResponse')),
        400: response('ValidationError'),
        401: errorResponse('Email inexistente ou senha incorreta.', 'INVALID_CREDENTIALS', 'Email ou senha inválidos.'),
        403: errorResponse('Senha correta, mas a conta está desativada.', 'USER_INACTIVE', 'Usuário desativado. Procure um administrador.'),
      },
    },
  },

  '/auth/me': {
    get: {
      tags: ['Autenticação'],
      summary: 'Devolve o perfil do usuário autenticado',
      responses: {
        200: json('Dados do usuário dono do token.', ref('User')),
        401: response('Unauthorized'),
        403: errorResponse('A conta foi desativada depois do login.', 'USER_INACTIVE', 'Usuário desativado. Procure um administrador.'),
      },
    },
  },

  '/users': {
    get: {
      tags: ['Usuários'],
      summary: 'Lista todos os usuários',
      description: 'Somente ADMIN.',
      responses: {
        200: json('Usuários em ordem alfabética.', { type: 'array', items: ref('User') }),
        401: response('Unauthorized'),
        403: response('Forbidden'),
      },
    },
    post: {
      tags: ['Usuários'],
      summary: 'Cria um usuário com qualquer perfil',
      description: 'Somente ADMIN. Sem `role`, o usuário é criado como USER.',
      requestBody: body('CreateUserInput'),
      responses: {
        201: json('Usuário criado.', ref('User')),
        400: response('ValidationError'),
        401: response('Unauthorized'),
        403: response('Forbidden'),
        409: emailConflict,
      },
    },
  },

  '/users/{id}': {
    get: {
      tags: ['Usuários'],
      summary: 'Consulta um usuário',
      description: 'Somente ADMIN.',
      parameters: [userId],
      responses: {
        200: json('Usuário encontrado.', ref('User')),
        400: response('ValidationError'),
        401: response('Unauthorized'),
        403: response('Forbidden'),
        404: response('UserNotFound'),
      },
    },
    patch: {
      tags: ['Usuários'],
      summary: 'Altera nome, email ou perfil',
      description: 'Somente ADMIN. Um administrador não pode alterar o próprio perfil.',
      parameters: [userId],
      requestBody: body('UpdateUserInput'),
      responses: {
        200: json('Usuário atualizado.', ref('User')),
        400: response('ValidationError'),
        401: response('Unauthorized'),
        403: errorResponse(
          'Perfil sem permissão, ou tentativa de alterar o próprio perfil.',
          'CANNOT_CHANGE_OWN_ROLE',
          'Você não pode alterar o seu próprio perfil.',
        ),
        404: response('UserNotFound'),
        409: emailConflict,
      },
    },
  },

  '/users/{id}/status': {
    patch: {
      tags: ['Usuários'],
      summary: 'Ativa ou desativa um usuário',
      description:
        'Somente ADMIN. Usuários não são apagados, apenas desativados. ' +
        'Um usuário desativado não faz login e seus tokens deixam de valer imediatamente.',
      parameters: [userId],
      requestBody: body('UpdateUserStatusInput'),
      responses: {
        200: json('Situação atualizada.', ref('User')),
        400: response('ValidationError'),
        401: response('Unauthorized'),
        403: errorResponse(
          'Perfil sem permissão, ou tentativa de desativar a própria conta.',
          'CANNOT_DEACTIVATE_SELF',
          'Você não pode desativar a sua própria conta.',
        ),
        404: response('UserNotFound'),
      },
    },
  },

  '/tickets': {
    post: {
      tags: ['Chamados'],
      summary: 'Abre um chamado',
      description: 'USER e ADMIN. O chamado nasce com status OPEN, prioridade MEDIUM e sem técnico.',
      requestBody: body('CreateTicketInput'),
      responses: {
        201: json('Chamado criado.', ref('Ticket')),
        400: response('ValidationError'),
        401: response('Unauthorized'),
        403: response('Forbidden'),
      },
    },
    get: {
      tags: ['Chamados'],
      summary: 'Lista chamados com filtros e paginação',
      description:
        'O resultado depende do perfil: USER vê os chamados que abriu; TECH vê os sem técnico e os atribuídos a ele; ' +
        'ADMIN vê todos. Os filtros só restringem dentro do que o perfil já enxerga.',
      parameters: [
        { name: 'status', in: 'query', schema: ref('Status') },
        { name: 'priority', in: 'query', schema: ref('Priority') },
        { name: 'category', in: 'query', schema: ref('Category') },
        { name: 'technician', in: 'query', description: 'UUID do técnico responsável.', schema: { type: 'string', format: 'uuid' } },
        { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
      ],
      responses: {
        200: json('Página de chamados, do mais recente para o mais antigo.', ref('TicketList')),
        400: response('ValidationError'),
        401: response('Unauthorized'),
      },
    },
  },

  '/tickets/{id}': {
    get: {
      tags: ['Chamados'],
      summary: 'Consulta um chamado',
      parameters: [ticketId],
      responses: {
        200: json('Chamado encontrado.', ref('Ticket')),
        400: response('ValidationError'),
        401: response('Unauthorized'),
        403: response('TicketAccessDenied'),
        404: response('TicketNotFound'),
      },
    },
    patch: {
      tags: ['Chamados'],
      summary: 'Altera título, descrição, categoria ou prioridade',
      description:
        'Os campos aceitos dependem de quem faz a requisição:\n\n' +
        '- **Solicitante**, com o chamado ainda OPEN: `title`, `description`\n' +
        '- **Técnico responsável**: `category`, `priority`\n' +
        '- **ADMIN**: todos\n\n' +
        'Status e técnico têm rotas próprias (`/status` e `/assign`).',
      parameters: [ticketId],
      requestBody: body('UpdateTicketInput'),
      responses: {
        200: json('Chamado atualizado.', ref('Ticket')),
        400: response('ValidationError'),
        401: response('Unauthorized'),
        403: errorResponse(
          'Sem acesso ao chamado, ou o corpo contém campos que o usuário não pode alterar.',
          'TICKET_FIELD_NOT_ALLOWED',
          'Você não pode alterar estes campos do chamado.',
          ['priority'],
        ),
        404: response('TicketNotFound'),
        409: ticketClosed,
      },
    },
  },

  '/tickets/{id}/assign': {
    post: {
      tags: ['Chamados'],
      summary: 'Assume ou atribui um chamado',
      description:
        '- **TECH**: chame sem corpo para assumir o chamado para si. Só funciona se ele ainda não tiver técnico.\n' +
        '- **ADMIN**: informe `technicianId` para atribuir ou reatribuir.\n\n' +
        'Um chamado OPEN passa automaticamente para IN_PROGRESS.',
      parameters: [ticketId],
      requestBody: body('AssignTicketInput', false),
      responses: {
        200: json('Chamado atribuído.', ref('Ticket')),
        400: errorResponse(
          'Dados inválidos, ou o usuário informado não é um técnico ativo.',
          'INVALID_TECHNICIAN',
          'O usuário informado não é um técnico ativo.',
        ),
        401: response('Unauthorized'),
        403: response('TicketAccessDenied'),
        404: response('TicketNotFound'),
        409: errorResponse(
          'O chamado já tem técnico (para TECH), já está com o técnico informado, ou está encerrado.',
          'TICKET_ALREADY_ASSIGNED',
          'Este chamado já está atribuído a um técnico.',
        ),
      },
    },
  },

  '/tickets/{id}/status': {
    patch: {
      tags: ['Chamados'],
      summary: 'Altera o status de um chamado',
      description:
        'Técnico responsável ou ADMIN. Transições permitidas:\n\n' +
        '| De | Para |\n|---|---|\n' +
        '| OPEN | nenhuma (use `/assign`) |\n' +
        '| IN_PROGRESS | WAITING, RESOLVED |\n' +
        '| WAITING | IN_PROGRESS, RESOLVED |\n' +
        '| RESOLVED | CLOSED, IN_PROGRESS |\n' +
        '| CLOSED | nenhuma |\n\n' +
        'Ao entrar em CLOSED, `closedAt` é preenchido.',
      parameters: [ticketId],
      requestBody: body('UpdateTicketStatusInput'),
      responses: {
        200: json('Status alterado.', ref('Ticket')),
        400: response('ValidationError'),
        401: response('Unauthorized'),
        403: errorResponse(
          'Sem acesso ao chamado, ou o usuário não é o técnico responsável.',
          'NOT_TICKET_TECHNICIAN',
          'Apenas o técnico responsável ou um administrador pode alterar o status.',
        ),
        404: response('TicketNotFound'),
        409: errorResponse(
          'A transição não é permitida a partir do status atual.',
          'INVALID_STATUS_TRANSITION',
          'Não é possível alterar o status de IN_PROGRESS para CLOSED.',
          { from: 'IN_PROGRESS', to: 'CLOSED', allowed: ['WAITING', 'RESOLVED'] },
        ),
      },
    },
  },

  '/tickets/{id}/comments': {
    post: {
      tags: ['Comentários'],
      summary: 'Adiciona um comentário ao chamado',
      description: 'Qualquer pessoa com acesso ao chamado. Chamados CLOSED não aceitam novos comentários.',
      parameters: [ticketId],
      requestBody: body('CreateCommentInput'),
      responses: {
        201: json('Comentário criado.', ref('Comment')),
        400: response('ValidationError'),
        401: response('Unauthorized'),
        403: response('TicketAccessDenied'),
        404: response('TicketNotFound'),
        409: errorResponse('O chamado está encerrado.', 'TICKET_CLOSED', 'Chamado encerrado não aceita novos comentários.'),
      },
    },
    get: {
      tags: ['Comentários'],
      summary: 'Lista os comentários do chamado',
      parameters: [ticketId],
      responses: {
        200: json('Comentários, do mais antigo para o mais recente.', { type: 'array', items: ref('Comment') }),
        400: response('ValidationError'),
        401: response('Unauthorized'),
        403: response('TicketAccessDenied'),
        404: response('TicketNotFound'),
      },
    },
  },

  '/tickets/{id}/history': {
    get: {
      tags: ['Histórico'],
      summary: 'Lista o histórico de alterações do chamado',
      description: 'Registro somente leitura, criado pelo sistema a cada ação sobre o chamado.',
      parameters: [ticketId],
      responses: {
        200: json('Registros em ordem cronológica.', { type: 'array', items: ref('HistoryEntry') }),
        400: response('ValidationError'),
        401: response('Unauthorized'),
        403: response('TicketAccessDenied'),
        404: response('TicketNotFound'),
      },
    },
  },
};
