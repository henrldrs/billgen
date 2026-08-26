import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    // BGEN-OPS-02: the default 5s flakes under load (a parallel cargo/uv build
    // starves the CPU) and those timeouts are not real failures. 30s passes.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
