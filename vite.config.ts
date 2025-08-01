// vite.config.ts

import { defineConfig } from 'vite';

export default defineConfig({
  // Base public path
  base: '/',
  
  // Build configuration
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Code splitting configuration
    rollupOptions: {
      output: {
         manualChunks: {
          // Router chunk for better caching
          router: ['./src/core/router/index.ts'],
          // Pages chunk for lazy loading
          pages: [
            './src/pages/HomePage.ts',
            './src/pages/DashboardPage.ts',
            './src/pages/UrlsPage.ts',
            './src/pages/AnalyticsPage.ts',
            './src/pages/SettingsPage.ts',
            './src/pages/NotFoundPage.ts'
          ]
        }
      }
    },
    // Minimize bundle size
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console logs in production
        drop_debugger: true
      }
    }
  },

  // Development server configuration
  server: {
    port: 5173,
    host: true,
    open: true,
    // Proxy API requests to your Spring Boot backend
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        // Handle cookies for authentication
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending request to the target', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received response from the target', proxyRes.statusCode, req.url);
          });
        }
      }
    }
  },

  // Preview server (for production build testing)
  preview: {
    port: 4173,
    host: true
  },

  /*
  // Path resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/components': resolve(__dirname, 'src/components'),
      '@/pages': resolve(__dirname, 'src/pages'),
      '@/core': resolve(__dirname, 'src/core'),
      '@/types': resolve(__dirname, 'src/types'),
      '@/utils': resolve(__dirname, 'src/utils'),
      '@/styles': resolve(__dirname, 'src/styles')
    }
  },
  */

  // Environment variables
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  },

  // CSS configuration
  css: {
    devSourcemap: true,
  },

  // Plugin configuration
  plugins: [
    // Add any additional Vite plugins here
  ],

  // Optimization
  optimizeDeps: {
    include: [
      // Pre-bundle dependencies for faster dev server startup
    ],
    exclude: [
      // Exclude from pre-bundling if needed
    ]
  },

  // Worker configuration
  worker: {
    format: 'es'
  }
});