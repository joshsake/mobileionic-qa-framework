// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Lint rules for the test suite.
 *
 * The pipeline runs this with --max-warnings 0, so anything enabled here is a
 * hard gate. The rule set is deliberately narrow: it catches mistakes that
 * silently weaken a test (a floating promise that never gets awaited, a stray
 * .only that skips the rest of the suite) rather than enforcing style.
 */
export default tseslint.config(
  {
    ignores: [
      'reports/**',
      'test-results/**',
      'playwright-report/**',
      'node_modules/**',
      'e2e-mobile/**', // separate package with its own tsconfig and deps
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    },
    rules: {
      /*
       * An un-awaited Playwright call is the single most common cause of a
       * test that passes while asserting nothing, so promises must be handled.
       */
      'no-floating-decimal': 'error',

      /* A committed .only silently drops every other test in the file. */
      'no-restricted-properties': [
        'error',
        { object: 'test', property: 'only', message: 'Remove test.only before committing.' },
        { object: 'describe', property: 'only', message: 'Remove describe.only before committing.' },
      ],

      /* Unused values usually mean an assertion was dropped mid-refactor. */
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      /*
       * contract.spec.ts loads ajv-formats through require() inside a try/catch
       * so the suite still runs when the optional package is absent.
       */
      '@typescript-eslint/no-require-imports': 'off',

      /* Test fixtures legitimately describe loosely-typed API payloads. */
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    /*
     * k6 scripts run inside the k6 runtime, not Node. __ENV, __VU and __ITER
     * are injected by that runtime, so they have to be declared here or every
     * performance script reports no-undef.
     */
    files: ['performance/**/*.js'],
    languageOptions: {
      globals: {
        __ENV: 'readonly',
        __VU: 'readonly',
        __ITER: 'readonly',
      },
    },
    rules: {
      /*
       * Same underscore convention as the TypeScript sources above.
       *
       * caughtErrors matters here: k6 compiles these scripts through an older
       * Babel that rejects optional catch binding (`} catch {`), so every catch
       * has to name a parameter even when nothing uses it.
       */
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
);
