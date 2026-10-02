import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(404, 'ROUTE_NOT_FOUND', 'Rota não encontrada.'));
}

function isInvalidJsonError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'type' in err && err.type === 'entity.parse.failed';
}

// O Express reconhece um middleware de erro pelos 4 parâmetros, por isso o `_next` precisa existir
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      ...(err.details !== undefined && { details: err.details }),
    });
    return;
  }

  if (isInvalidJsonError(err)) {
    res.status(400).json({
      error: 'INVALID_JSON',
      message: 'O corpo da requisição não é um JSON válido.',
    });
    return;
  }

  // Erro inesperado: o detalhe fica no log do servidor e nunca vai para o cliente
  console.error(err);
  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'Erro interno do servidor.',
  });
}
