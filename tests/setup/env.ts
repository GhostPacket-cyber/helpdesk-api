import { testDatabaseUrl } from './testDatabaseUrl';

// Executado antes de a aplicação ser importada em cada arquivo de teste.
// Como src/config/env.ts não sobrescreve variáveis já definidas, o que for definido aqui prevalece.
process.env.DATABASE_URL = testDatabaseUrl();
process.env.NODE_ENV = 'test';
