import type { PublicUserDto } from '@viaja/shared';
import { prisma } from '../../config/database.js';
import { AppError } from '../../utils/app-error.js';
import { serializeUser } from '../../utils/serializers.js';

export class UsersService {
  async listUsers(): Promise<PublicUserDto[]> {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return users.map(serializeUser);
  }

  async getUserById(id: string): Promise<PublicUserDto> {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Usuário não encontrado.');
    }
    return serializeUser(user);
  }
}

export const usersService = new UsersService();
