import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const E2E_API_PORT = process.env.E2E_API_PORT ?? '3335';
const E2E_WEB_PORT = process.env.E2E_WEB_PORT ?? '3105';
const E2E_BASE_URL = `http://localhost:${E2E_WEB_PORT}`;
const E2E_API_URL = `http://localhost:${E2E_API_PORT}/api`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 60000,
  expect: {
    timeout: 15000,
  },
  use: {
    baseURL: E2E_BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm exec tsx src/server.ts',
      url: `${E2E_API_URL}/health`,
      reuseExistingServer: false,
      cwd: path.resolve(__dirname, '../../backend/api'),
      env: {
        ...process.env,
        PORT: E2E_API_PORT,
        CORS_ORIGIN: E2E_BASE_URL,
      },
      timeout: 60000,
    },
    {
      command: `pnpm exec next dev -p ${E2E_WEB_PORT}`,
      url: E2E_BASE_URL,
      reuseExistingServer: false,
      cwd: path.resolve(__dirname),
      env: {
        ...process.env,
        NEXT_PUBLIC_API_URL: E2E_API_URL,
      },
      timeout: 60000,
    },
  ],
});
