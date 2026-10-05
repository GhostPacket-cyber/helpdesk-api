// Peças reutilizáveis da especificação: esquemas de dados, respostas de erro e autenticação.
// As rotas (paths.ts) apontam para cá com $ref, em vez de repetir as definições.

const uuidExample = '3f2b7c1e-8a4d-4e2b-9c6f-1d5a7b9e0c12';
const dateExample = '2026-10-05T14:30:00.000Z';

export const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

// Monta uma resposta de erro no formato padrão da API, com um exemplo
export function errorResponse(description: string, error: string, message: string, details?: unknown) {
  return {
    description,
    content: {
      'application/json': {
        schema: ref('Error'),
        example: { error, message, ...(details !== undefined && { details }) },
      },
    },
  };
}

const userExample = {
  id: uuidExample,
  name: 'João Usuário',
  email: 'joao@helpdesk.local',
  role: 'USER',
  active: true,
  createdAt: dateExample,
  updatedAt: dateExample,
};

export const components = {
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Token obtido em POST /auth/login. Informe apenas o token, sem a palavra "Bearer".',
    },
  },

  // Respostas de erro comuns a várias rotas
  responses: {
    Unauthorized: errorResponse(
      'Token ausente, inválido ou expirado.',
      'TOKEN_MISSING',
      'Token de autenticação não informado.',
    ),
    Forbidden: errorResponse(
      'O perfil do usuário não tem permissão para esta rota.',
      'FORBIDDEN',
      'Você não tem permissão para acessar este recurso.',
    ),
    ValidationError: errorResponse('Dados de entrada inválidos.', 'VALIDATION_ERROR', 'Dados inválidos.', [
      { field: 'email', message: 'Email inválido.' },
    ]),
    TicketNotFound: errorResponse('Chamado não encontrado.', 'TICKET_NOT_FOUND', 'Chamado não encontrado.'),
    TicketAccessDenied: errorResponse(
      'O chamado existe, mas o usuário não tem acesso a ele (ou o perfil não pode usar esta rota).',
      'TICKET_ACCESS_DENIED',
      'Você não tem acesso a este chamado.',
    ),
    UserNotFound: errorResponse('Usuário não encontrado.', 'USER_NOT_FOUND', 'Usuário não encontrado.'),
  },

  schemas: {
    Role: { type: 'string', enum: ['USER', 'TECH', 'ADMIN'] },
    Status: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED'] },
    Priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    Category: { type: 'string', enum: ['HARDWARE', 'SOFTWARE', 'NETWORK', 'ACCESS', 'PRINTER', 'OTHER'] },
    HistoryAction: {
      type: 'string',
      enum: ['CREATED', 'ASSIGNED', 'STATUS_CHANGED', 'PRIORITY_CHANGED', 'COMMENT_ADDED', 'UPDATED'],
    },

    Error: {
      type: 'object',
      required: ['error', 'message'],
      properties: {
        error: { type: 'string', description: 'Código do erro, estável e legível por máquina.', example: 'TICKET_NOT_FOUND' },
        message: { type: 'string', description: 'Descrição do erro para exibição.', example: 'Chamado não encontrado.' },
        details: { description: 'Informação adicional; o formato depende do erro.' },
      },
    },

    Health: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['ok', 'degraded'] },
        database: { type: 'string', enum: ['up', 'down'] },
        uptime: { type: 'number', description: 'Segundos desde que a API iniciou.', example: 123.45 },
        timestamp: { type: 'string', format: 'date-time', example: dateExample },
      },
    },

    User: {
      type: 'object',
      description: 'Usuário do sistema. A senha nunca é devolvida.',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
        role: ref('Role'),
        active: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
      example: userExample,
    },

    UserSummary: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
      },
      example: { id: uuidExample, name: 'João Usuário', email: 'joao@helpdesk.local' },
    },

    AuthorSummary: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        role: ref('Role'),
      },
      example: { id: uuidExample, name: 'Carlos Técnico', role: 'TECH' },
    },

    RegisterInput: {
      type: 'object',
      required: ['name', 'email', 'password'],
      properties: {
        name: { type: 'string', minLength: 2, maxLength: 100 },
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 8, maxLength: 72 },
      },
      example: { name: 'Pedro Teste', email: 'pedro@teste.com', password: 'senha-de-teste-1' },
    },

    LoginInput: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string' },
      },
      example: { email: 'pedro@teste.com', password: 'senha-de-teste-1' },
    },

    LoginResponse: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'JWT a ser enviado no cabeçalho Authorization.' },
        user: ref('User'),
      },
      example: { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', user: userExample },
    },

    CreateUserInput: {
      type: 'object',
      required: ['name', 'email', 'password'],
      properties: {
        name: { type: 'string', minLength: 2, maxLength: 100 },
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 8, maxLength: 72 },
        role: { allOf: [ref('Role')], default: 'USER' },
      },
      example: { name: 'Rafael Técnico', email: 'rafael@teste.com', password: 'senha-de-teste-2', role: 'TECH' },
    },

    UpdateUserInput: {
      type: 'object',
      description: 'Todos os campos são opcionais, mas ao menos um deve ser enviado.',
      minProperties: 1,
      properties: {
        name: { type: 'string', minLength: 2, maxLength: 100 },
        email: { type: 'string', format: 'email' },
        role: ref('Role'),
      },
      example: { name: 'Rafael Souza', role: 'USER' },
    },

    UpdateUserStatusInput: {
      type: 'object',
      required: ['active'],
      properties: { active: { type: 'boolean' } },
      example: { active: false },
    },

    Ticket: {
      type: 'object',
      properties: {
        id: { type: 'integer', example: 15 },
        title: { type: 'string' },
        description: { type: 'string' },
        category: ref('Category'),
        priority: ref('Priority'),
        status: ref('Status'),
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        closedAt: { type: 'string', format: 'date-time', nullable: true, description: 'Preenchido quando o status vira CLOSED.' },
        requesterId: { type: 'string', format: 'uuid' },
        technicianId: { type: 'string', format: 'uuid', nullable: true },
        requester: ref('UserSummary'),
        technician: { allOf: [ref('UserSummary')], nullable: true, description: 'Nulo enquanto nenhum técnico assumiu.' },
      },
      example: {
        id: 15,
        title: 'Monitor não liga',
        description: 'O monitor da minha mesa não liga, mesmo com o cabo de energia conectado.',
        category: 'HARDWARE',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        createdAt: dateExample,
        updatedAt: dateExample,
        closedAt: null,
        requesterId: uuidExample,
        technicianId: '9d1c4b7a-2e6f-4a3b-8c5d-0f1e2a3b4c5d',
        requester: { id: uuidExample, name: 'João Usuário', email: 'joao@helpdesk.local' },
        technician: { id: '9d1c4b7a-2e6f-4a3b-8c5d-0f1e2a3b4c5d', name: 'Carlos Técnico', email: 'carlos@helpdesk.local' },
      },
    },

    PaginationMeta: {
      type: 'object',
      properties: {
        page: { type: 'integer', example: 1 },
        limit: { type: 'integer', example: 20 },
        total: { type: 'integer', description: 'Total de chamados que atendem ao filtro.', example: 42 },
        totalPages: { type: 'integer', example: 3 },
      },
    },

    TicketList: {
      type: 'object',
      properties: {
        data: { type: 'array', items: ref('Ticket') },
        meta: ref('PaginationMeta'),
      },
    },

    CreateTicketInput: {
      type: 'object',
      description: 'Status, prioridade e solicitante são definidos pelo sistema.',
      required: ['title', 'description', 'category'],
      properties: {
        title: { type: 'string', minLength: 5, maxLength: 150 },
        description: { type: 'string', minLength: 10, maxLength: 5000 },
        category: ref('Category'),
      },
      example: {
        title: 'Monitor não liga',
        description: 'O monitor da minha mesa não liga, mesmo com o cabo de energia conectado.',
        category: 'HARDWARE',
      },
    },

    UpdateTicketInput: {
      type: 'object',
      description: 'Ao menos um campo. Quais campos são aceitos depende de quem faz a requisição.',
      minProperties: 1,
      properties: {
        title: { type: 'string', minLength: 5, maxLength: 150 },
        description: { type: 'string', minLength: 10, maxLength: 5000 },
        category: ref('Category'),
        priority: ref('Priority'),
      },
      example: { priority: 'HIGH' },
    },

    AssignTicketInput: {
      type: 'object',
      properties: {
        technicianId: {
          type: 'string',
          format: 'uuid',
          description: 'Obrigatório para ADMIN. TECH não precisa enviar: assume para si.',
        },
      },
      example: { technicianId: '9d1c4b7a-2e6f-4a3b-8c5d-0f1e2a3b4c5d' },
    },

    UpdateTicketStatusInput: {
      type: 'object',
      required: ['status'],
      properties: { status: ref('Status') },
      example: { status: 'RESOLVED' },
    },

    Comment: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        message: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        authorId: { type: 'string', format: 'uuid' },
        ticketId: { type: 'integer' },
        author: ref('AuthorSummary'),
      },
      example: {
        id: '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d',
        message: 'Vou passar na sua mesa hoje à tarde para trocar o cabo de energia.',
        createdAt: dateExample,
        authorId: '9d1c4b7a-2e6f-4a3b-8c5d-0f1e2a3b4c5d',
        ticketId: 15,
        author: { id: '9d1c4b7a-2e6f-4a3b-8c5d-0f1e2a3b4c5d', name: 'Carlos Técnico', role: 'TECH' },
      },
    },

    CreateCommentInput: {
      type: 'object',
      required: ['message'],
      properties: { message: { type: 'string', minLength: 1, maxLength: 2000 } },
      example: { message: 'Já testei em outra tomada e o monitor continua sem ligar.' },
    },

    HistoryEntry: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        action: ref('HistoryAction'),
        oldValue: { type: 'string', nullable: true, description: 'Valor anterior, quando se aplica.' },
        newValue: { type: 'string', nullable: true, description: 'Valor novo, quando se aplica.' },
        createdAt: { type: 'string', format: 'date-time' },
        ticketId: { type: 'integer' },
        userId: { type: 'string', format: 'uuid', description: 'Quem realizou a ação.' },
        user: ref('AuthorSummary'),
        description: { type: 'string', description: 'Frase pronta para exibição.' },
      },
      example: {
        id: '7c8d9e0f-1a2b-4c3d-9e4f-5a6b7c8d9e0f',
        action: 'STATUS_CHANGED',
        oldValue: 'OPEN',
        newValue: 'IN_PROGRESS',
        createdAt: dateExample,
        ticketId: 15,
        userId: '9d1c4b7a-2e6f-4a3b-8c5d-0f1e2a3b4c5d',
        user: { id: '9d1c4b7a-2e6f-4a3b-8c5d-0f1e2a3b4c5d', name: 'Carlos Técnico', role: 'TECH' },
        description: 'Status alterado de OPEN para IN_PROGRESS',
      },
    },
  },
};
