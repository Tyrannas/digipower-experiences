// Two styles, as before the merge of the two projects:
// - JavaScript and Vue (engine, views, tests): eslint-config-standard + vue;
// - TypeScript (experiences and lib/): typescript-eslint + Prettier (.prettierrc).
module.exports = {
  root: true,
  ignorePatterns: ['dist/', 'node_modules/', 'public/', 'test-results/'],
  env: {
    browser: true,
    es2021: true,
    jest: true
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  overrides: [
    {
      files: ['*.js', '*.cjs', '*.mjs', '*.vue'],
      extends: ['plugin:vue/essential', 'standard'],
      plugins: ['vue'],
      rules: {
        'vue/order-in-components': ['error', {}],
        'vue/no-undef-components': [
          'error', {
            ignorePatterns: [
              '^V(\\w+)$',
              'i18n',
              'RouterView',
              'RouterLink',
              'TheDataExperience'
            ]
          }
        ],
        'space-before-function-paren': ['error', 'never'],
        'arrow-parens': ['error', 'as-needed', { requireForBlockBody: true }],
        'no-console': [
          'warn',
          {
            allow: ['info', 'warn', 'error', 'time', 'timeEnd']
          }
        ],
        // https://stackoverflow.com/a/64609434/8238129
        'vue/valid-v-slot': [
          'error',
          {
            allowModifiers: true
          }
        ],
        // Enforce PascalCase component names
        // https://vuejs.org/v2/style-guide/#Component-name-casing-in-templates-strongly-recommended
        'vue/component-name-in-template-casing': [
          'error',
          'PascalCase',
          {
            registeredComponentsOnly: false,
            ignores: ['component', 'client-only', 'keep-alive', 'i18n']
          }
        ]
      }
    },
    {
      // Performance tests read values only to force their computation for timing
      files: ['src/__tests__/**/performance/*.test.js'],
      rules: {
        'no-void': 'off',
        'no-unused-vars': 'off'
      }
    },
    {
      files: ['*.ts'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint', 'prettier'],
      extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended'],
      globals: { process: 'readonly' },
      rules: {
        'no-console': ['warn', { allow: ['info', 'warn', 'error'] }]
      }
    }
  ]
}
