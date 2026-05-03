// Regression tests for: bcryptjs@2.4.3 and jsonwebtoken@9.0.2 upgrade
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUser = {
  userId: 7,
  email: 'user@example.com',
  name: 'Jane',
  surname: 'Doe',
  occupation: 'Engineer',
  passwordHash: 'stored-hash',
};

const repoMocks = {
  findByEmail: vi.fn(),
  createLocalUser: vi.fn(),
};

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(async () => 'hashed-password'),
    compare: vi.fn(async () => true),
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(() => 'signed-token'),
  },
}));

vi.mock('../repositories/user.repository.js', () => ({
  userRepository: repoMocks,
}));

describe('auth service behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('signUp creates local user and returns auth payload with token', async () => {
    repoMocks.findByEmail.mockResolvedValueOnce(null);
    repoMocks.createLocalUser.mockResolvedValueOnce(mockUser);

    const { authService } = await import('./auth.service.js');

    const result = await authService.signUp({
      name: 'Jane',
      surname: 'Doe',
      dateOfBirth: '1990-01-01',
      occupation: 'Engineer',
      email: 'user@example.com',
      password: 'P@ssw0rd!',
    });

    expect(repoMocks.findByEmail).toHaveBeenCalledWith('user@example.com');
    expect(repoMocks.createLocalUser).toHaveBeenCalledTimes(1);
    expect(result.token).toBe('signed-token');
    expect(result.userId).toBe(7);
    expect(result.username).toBe('user@example.com');
  });

  it('login throws when repository has no matching user', async () => {
    repoMocks.findByEmail.mockResolvedValueOnce(null);

    const { authService } = await import('./auth.service.js');

    await expect(authService.login('missing@example.com', 'wrong')).rejects.toMatchObject({
      name: 'HttpError',
      statusCode: 401,
    });
  });
});
