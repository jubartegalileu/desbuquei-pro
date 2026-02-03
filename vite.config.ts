import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Garante que os caminhos dos assets (js, css) sejam relativos, 
  // evitando erros 404 em deploys que não são na raiz do domínio.
  base: './',
  define: {
    // Polyfill process.env to prevent "process is not defined" crashes in 3rd party libs
    'process.env': {}
  }
});