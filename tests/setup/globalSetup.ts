import { execSync } from 'node:child_process';
import { testDatabaseUrl } from './testDatabaseUrl';

// Executado uma única vez, antes de todos os testes.
// `migrate deploy` cria o banco de testes se ele não existir e aplica as migrations pendentes.
export default function globalSetup(): void {
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: testDatabaseUrl() },
    stdio: 'pipe',
  });
}
