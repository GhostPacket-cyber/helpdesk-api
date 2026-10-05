import bcrypt from 'bcrypt';
import { AppError } from '../errors/AppError';
import { userRepository } from '../repositories/user.repository';
import { LoginInput, RegisterInput } from '../validators/auth.validator';
import { tokenService } from './token.service';
import { SALT_ROUNDS, userService } from './user.service';

// Hash de uma senha qualquer, usado apenas para igualar o tempo de resposta do login
const DUMMY_HASH = bcrypt.hashSync('senha-que-nenhum-usuario-tem', SALT_ROUNDS);

// Mesma resposta para email inexistente e senha errada: não revela quais emails estão cadastrados
function invalidCredentials(): AppError {
  return new AppError(401, 'INVALID_CREDENTIALS', 'Email ou senha inválidos.');
}

export const authService = {
  // O role não é repassado: o cadastro público sempre cria um USER
  register({ name, email, password }: RegisterInput) {
    return userService.create({ name, email, password });
  },

  async login({ email, password }: LoginInput) {
    const found = await userRepository.findByEmailWithPassword(email);
    if (!found) {
      // Gasta o mesmo tempo de uma comparação real: sem isso, a resposta mais rápida
      // para email inexistente permitiria descobrir quais emails estão cadastrados
      await bcrypt.compare(password, DUMMY_HASH);
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
