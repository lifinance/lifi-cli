import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/bin/lifi.ts'],
  outDir: 'dist',
  format: 'esm',
  target: 'node20',
  platform: 'node',
  clean: true,
  sourcemap: false,
  dts: false,
  // Bundle all deps into a single self-contained CLI file.
  // Node builtins are externalized automatically by platform: 'node'.
  outExtensions: () => ({ js: '.js' }),
  outputOptions: {
    banner: '#!/usr/bin/env node',
  },
})
