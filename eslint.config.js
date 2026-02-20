import { fileURLToPath } from 'url'
import { dirname } from 'path'

import vue from 'eslint-plugin-vue'
import typescript from '@typescript-eslint/eslint-plugin'
import vueTsConfig from '@vue/eslint-config-typescript'

const tsconfigRootDir = typeof import.meta.url === 'string'
  ? dirname(fileURLToPath(import.meta.url))
  : process.cwd()

export default [
  ...vueTsConfig(),
  {
    files: ['**/*.{js,ts,vue}'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      parserOptions: {
        project: ['./tsconfig.app.json'],
        tsconfigRootDir
      }
    },
    plugins: {
      vue,
      '@typescript-eslint': typescript
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'warn',
      eqeqeq: 'warn',
      // 'eol-last': ['warn', 'always'],
      'comma-spacing': ['warn', { before: false, after: true }],
      'brace-style': [2, 'stroustrup'],
      'max-len': ['error', 120, 4],
      'no-multiple-empty-lines': 'warn',
      'no-unused-expressions': 'warn',
      'padding-line-between-statements': ['warn', { blankLine: 'always', prev: '*', next: '*' }],
      // 'import/newline-after-import': ['error', { count: 0 }]
    }
  }
]
