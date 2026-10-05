import './config/zod';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import routes from './routes';

const app = express();

// Cabeçalhos HTTP de segurança (e remove o X-Powered-By, que anuncia o uso do Express)
app.use(helmet());

// Só os sites listados em CORS_ORIGINS podem chamar a API a partir do navegador
app.use(
  cors({
    origin: env.CORS_ORIGINS,
    methods: ['GET', 'POST', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

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
