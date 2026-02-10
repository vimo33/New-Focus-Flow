import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    // Enable minification
    minify: 'esbuild',

    // Source map configuration for production
    sourcemap: false, // Disable source maps in production for smaller bundle

    // Chunk size warning limit (in KB)
    chunkSizeWarningLimit: 500,

    // Rollup options for advanced optimization
    rollupOptions: {
      output: {
        // Manual chunk splitting strategy
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'chart-vendor': ['recharts'],
          'state-vendor': ['zustand'],
          'utils': ['date-fns'],
        },
        // Optimize chunk file names
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },

    // Enable CSS code splitting
    cssCodeSplit: true,

    // Target modern browsers for smaller bundle
    target: 'esnext',

    // Optimize dependencies
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },

  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'zustand', 'recharts', 'date-fns'],
  },

  // Dev server configuration for Tailscale access
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },

  // Preview server configuration
  preview: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: [
      'focus-flow-new.tail49878c.ts.net',
      '167.235.63.193',
      'localhost',
    ],
  },
})
