import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      include: ['quotientai/**/*.ts'],
      exclude: ['tests/**/*.ts', 'examples/**/*.ts'],
    },
  },
});
