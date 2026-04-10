import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/bin/lifi.ts'],
  format: ['cjs'],
  outDir: 'dist',
  outExtension: () => ({ js: '.cjs' }),
  target: 'node18',
  platform: 'node',
  splitting: false,
  clean: true,
  minify: false,
  sourcemap: false,
  noExternal: [/.*/],
  banner: {
    js: '#!/usr/bin/env node',
  },
});
