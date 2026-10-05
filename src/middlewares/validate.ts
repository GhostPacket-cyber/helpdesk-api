import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../errors/AppError';

type Source = 'body' | 'query' | 'params';

function parseOrThrow(schema: z.ZodType, data: unknown, source: Source): unknown {
  const result = schema.safeParse(data);

  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      // Erro sem campo específico (ex.: corpo não é um objeto) é atribuído à origem
      field: issue.path.join('.') || source,
      message: issue.message,
    }));

    throw new AppError(400, 'VALIDATION_ERROR', 'Dados inválidos.', details);
  }

  return result.data;
}

// Valida req.body com o schema informado e o substitui pelo resultado já limpo e convertido
export function validateBody(schema: z.ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // Sem body, req.body é undefined: validar {} gera um erro por campo obrigatório
    req.body = parseOrThrow(schema, req.body ?? {}, 'body');
    next();
  };
}

// Valida a query string (ex.: ?status=OPEN&page=2).
// No Express 5 req.query é somente leitura, então o resultado convertido fica em res.locals.query.
export function validateQuery(schema: z.ZodType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    res.locals.query = parseOrThrow(schema, req.query, 'query');
    next();
  };
}

// Valida os parâmetros da URL (ex.: o :id de /users/:id)
export function validateParams(schema: z.ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    parseOrThrow(schema, req.params, 'params');
    next();
  };
}
