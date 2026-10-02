import bcrypt from 'bcrypt';
import { AppError } from '../errors/AppError';
import { Prisma } from '../generated/prisma/client';
import { userRepository } from '../repositories/user.repository';
import type { AuthUser } from '../types/express';
import { CreateUserInput, UpdateUserInput } from '../validators/user.validator';

// Custo do bcrypt: cada +1 dobra o tempo para gerar (e para atacar) um hash
const SALT_ROUNDS = 10;

function emailAlreadyExists(): AppError {
  return new AppError(409, 'EMAIL_ALREADY_EXISTS', 'Já existe um usuário com este email.');
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

// Executa uma gravação e traduz a violação do índice único de email em 409.
// Cobre o caso de duas requisições simultâneas passarem juntas pela verificação prévia.
async function withEmailConflictCheck<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw emailAlreadyExists();
    }
    throw err;
  }
}

export const userService = {
  list() {
    return userRepository.findAll();
  },

  async getById(id: string) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Usuário não encontrado.');
    }
    return user;
  },

  // Usado pelo cadastro público (sem role, vira USER) e pela criação feita por um ADMIN
  async create({ name, email, password, role }: Omit<CreateUserInput, 'role'> & { role?: CreateUserInput['role'] }) {
    if (await userRepository.findByEmail(email)) {
      throw emailAlreadyExists();
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    return withEmailConflictCheck(() => userRepository.create({ name, email, passwordHash, role }));
  },

  async update(id: string, data: UpdateUserInput, actor: AuthUser) {
    const user = await this.getById(id);

    // Impede que o sistema fique sem administrador por engano
    if (id === actor.id && data.role && data.role !== user.role) {
      throw new AppError(403, 'CANNOT_CHANGE_OWN_ROLE', 'Você não pode alterar o seu próprio perfil.');
    }

    if (data.email && data.email !== user.email && (await userRepository.findByEmail(data.email))) {
      throw emailAlreadyExists();
    }

    return withEmailConflictCheck(() => userRepository.update(id, data));
  },

  async setActive(id: string, active: boolean, actor: AuthUser) {
    await this.getById(id);

    if (id === actor.id && !active) {
      throw new AppError(403, 'CANNOT_DEACTIVATE_SELF', 'Você não pode desativar a sua própria conta.');
    }

    return userRepository.update(id, { active });
  },
};
