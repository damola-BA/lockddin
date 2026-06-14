import { defineConfig } from "@playwright/test";

// E2E golden-path config (M8). Separate from Vitest (which only runs
// lib/**/*.test.ts). Point at a running app via E2E_BASE_URL and a seeded
// provider slug via E2E_SLUG.
export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    headless: true,
  },
});
