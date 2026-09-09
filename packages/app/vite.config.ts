import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  publicDir: "../data",
  build: {
    outDir: "dist",
  },
  server: {
    port: 3000,
  },
});
