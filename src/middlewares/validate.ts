import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../errors/AppError';

function parseOrThrow(schema: z.ZodType, data: unknown): unknown {
  const result = schema.safeParse(data);

  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
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
    req.body = parseOrThrow(schema, req.body ?? {});
    next();
  };
}

// Valida os parâmetros da URL (ex.: o :id de /users/:id)
export function validateParams(schema: z.ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    parseOrThrow(schema, req.params);
    next();
  };
}
