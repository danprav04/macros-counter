// plugins/withAndroid16KBSupport.js
const { withAppBuildGradle } = require('@expo/config-plugins');

const withAndroid16KBSupport = (config) => {
  return withAppBuildGradle(config, (config) => {
    const buildGradle = config.modResults.contents;
    
    // The flag required to enable 16KB page size support in the NDK
    const flexiblePageSizeFlag = '-DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON';

    // 1. Check if the flag is already present to avoid duplication
    if (buildGradle.includes(flexiblePageSizeFlag)) {
        return config;
    }

    // 2. Define the configuration block to inject.
    // This adds the arguments to both cmake and ndkBuild to cover different library build types.
    const externalNativeBuildBlock = `
        externalNativeBuild {
            cmake {
                arguments "${flexiblePageSizeFlag}"
            }
            ndkBuild {
                arguments "${flexiblePageSizeFlag}"
            }
        }
    `;

    // 3. Inject the block into defaultConfig.
    // We look for 'defaultConfig {' and append our block immediately after it.
    // This leverages Groovy's ability to merge configuration blocks if externalNativeBuild already exists.
    const defaultConfigPattern = /(defaultConfig\s*\{)/;

    if (defaultConfigPattern.test(buildGradle)) {
        config.modResults.contents = buildGradle.replace(
            defaultConfigPattern,
            `$1\n${externalNativeBuildBlock}`
        );
    } else {
        console.warn('withAndroid16KBSupport: Could not find defaultConfig block in app/build.gradle. 16KB support flags were not applied.');
    }

    return config;
  });
};

module.exports = withAndroid16KBSupport;