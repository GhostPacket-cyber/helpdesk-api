import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { Prisma } from '../generated/prisma/client';

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(404, 'ROUTE_NOT_FOUND', 'Rota não encontrada.'));
}

// Converte os erros que não nasceram como AppError, mas que têm uma resposta adequada conhecida.
// Devolve undefined para o que for realmente inesperado.
function translate(err: unknown): AppError | undefined {
  if (err instanceof AppError) {
    return err;
  }

  // Erros do Express e do leitor de JSON: trazem um status 4xx e, às vezes, um `type`
  if (typeof err === 'object' && err !== null) {
    const { type, status } = err as { type?: unknown; status?: unknown };

    if (type === 'entity.parse.failed') {
      return new AppError(400, 'INVALID_JSON', 'O corpo da requisição não é um JSON válido.');
    }
    if (type === 'entity.too.large') {
      return new AppError(413, 'PAYLOAD_TOO_LARGE', 'O corpo da requisição excede o tamanho máximo permitido.');
    }
    if (err instanceof URIError) {
      return new AppError(400, 'INVALID_URL', 'A URL da requisição é inválida.');
    }
    if (typeof status === 'number' && status >= 400 && status < 500) {
      return new AppError(status, 'BAD_REQUEST', 'Requisição inválida.');
    }
  }

  // Rede de segurança para erros do banco que escaparam das verificações dos services
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return new AppError(409, 'CONFLICT', 'Já existe um registro com estes dados.');
    }
    if (err.code === 'P2025') {
      return new AppError(404, 'NOT_FOUND', 'Registro não encontrado.');
    }
  }

  if (isDatabaseUnavailable(err)) {
    return new AppError(503, 'SERVICE_UNAVAILABLE', 'Serviço temporariamente indisponível. Tente novamente em instantes.');
  }

  return undefined;
}

function isDatabaseUnavailable(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  const code = typeof err === 'object' && err !== null ? (err as { code?: unknown }).code : undefined;

  // P1001/P1002: banco inacessível ou sem resposta; ECONNREFUSED: conexão recusada pelo driver
  return code === 'P1001' || code === 'P1002' || code === 'ECONNREFUSED';
}

// O Express reconhece um middleware de erro pelos 4 parâmetros, por isso o `_next` precisa existir
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const appError = translate(err);

  // Tudo que é 5xx vai para o log com a rota, para quem opera o servidor poder investigar
  if (!appError || appError.statusCode >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, err);
  }

  if (!appError) {
    // Erro inesperado: o detalhe fica no log do servidor e nunca vai para o cliente
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Erro interno do servidor.',
    });
    return;
  }

  res.status(appError.statusCode).json({
    error: appError.code,
    message: appError.message,
    ...(appError.details !== undefined && { details: appError.details }),
  });
}
