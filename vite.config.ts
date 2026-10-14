import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    // One ~200 KB (gzip) bundle: React, Base UI and zod. Excel export loads on demand.
    chunkSizeWarningLimit: 700,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
})
