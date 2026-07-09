import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// root is pinned to this file's own directory so `npm run preview:dev` works
// the same whether invoked from here or from the component-library root.
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react()],
  server: {
    port: 5174,
    host: "localhost",
  },
});
