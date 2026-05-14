// API uses TypeScript strict mode (tsc --noEmit) as its primary linter.
// This config adds runtime-safety rules on top.
export default [
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-console': 'off',
      'no-debugger': 'error',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
]
