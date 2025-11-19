const { withAndroidManifest } = require('@expo/config-plugins');

const withExtractNativeLibs = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    
    // 1. Add the tools namespace to the root <manifest> tag
    if (!androidManifest.manifest.$['xmlns:tools']) {
      androidManifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    if (androidManifest.manifest && androidManifest.manifest.application) {
      const app = androidManifest.manifest.application[0];
      
      if (!app.$) {
        app.$ = {};
      }
      
      // 2. Set the attribute
      app.$['android:extractNativeLibs'] = 'true';

      // 3. Add tools:replace to force override the value from Google Mobile Ads SDK
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