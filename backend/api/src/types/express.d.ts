import type { UserRole } from '@viaja/shared';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  tokenId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
