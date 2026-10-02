import express, { Request, Response } from 'express';
import routes from './routes';

const app = express();

// Converte o body JSON das requisições em objeto (req.body)
app.use(express.json());

app.use(routes);

// Nenhuma rota acima respondeu: devolve 404 no formato padrão de erro da API
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'ROUTE_NOT_FOUND',
    message: 'Rota não encontrada.',
  });
});

export default app;
