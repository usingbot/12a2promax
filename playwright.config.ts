import { defineConfig, devices } from "@playwright/test";
// Point at an already running preview or deployment. Tests only read the gallery.
export default defineConfig({
  testDir: "./tests/browser",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "vi-VN",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "Máy tính",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    { name: "Android", use: devices["Pixel 7"] },
    { name: "iPhone", use: devices["iPhone 13"] },
    { name: "Máy tính bảng", use: devices["iPad (gen 7)"] },
  ],
});
