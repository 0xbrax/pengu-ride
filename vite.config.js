import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import glsl from "vite-plugin-glsl"
import ViteRestart from "vite-plugin-restart";


export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  plugins:[
    ViteRestart({
      reload: [
        "**/*",
      ],
    }),
    react(),
    tailwindcss(),
    glsl()
  ],
  server: {
    host: true,
  },
});