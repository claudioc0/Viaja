import type { Request, Response } from 'express';
import { AppError } from '../../utils/app-error.js';
import { usersService } from './users.service.js';

export class UsersController {
  async list(_req: Request, res: Response): Promise<void> {
    const users = await usersService.listUsers();
    res.status(200).json({ users });
  }

  async getById(req: Request, res: Response): Promise<void> {
    const targetId = String(req.params.id);
    if (req.user?.role !== 'ADMIN' && req.user?.id !== targetId) {
      throw new AppError(403, 'FORBIDDEN', 'Acesso negado aos dados de outro usuário.');
    }
    const user = await usersService.getUserById(targetId);
    res.status(200).json({ user });
  }
}

export const usersController = new UsersController();
