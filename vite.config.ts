
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      react: path.resolve(__dirname, "node_modules/react"),
      "react/jsx-runtime": path.resolve(__dirname, "node_modules/react/jsx-runtime"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
      "react-dom/client": path.resolve(__dirname, "node_modules/react-dom/client"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"]
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react/jsx-runtime", "@tanstack/react-query"]
  },
  server: {
    host: "::",
    port: 8080,
  },
  preview: {
    port: 8080,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
}))
