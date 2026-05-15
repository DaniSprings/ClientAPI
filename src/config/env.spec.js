// Regression tests for: dotenv@16.6.1 upgrade
import { describe, expect, it, vi } from 'vitest';

vi.mock('dotenv', () => ({
  default: {
    config: vi.fn(),
  },
}));

describe('env config behavior', () => {
  it('uses defaults for key runtime settings when env vars are missing', async () => {
    const oldPort = process.env.PORT;
    const oldOrigins = process.env.CORS_ORIGINS;
    const oldJwtSecret = process.env.JWT_SECRET;

    delete process.env.PORT;
    delete process.env.CORS_ORIGINS;
    delete process.env.JWT_SECRET;

    vi.resetModules();
    const module = await import('./env.js');

    expect(module.env.port).toBe(4000);
    expect(module.env.jwtSecret).toBe('replace-me-before-production');
    expect(module.env.corsOrigins).toContain('http://localhost:5173');

    if (oldPort === undefined) delete process.env.PORT;
    else process.env.PORT = oldPort;
    if (oldOrigins === undefined) delete process.env.CORS_ORIGINS;
    else process.env.CORS_ORIGINS = oldOrigins;
    if (oldJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = oldJwtSecret;
  });
});
