import app from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';

const server = app.listen(env.PORT, () => {
  console.log(`Help Desk API rodando em http://localhost:${env.PORT}`);
});

// Encerramento limpo: para de aceitar conexões, espera as requisições em andamento
// terminarem e fecha a conexão com o banco. SIGTERM é o sinal enviado pelo Docker ao parar
// um contêiner; SIGINT é o Ctrl+C no terminal.
function shutdown(signal: string): void {
  console.log(`${signal} recebido, encerrando...`);

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

  // Se alguma conexão não fechar a tempo, encerra mesmo assim
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Erros que escaparam de todo tratamento: o estado do processo deixa de ser confiável,
// então registra-se o erro e encerra-se, para o processo ser reiniciado limpo.
process.on('unhandledRejection', (reason) => {
  console.error('Promise rejeitada sem tratamento:', reason);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Exceção não capturada:', err);
  process.exit(1);
});
