const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Web環境でreact-native-google-mobile-adsを除外
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName.includes('react-native-google-mobile-ads')) {
    // Web環境では空のモジュールを返す
    return {
      type: 'empty',
    };
  }
  // デフォルトの解決を使用
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

