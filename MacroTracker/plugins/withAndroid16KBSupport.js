// plugins/withAndroid16KBSupport.js
const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Config plugin to enable 16 KB page size support for Android 15+.
 * This injects the ANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES flag into 
 * the externalNativeBuild configuration for CMake and NDK builds.
 */
const withAndroid16KBSupport = (config) => {
  return withAppBuildGradle(config, (config) => {
    const buildGradle = config.modResults.contents;

    // The block we want to insert into defaultConfig
    const nativeBuildBlock = `
        externalNativeBuild {
            cmake {
                arguments "-DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON"
            }
            ndkBuild {
                arguments "ANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON"
            }
        }
    `;

    // Check if it's already there to avoid duplicates
    if (buildGradle.includes('ANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES')) {
      return config;
    }

    // Insert inside defaultConfig block
    const pattern = /defaultConfig\s*{/;
    if (pattern.test(buildGradle)) {
      config.modResults.contents = buildGradle.replace(
        pattern,
        `defaultConfig {\n${nativeBuildBlock}`
      );
    } else {
      console.warn(
        'withAndroid16KBSupport: Could not find defaultConfig block in build.gradle'
      );
    }

    return config;
  });
};

module.exports = withAndroid16KBSupport;