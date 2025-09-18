module.exports = {
  extends: ['stylelint-config-standard', 'stylelint-config-standard-scss'],
  plugins: ['stylelint-order'],
  rules: {
    'color-named': 'never',
    'order/properties-alphabetical-order': true,
  },
  ignoreFiles: ['**/*.ts', '**/*.tsx'],
};
