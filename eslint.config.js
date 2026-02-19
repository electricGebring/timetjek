import vue from 'eslint-plugin-vue'
import typescript from '@typescript-eslint/eslint-plugin'
import prettier from 'eslint-plugin-prettier'
import vueTsConfig from '@vue/eslint-config-typescript'

export default [
  ...vueTsConfig(),
  {
    files: ['**/*.{js,ts,vue}'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module'
    },
    plugins: {
      vue,
      '@typescript-eslint': typescript,
      prettier
    },
    rules: {
      'prettier/prettier': 'error',
      'no-console': 'warn',
      'no-debugger': 'warn',
      'eqeqeq': 'warn',
      // 'eol-last': ['warn', 'always'],
      'comma-spacing': ['warn', {before: false, after: true}],
      'brace-style': [2, 'stroustrup'],
      'max-len': ['error', 120, 4],
      'no-multiple-empty-lines': 'warn',
      'no-unused-expressions': 'warn',
      'padding-line-between-statements': ['warn', {blankLine: 'always', prev: '*', next: '*'}]
    }
  }
]
