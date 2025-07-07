import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    // Test environment configuration
    environment: 'node',

    // Global test timeout (30 seconds for network operations)
    testTimeout: 30000,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'examples/**',
        'scripts/**',
        'dist/**',
      ],
    },

    // Test file patterns
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],

    // Exclude patterns
    exclude: ['node_modules/**', 'dist/**', '.git/**'],

    // Global setup and teardown
    globals: true,

    // Reporter configuration
    reporter: ['verbose', 'json'],

    // Retry failed tests once (useful for network-dependent tests)
    retry: 1,

    // Pool options for parallel test execution
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
      },
    },

    // Test sequencing (for network tests, run sequentially to avoid conflicts)
    sequence: {
      concurrent: false, // Run tests sequentially for network stability
    },
  },

  // Resolve aliases for imports
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '~': resolve(__dirname, '.'),
    },
  },

  // Define constants for test environment
  define: {
    __TEST_TIMEOUT__: 30000,
    __IS_TEST__: true,
  },

  // ESBuild options for TypeScript compilation
  esbuild: {
    target: 'es2022',
  },
})
