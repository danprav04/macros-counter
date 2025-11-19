const { withGradleProperties } = require('@expo/config-plugins');

const withAndroid16KBSupport = (config) => {
  return withGradleProperties(config, (config) => {
    // Remove existing property if present to avoid duplicates
    config.modResults = config.modResults.filter(
      (item) => item.key !== 'android.use16KBAlignment'
    );
    
    // Enable 16KB Alignment
    config.modResults.push({
      type: 'property',
      key: 'android.use16KBAlignment',
      value: 'true',
    });

    return config;
  });
};

module.exports = withAndroid16KBSupport;