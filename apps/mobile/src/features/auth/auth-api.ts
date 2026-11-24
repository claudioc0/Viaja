import type { AuthResponseDto, LoginInput, PublicUserDto, RegisterInput } from '@viaja/shared';
import { apiRequest } from '../../services/api';

export const authApi = {
  login(input: LoginInput): Promise<AuthResponseDto> {
    return apiRequest<AuthResponseDto>('/auth/login', {
      method: 'POST',
      body: input,
      authenticated: false,
    });
  },

  register(input: RegisterInput): Promise<AuthResponseDto> {
    return apiRequest<AuthResponseDto>('/auth/register', {
      method: 'POST',
      body: input,
      authenticated: false,
    });
  },

  async getMe(): Promise<PublicUserDto> {
    const response = await apiRequest<{ user: PublicUserDto }>('/auth/me');
    return response.user;
  },

  logout(refreshToken?: string): Promise<void> {
    return apiRequest<void>('/auth/logout', {
      method: 'POST',
      body: refreshToken ? { refreshToken } : {},
      retryOnUnauthorized: false,
    });
  },
};
