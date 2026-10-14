import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  // Relative asset paths: the site works from any folder (e.g. school.ru/sociometry/).
  // Safe because routing uses the URL hash.
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    // One ~225 KB (gzip) bundle: React, Base UI, zod and dnd-kit. Excel export loads on demand.
    chunkSizeWarningLimit: 800,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
})
