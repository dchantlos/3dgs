import { defineConfig } from "vite";

// GitHub Pages serves from /<repo>/ in production but "/" during local dev.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/3dgs/" : "/",
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 4000
  }
}));
