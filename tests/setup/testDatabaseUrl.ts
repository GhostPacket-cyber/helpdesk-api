import dotenv from 'dotenv';

// Os testes usam um banco separado, no mesmo servidor PostgreSQL do desenvolvimento.
// A URL é a do .env com o nome do banco trocado para "<nome>_test", então não há senha duplicada
// em outro arquivo e os dados de desenvolvimento nunca são tocados.
export function testDatabaseUrl(): string {
  dotenv.config({ quiet: true });

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não definida. Crie o arquivo .env a partir do .env.example.');
  }

  const url = new URL(process.env.DATABASE_URL);
  const database = url.pathname.slice(1);

  if (!database.endsWith('_test')) {
    url.pathname = `/${database}_test`;
  }

  return url.toString();
}
