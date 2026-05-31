/* ESLint config — Vite + React 18 + TypeScript (ESLint 8, eslintrc format) */
module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: [
    'dist',
    'node_modules',
    '.eslintrc.cjs',
    'vite.config.ts',
    'tailwind.config.*',
    'postcss.config.*',
    'playwright*.config.ts',
    'tests',
    'scripts',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['@typescript-eslint', 'react-refresh'],
  rules: {
    // Permitir args/vars/catch intencionalmente sin usar con prefijo "_"
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    // Desactivado: el codebase usa shadcn/ui (co-exporta `buttonVariants`/`badgeVariants`
    // junto al componente) y contexts que co-exportan sus hooks (`useAuth`/`useFinca`).
    // Son patrones intencionales; esta regla es solo un hint de HMR en dev.
    'react-refresh/only-export-components': 'off',
  },
};
