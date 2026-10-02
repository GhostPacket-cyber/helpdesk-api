import { prisma } from '../config/prisma';

interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
}

export const userRepository = {
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
};
