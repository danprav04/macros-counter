const { withGradleProperties } = require('@expo/config-plugins');

const withAndroid16KBSupport = (config) => {
  return withGradleProperties(config, (config) => {
    // 1. Remove existing keys to avoid duplicates/conflicts
    config.modResults = config.modResults.filter(
      (item) => 
        item.key !== 'android.use16KBAlignment' && 
        item.key !== 'android.kotlinVersion' &&
        item.key !== 'kotlinVersion'
    );
    
    // 2. Enable 16KB Alignment (Required for Android 15/Google Play)
    config.modResults.push({
      type: 'property',
      key: 'android.use16KBAlignment',
      value: 'true',
    });

    // 3. FORCE Kotlin Version to 2.0.21
    // This ensures the build script uses 2.0.21 instead of falling back to 1.9.25
    config.modResults.push({
      type: 'property',
      key: 'android.kotlinVersion',
      value: '2.0.21',
    });
    // Add both keys just to be safe, as some scripts look for one or the other
    config.modResults.push({
      type: 'property',
      key: 'kotlinVersion',
      value: '2.0.21',
    });

    return config;
  });
};

module.exports = withAndroid16KBSupport;