import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';

interface LimiterOptions {
  windowMinutes: number;
  limit: number;
  message: string;
  // true: só as requisições que falharam contam para o limite
  onlyFailures?: boolean;
}

function createLimiter({ windowMinutes, limit, message, onlyFailures = false }: LimiterOptions) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    skipSuccessfulRequests: onlyFailures,
    // Informa ao cliente o limite e quanto falta, nos cabeçalhos RateLimit-*
    standardHeaders: true,
    legacyHeaders: false,
    // Nos testes automatizados o limite atrapalharia: dezenas de logins partem do mesmo endereço
    skip: () => env.NODE_ENV === 'test',
    // Responde no formato padrão de erro da API, pelo tratador central
    handler: (_req, _res, next) => next(new AppError(429, 'TOO_MANY_REQUESTS', message)),
  });
}

// Dificulta a adivinhação de senhas por tentativa: 10 logins errados por endereço IP a cada 15 minutos
export const loginRateLimiter = createLimiter({
  windowMinutes: 15,
  limit: 10,
  onlyFailures: true,
  message: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.',
});

// Dificulta a criação de contas em massa: 20 cadastros por endereço IP a cada hora
export const registerRateLimiter = createLimiter({
  windowMinutes: 60,
  limit: 20,
  message: 'Muitos cadastros a partir deste endereço. Tente novamente mais tarde.',
});
