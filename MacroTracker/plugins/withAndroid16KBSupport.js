// plugins/withAndroid16KBSupport.js
const { withAppBuildGradle } = require('@expo/config-plugins');

const withAndroid16KBSupport = (config) => {
  return withAppBuildGradle(config, (config) => {
    let buildGradle = config.modResults.contents;

    // Define the flags required for 16KB page size support in NDK r27
    // CMake expects a definition flag with -D
    const cmakeFlag = '-DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON';
    // ndk-build expects a make variable assignment
    const ndkBuildFlag = 'APP_SUPPORT_FLEXIBLE_PAGE_SIZES=true';

    // Check if the flags are already present to avoid duplication
    if (buildGradle.includes('ANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES')) {
      return config;
    }

    // Configuration block to inject into defaultConfig
    // This ensures that whether the project uses CMake or ndk-build, the 16KB support is enabled.
    const nativeBuildBlock = `
        externalNativeBuild {
            cmake {
                arguments "${cmakeFlag}"
            }
            ndkBuild {
                arguments "${ndkBuildFlag}"
            }
        }
    `;

    // Inject the block into defaultConfig.
    // We look for 'defaultConfig {' and append our block immediately after it.
    const defaultConfigPattern = /defaultConfig\s*\{/;

    if (defaultConfigPattern.test(buildGradle)) {
      config.modResults.contents = buildGradle.replace(
        defaultConfigPattern,
        `defaultConfig {\n${nativeBuildBlock}`
      );
    } else {
      console.warn(
        'withAndroid16KBSupport: Could not find defaultConfig block in app/build.gradle. 16KB support flags were not applied.'
      );
    }

    return config;
  });
};

module.exports = withAndroid16KBSupport;