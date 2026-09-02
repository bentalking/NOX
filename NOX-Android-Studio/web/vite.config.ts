import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

export default defineConfig({
  base: "./",
  server: { host: "0.0.0.0", port: 5173 },
  resolve: { tsconfigPaths: true },
  plugins: [TanStackRouterVite(), tailwindcss(), react()],
});
