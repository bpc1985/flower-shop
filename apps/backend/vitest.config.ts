import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    // ponytail: vitest 4.x defaults to vm pool which requires vite ^6; project uses vite 5.4.x (Medusa dep).
    // forks pool uses child_process and works with vite 5. Switch back to vm when vite ^6 is available.
    pool: "forks",
  },
});
