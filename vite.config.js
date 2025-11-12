import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      include: [/\.jsx?$/, /\.tsx?$/],
    }),
  ],
  assetsInclude: ['**/*.mov'],
  resolve: {
    alias: {
      '@crm': path.resolve(__dirname, '../hccc-crm/src'),
      'lucide-react': path.resolve(__dirname, 'node_modules/lucide-react'),
    },
  },
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
    fs: {
      allow: ['..'],
    },
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
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  // Define environment variables
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
})
