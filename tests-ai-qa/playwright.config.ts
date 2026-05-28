import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 통합 테스트 설정 파일
 * BeanMind Curator 모바일 앱, Host Web, Admin Web 통합 테스트 정의
 */
export default defineConfig({
  testDir: './',
  /* Maximum time one test can run for. */
  timeout: 45 * 1000,
  expect: {
    timeout: 10000
  },
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3002',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Capture screenshot on failure */
    screenshot: 'only-on-failure',
  },

  /* Configure projects for major platforms */
  projects: [
    {
      name: 'curator-app',
      testDir: './specs-app',
      use: {
        ...devices['iPhone 14 Pro'],
        hasTouch: true,
      },
    },
    {
      name: 'host-web',
      testDir: './specs-host',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'admin-web',
      testDir: './specs-admin',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],
});
