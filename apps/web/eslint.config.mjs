import babelParser from '@babel/eslint-parser'
import reactHooks from 'eslint-plugin-react-hooks'

const manualMemoizationMessage =
  'React Compiler owns render memoization. Write ordinary render-time code instead.'

export default [
  {
    ignores: ['dist/**', 'dist-ssr/**', 'coverage/**', 'storybook-static/**', 'src/**/__tests__/**'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        babelOptions: {
          babelrc: false,
          configFile: false,
          plugins: [
            ['@babel/plugin-syntax-typescript', { isTSX: true }],
            '@babel/plugin-syntax-jsx',
          ],
        },
        requireConfigFile: false,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.flat['recommended-latest'].rules,
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              importNames: ['useMemo', 'useCallback', 'memo', 'forwardRef'],
              message: manualMemoizationMessage,
              name: 'react',
            },
          ],
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          message: manualMemoizationMessage,
          object: 'React',
          property: 'memo',
        },
      ],
    },
  },
  {
    // VirtualizedSolveTable documents its TanStack React Compiler containment.
    files: ['src/components/timer/SolveTable/SolveTable.tsx'],
    rules: {
      'react-hooks/incompatible-library': 'off',
    },
  },
]
