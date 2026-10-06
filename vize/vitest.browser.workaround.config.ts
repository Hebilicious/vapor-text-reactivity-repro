import { defineConfig } from "vitest/config";
import vize from "@vizejs/vite-plugin";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  plugins: [
    ...vize({
      vapor: true,
    }),
  ],
  optimizeDeps: {
    exclude: ["@vue/runtime-vapor"],
  },
  test: {
    include: ["src/**/*.browser.test.ts"],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
    },
  },
});
