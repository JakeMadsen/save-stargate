import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "node",
    include: ["server/**/*.test.ts", "client/**/*.test.tsx"],
    setupFiles: ["client/src/test/setup.ts"]
  }
});

