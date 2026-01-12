import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load environment variables from .env files
  // Set the third parameter to '' to load all env vars, regardless of prefix.
  // Fix: Use type assertion for process.cwd() to resolve TypeScript error regarding missing 'cwd' property.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Injects process.env.API_KEY, which is required by the @google/genai SDK.
      // Ensure API_KEY is set as an environment variable in your hosting platform (e.g., Netlify).
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
    server: {
      port: 3000,
    },
    build: {
      outDir: 'dist', // Output directory for the production build
      emptyOutDir: true, // Clear the output directory before building
      // Vite automatically processes `index.html` as an entry point if it's at the root.
      // You can explicitly define it if needed:
      // rollupOptions: {
      //   input: {
      //     main: 'index.html',
      //   },
      // },
    },
    // The `publicDir` is used for static assets that are copied directly to the `outDir`.
    // Since `sw.js`, `metadata.json`, `robots.txt` are at the root, and we copy them manually in the build script,
    // we don't need a specific publicDir configuration here.
  };
});