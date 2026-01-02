import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "app"),
    },
  },
  plugins: [
    reactRouter({
      // Enable file-based routing (flat routes)
      ssr: true,
    }),
  ],
});
