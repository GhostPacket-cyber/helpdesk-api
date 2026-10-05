/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],

  // Roda uma vez antes de tudo: cria e migra o banco de testes
  globalSetup: '<rootDir>/tests/setup/globalSetup.ts',
  // Roda antes de cada arquivo de teste carregar a aplicação: aponta para o banco de testes
  setupFiles: ['<rootDir>/tests/setup/env.ts'],
  // Roda dentro de cada arquivo de teste: limpa o banco entre os testes
  setupFilesAfterEnv: ['<rootDir>/tests/setup/database.ts'],

  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tests/tsconfig.json', diagnostics: { ignoreCodes: [151002] } }],
  },
  // O Prisma Client gerado importa seus arquivos .ts com extensão .js
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },

  // Todos os testes usam o mesmo banco, então os arquivos rodam um de cada vez
  maxWorkers: 1,
};
