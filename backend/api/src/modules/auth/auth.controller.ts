import type { Request, Response } from 'express';
import { authService } from './auth.service.js';

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  }

  async login(req: Request, res: Response): Promise<void> {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  }

  async refresh(req: Request, res: Response): Promise<void> {
    const result = await authService.refresh(req.body.refreshToken);
    res.status(200).json(result);
  }

  async logout(req: Request, res: Response): Promise<void> {
    if (req.user) {
      const refreshToken =
        typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : undefined;
      authService.logout(req.user.tokenId, refreshToken);
    }
    res.status(204).send();
  }

  async me(req: Request, res: Response): Promise<void> {
    const user = await authService.getMe(req.user!.id);
    res.status(200).json({ user });
  }
}

export const authController = new AuthController();
