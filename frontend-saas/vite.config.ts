import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // deliberate: never bind 0.0.0.0 by default (legacy audit finding C2)
    host: "localhost",
  },
});
