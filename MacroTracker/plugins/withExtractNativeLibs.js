// plugins/withExtractNativeLibs.js
const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Modifies AndroidManifest.xml to set android:extractNativeLibs="true".
 * 
 * This is a critical fix for 16KB page size compatibility (Android 15).
 * It ensures that native libraries are extracted from the APK at install time,
 * allowing the OS to align them to the device's page size (4KB or 16KB).
 * 
 * FIXED: Attributes must be set on the '$' property of the xml2js object.
 */
const withExtractNativeLibs = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    
    if (androidManifest.manifest && androidManifest.manifest.application) {
      const app = androidManifest.manifest.application[0];
      
      // Ensure the attributes object exists
      if (!app.$) {
        app.$ = {};
      }
      
      // Set the attribute correctly on the '$' object
      app.$['android:extractNativeLibs'] = 'true';
    }
    
    return config;
  });
};

module.exports = withExtractNativeLibs;