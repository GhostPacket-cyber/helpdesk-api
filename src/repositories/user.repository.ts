import { prisma } from '../config/prisma';
import { Role } from '../generated/prisma/client';

interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
  role?: Role;
}

interface UpdateUserData {
  name?: string;
  email?: string;
  role?: Role;
  active?: boolean;
}

export const userRepository = {
  findAll() {
    return prisma.user.findMany({ orderBy: { name: 'asc' } });
  },

  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  // Única consulta que traz o passwordHash: usada somente para conferir a senha no login
  findByEmailWithPassword(email: string) {
    return prisma.user.findUnique({
      where: { email },
      omit: { passwordHash: false },
    });
  },

  create(data: CreateUserData) {
    return prisma.user.create({ data });
  },

  update(id: string, data: UpdateUserData) {
    return prisma.user.update({ where: { id }, data });
  },
};
