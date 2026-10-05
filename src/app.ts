import './config/zod';
import express from 'express';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import routes from './routes';

const app = express();

// Converte o body JSON das requisições em objeto (req.body), com tamanho máximo de 100 KB.
// O reviver remove o caractere nulo dos textos: ele nunca é legítimo e o PostgreSQL o rejeita.
app.use(
  express.json({
    limit: '100kb',
    reviver: (_key, value) => (typeof value === 'string' ? value.replaceAll('\u0000', '') : value),
  }),
);

app.use(routes);

// Nenhuma rota acima respondeu
app.use(notFoundHandler);

// Sempre por último: recebe todo erro lançado nas rotas e middlewares
app.use(errorHandler);

export default app;
