const { withGradleProperties } = require('@expo/config-plugins');

const withAndroid16KBSupport = (config) => {
  return withGradleProperties(config, (config) => {
    config.modResults = config.modResults.filter(
      (item) => item.key !== 'android.use16KBAlignment'
    );
    config.modResults.push({
      type: 'property',
      key: 'android.use16KBAlignment',
      value: 'true',
    });
    return config;
  });
};

module.exports = withAndroid16KBSupport;