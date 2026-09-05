import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react(), basicSsl()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      "/ds": {
        target: "https://api.deepseek.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ds/, "") || "/",
      },
      "/host-catalog": {
        target: "https://livegirloooh5.s3.us-east-1.amazonaws.com",
        changeOrigin: true,
        rewrite: () => "/json/file_videocallhost.json",
      },
      "/reel-catalog": {
        target: "https://livegirloooh5.s3.us-east-1.amazonaws.com",
        changeOrigin: true,
        rewrite: () => "/json/file_shortvideohost.json",
      },
      "/sayhi-catalog": {
        target: "https://livegirloooh5.s3.us-east-1.amazonaws.com",
        changeOrigin: true,
        rewrite: () => "/json/file_sayhiwords.json",
      },
      "/freetry-catalog": {
        target: "https://livegirloooh5.s3.us-east-1.amazonaws.com",
        changeOrigin: true,
        rewrite: () => "/json/file_30sfreeTryshost.json",
      },
    },
  },
});
