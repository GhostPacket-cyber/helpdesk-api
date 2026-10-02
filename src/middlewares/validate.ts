import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../errors/AppError';

// Valida req.body com o schema informado e o substitui pelo resultado já limpo e convertido
export function validateBody(schema: z.ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // Sem body, req.body é undefined: validar {} gera um erro por campo obrigatório
    const result = schema.safeParse(req.body ?? {});

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      throw new AppError(400, 'VALIDATION_ERROR', 'Dados inválidos.', details);
    }

    req.body = result.data;
    next();
  };
}
