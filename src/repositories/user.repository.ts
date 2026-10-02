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

  create(data: CreateUserData) {
    return prisma.user.create({ data });
  },
};
