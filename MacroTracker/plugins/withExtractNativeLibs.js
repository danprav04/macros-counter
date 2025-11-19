const { withAndroidManifest } = require('@expo/config-plugins');

const withExtractNativeLibs = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    if (!androidManifest.manifest.$['xmlns:tools']) {
      androidManifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }
    if (androidManifest.manifest && androidManifest.manifest.application) {
      const app = androidManifest.manifest.application[0];
      if (!app.$) app.$ = {};
      app.$['android:extractNativeLibs'] = 'true';
      
      const toolsReplace = app.$['tools:replace'];
      if (!toolsReplace) {
        app.$['tools:replace'] = 'android:extractNativeLibs';
      } else if (!toolsReplace.includes('android:extractNativeLibs')) {
        app.$['tools:replace'] = `${toolsReplace},android:extractNativeLibs`;
      }
    }
    return config;
  });
};

module.exports = withExtractNativeLibs;