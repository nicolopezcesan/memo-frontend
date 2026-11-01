import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_BACKEND_URL: process.env.VITE_BACKEND_URL ?? 'http://localhost:3000',
    },
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
