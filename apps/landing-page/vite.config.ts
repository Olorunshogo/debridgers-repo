import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';


export default defineConfig({
  root: __dirname,
  plugins: [reactRouter(), react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './app')
    }
  }
  server: {
    port: 3000
  }
});