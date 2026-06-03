module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // WatermelonDB: decorators MUST come first, class-properties second, both legacy/loose
    ['@babel/plugin-proposal-decorators', {legacy: true}],
    ['@babel/plugin-proposal-class-properties', {loose: true}],
    ['module:react-native-dotenv', {
      moduleName: '@env',
      path: '.env.development',
      safe: true,
      allowUndefined: false,
    }],
    ['module-resolver', {
      root: ['./src'],
      extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
      alias: {
        '@screens': './src/screens',
        '@components': './src/components',
        '@hooks': './src/hooks',
        '@lib': './src/lib',
        '@store': './src/store',
        '@db': './src/db',
        '@navigation': './src/navigation',
        '@constants': './src/constants',
        '@assets': './assets',
        '@apptypes': './src/types',
      },
    }],
    'react-native-reanimated/plugin',
  ],
};
