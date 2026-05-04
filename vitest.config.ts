import { defineConfig } from "vitest/config";

export default defineConfig({
  oxc: {
    jsx: {
      importSource: "react",
      runtime: "automatic",
    },
  },
  test: {
    environment: "node",
    globals: false,
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
