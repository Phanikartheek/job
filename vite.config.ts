import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "three", "@react-three/fiber", "@react-three/drei"],
  },
  build: {
    // Split large libraries into separate chunks for faster initial load
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-xlsx": ["xlsx", "papaparse"],
          "vendor-charts": ["recharts"],
          "vendor-ui": ["@radix-ui/react-dialog", "@radix-ui/react-tabs", "lucide-react"],
        },
      },
    },
    // Warn if any single chunk exceeds 600kb
    chunkSizeWarningLimit: 600,
  },
});
