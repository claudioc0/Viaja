import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { UserRole } from '@viaja/shared';
import { AppError } from '../utils/app-error.js';

export function authorize(...allowedRoles: UserRole[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, 'UNAUTHORIZED', 'Usuário não autenticado.'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(
        new AppError(
          403,
          'FORBIDDEN',
          'Você não possui permissão para executar esta operação administrativa.',
        ),
      );
      return;
    }

    next();
  };
}
