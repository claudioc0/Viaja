import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type {
  AuthResponseDto,
  AuthTokensDto,
  LoginInput,
  PublicUserDto,
  RegisterInput,
  UserRole,
} from '@viaja/shared';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { isTokenIdRevoked, revokeTokenId } from '../../middlewares/authenticate.js';
import { AppError } from '../../utils/app-error.js';
import { serializeUser } from '../../utils/serializers.js';

interface JwtRefreshPayload {
  sub: string;
  email: string;
  role: UserRole;
  jti: string;
  type: 'refresh';
  exp?: number;
}

function issueTokens(user: PublicUserDto): AuthTokensDto {
  const accessJti = crypto.randomUUID();
  const refreshJti = crypto.randomUUID();

  const accessOptions: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
  };
  const refreshOptions: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
  };

  const accessToken = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti: accessJti,
      type: 'access',
    },
    env.JWT_ACCESS_SECRET,
    accessOptions,
  );

  const refreshToken = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti: refreshJti,
      type: 'refresh',
    },
    env.JWT_REFRESH_SECRET,
    refreshOptions,
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  };
}

export class AuthService {
  async register(input: RegisterInput): Promise<AuthResponseDto> {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new AppError(409, 'EMAIL_ALREADY_IN_USE', 'Já existe uma conta com este e-mail.');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const created = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: 'PASSENGER',
      },
    });

    const userDto = serializeUser(created);
    return {
      user: userDto,
      tokens: issueTokens(userDto),
    };
  }

  async login(input: LoginInput): Promise<AuthResponseDto> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha inválidos.');
    }

    const validPassword = await bcrypt.compare(input.password, user.passwordHash);
    if (!validPassword) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha inválidos.');
    }

    const userDto = serializeUser(user);
    return {
      user: userDto,
      tokens: issueTokens(userDto),
    };
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    let payload: JwtRefreshPayload;
    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as JwtRefreshPayload;
    } catch {
      throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token inválido ou expirado.');
    }

    if (payload.type !== 'refresh' || !payload.sub || !payload.jti) {
      throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Tipo de token inválido.');
    }

    if (isTokenIdRevoked(payload.jti)) {
      throw new AppError(401, 'REFRESH_TOKEN_REVOKED', 'Refresh token já utilizado ou revogado.');
    }

    // Rotate refresh token: revoke the old refresh JTI
    revokeTokenId(payload.jti, payload.exp);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new AppError(401, 'USER_NOT_FOUND', 'Usuário associado ao token não existe mais.');
    }

    const userDto = serializeUser(user);
    return {
      user: userDto,
      tokens: issueTokens(userDto),
    };
  }

  logout(accessTokenJti: string, refreshToken?: string): void {
    revokeTokenId(accessTokenJti);

    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as JwtRefreshPayload;
        if (decoded.jti) {
          revokeTokenId(decoded.jti, decoded.exp);
        }
      } catch {
        // Ignore invalid refresh token during logout
      }
    }
  }

  async getMe(userId: string): Promise<PublicUserDto> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Usuário não encontrado.');
    }

    return serializeUser(user);
  }
}

export const authService = new AuthService();
