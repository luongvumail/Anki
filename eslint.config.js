const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  {
    ignores: ['.expo/**'],
  },
  ...expoConfig,
  {
    rules: {
      'no-unused-vars': 'off',
      'react-hooks/refs': 'off',
      'react/no-unescaped-entities': 'off',
    },
  },
];
