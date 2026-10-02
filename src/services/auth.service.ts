import bcrypt from 'bcrypt';
import { AppError } from '../errors/AppError';
import { Prisma } from '../generated/prisma/client';
import { userRepository } from '../repositories/user.repository';
import { LoginInput, RegisterInput } from '../validators/auth.validator';
import { tokenService } from './token.service';

// Custo do bcrypt: cada +1 dobra o tempo para gerar (e para atacar) um hash
const SALT_ROUNDS = 10;

function emailAlreadyExists(): AppError {
  return new AppError(409, 'EMAIL_ALREADY_EXISTS', 'Já existe um usuário com este email.');
}

// Mesma resposta para email inexistente e senha errada: não revela quais emails estão cadastrados
function invalidCredentials(): AppError {
  return new AppError(401, 'INVALID_CREDENTIALS', 'Email ou senha inválidos.');
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

export const authService = {
  async register({ name, email, password }: RegisterInput) {
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw emailAlreadyExists();
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    try {
      // O role não é informado: o banco aplica o padrão USER
      return await userRepository.create({ name, email, passwordHash });
    } catch (err) {
      // Dois cadastros simultâneos com o mesmo email: o segundo é barrado pelo índice único
      if (isUniqueViolation(err)) {
        throw emailAlreadyExists();
      }
      throw err;
    }
  },

  async login({ email, password }: LoginInput) {
    const found = await userRepository.findByEmailWithPassword(email);
    if (!found) {
      throw invalidCredentials();
    }

    const { passwordHash, ...user } = found;

    const passwordMatches = await bcrypt.compare(password, passwordHash);
    if (!passwordMatches) {
      throw invalidCredentials();
    }

    // Só é informado depois da senha correta, para não revelar o estado da conta a terceiros
    if (!user.active) {
      throw new AppError(403, 'USER_INACTIVE', 'Usuário desativado. Procure um administrador.');
    }

    return { token: tokenService.signAccessToken(user), user };
  },
};
