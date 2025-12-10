// babel.config.js — React Native CLI 0.76.x compatible
module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['module:@react-native/babel-preset'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src'
          },
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
        }
      ],
      [
        'babel-plugin-transform-inline-environment-variables',
        {
          include: [
            'NODE_ENV',
            'BILLING_MODE',
            'TRIAL_ENABLED',
            'DEVELOPER_BYPASS',
            'RC_API_KEY'
          ]
        }
      ],
      '@babel/plugin-transform-export-namespace-from',
      // MUST stay last
      'react-native-reanimated/plugin'
    ]
  };
};
