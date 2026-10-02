import express from 'express';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import routes from './routes';

const app = express();

// Converte o body JSON das requisições em objeto (req.body)
app.use(express.json());

app.use(routes);

// Nenhuma rota acima respondeu
app.use(notFoundHandler);

// Sempre por último: recebe todo erro lançado nas rotas e middlewares
app.use(errorHandler);

export default app;
