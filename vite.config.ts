// vite.config.ts - UPDATED FOR DUAL BACKEND

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
          // Core chunks
          router: ['./src/core/router/index.ts'],
          state: ['./src/core/state/StateManager.ts'],
          
          // Service chunks for better caching
          'auth-services': [
            './src/services/auth/AuthService.ts',
            './src/services/auth/AuthApiClient.ts',
            './src/services/auth/OAuth2Service.ts'
          ],
          
          // Component chunks
          'auth-components': [
            './src/components/auth/RegistrationForm.ts',
            './src/components/auth/EmailVerification.ts',
            './src/components/auth/AuthModal.ts'
          ],
          
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
    open: false,
    // Proxy configuration for dual backend setup
    proxy: {
      // Auth Server routes
      '/api/auth': {
        target: 'http://localhost:8090',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Auth Server proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending auth request to target', req.method, req.url);
            // Ensure credentials are forwarded
            proxyReq.setHeader('Access-Control-Allow-Credentials', 'true');
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received auth response from target', proxyRes.statusCode, req.url);
          });
        }
      },
      
      // Session routes (also go to Auth Server)
      '/api/session': {
        target: 'http://localhost:8090',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Session proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending session request to target', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received session response from target', proxyRes.statusCode, req.url);
          });
        }
      },
      
      // Resource Server routes (URLs, QR codes, etc.)
      '/api/urls': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Resource Server proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending resource request to target', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received resource response from target', proxyRes.statusCode, req.url);
          });
        }
      },
      
      '/api/qr-codes': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      
      '/api/barcodes': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      
      '/api/analytics': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      
      // Health checks - route to both servers
      '/actuator/health': {
        target: 'http://localhost:8090', // Primary health check to auth server
        changeOrigin: true,
        secure: false
      }
    }
  },

  // Preview server (for production build testing)
  preview: {
    port: 4173,
    host: true,
    // Same proxy configuration for preview
    proxy: {
      '/api/auth': {
        target: 'http://localhost:8090',
        changeOrigin: true,
        secure: false
      },
      '/api/session': {
        target: 'http://localhost:8090',
        changeOrigin: true,
        secure: false
      },
      '/api/urls': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/api/qr-codes': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/api/barcodes': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/api/analytics': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      }
    }
  },

  // Environment variables
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __AUTH_SERVER_URL__: JSON.stringify(process.env.VITE_AUTH_SERVER_URL || 'http://localhost:8090'),
    __RESOURCE_SERVER_URL__: JSON.stringify(process.env.VITE_RESOURCE_SERVER_URL || 'http://localhost:8080')
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
  },

  // Test configuration (if using Vitest)
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}']
  }
});