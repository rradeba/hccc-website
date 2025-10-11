import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.mov'],
  build: {
    // Optimize build for production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // Enable code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['./src/utils/formSubmission.js', './src/utils/rateLimiter.js', './src/utils/cache.js'],
        },
      },
    },
    // Optimize asset handling
    assetsInlineLimit: 4096,
    // Enable source maps for debugging
    sourcemap: false,
  },
  // Development server configuration
  server: {
    port: 5173,
    open: true,
    cors: true,
    host: true,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      clientPort: 5173,
      overlay: true,
    },
    watch: {
      usePolling: true,
    },
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  // Define environment variables
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
})
