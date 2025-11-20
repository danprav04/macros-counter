const { withGradleProperties } = require('@expo/config-plugins');

const withGradleMemory = (config) => {
  return withGradleProperties(config, (config) => {
    // Increase heap size to 4GB to handle R8 minification
    config.modResults.push({
      type: 'property',
      key: 'org.gradle.jvmargs',
      value: '-Xmx4096m -XX:MaxMetaspaceSize=1024m',
    });
    return config;
  });
};

module.exports = withGradleMemory;