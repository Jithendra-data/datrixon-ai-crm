import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
export default defineConfig({
  root: resolve("static-demo"),
  base: "/datrixon-ai-crm/",
  publicDir: resolve("public"),
  plugins: [react()],
  build: { outDir: resolve("dist-pages"), emptyOutDir: true },
});
