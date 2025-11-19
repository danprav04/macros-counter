// plugins/withAndroid16KBSupport.js
const { withProjectBuildGradle, withGradleProperties, withAppBuildGradle } = require('@expo/config-plugins');

const withAndroid16KBSupport = (config) => {
  // 1. Set the Gradle Property to explicitly enable 16KB support logic
  // This flag is recognized by newer React Native templates and AGP settings
  config = withGradleProperties(config, (config) => {
    // Remove existing property if present to avoid duplicates
    config.modResults = config.modResults.filter(item => item.key !== 'android.use16KBAlignment');
    
    config.modResults.push({
      type: 'property',
      key: 'android.use16KBAlignment',
      value: 'true',
    });
    return config;
  });

  // 2. Robustly update AGP version in android/build.gradle
  // AGP 8.5.1+ is required to automatically strip and realign legacy 4KB libs from dependencies
  config = withProjectBuildGradle(config, (config) => {
    const buildGradle = config.modResults.contents;
    const targetAgpVersion = '8.5.2';

    // Regex covers: classpath('...'), classpath "...", and variable substitution
    const agpDependencyPattern = /(classpath\s*[\('"]com\.android\.tools\.build:gradle:)([^'"\)]+)([\)'"])/;

    if (agpDependencyPattern.test(buildGradle)) {
      config.modResults.contents = buildGradle.replace(
        agpDependencyPattern,
        `$1${targetAgpVersion}$3`
      );
    } else {
        console.warn("withAndroid16KBSupport: Could not auto-upgrade AGP version. Ensure your project uses AGP 8.5.2+.");
    }

    return config;
  });

  // 3. Inject Native Build Flags (NDK r27) into app/build.gradle
  config = withAppBuildGradle(config, (config) => {
    let buildGradle = config.modResults.contents;

    const cmakeFlag = '-DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON';
    const ndkBuildFlag = 'APP_SUPPORT_FLEXIBLE_PAGE_SIZES=true';

    if (!buildGradle.includes('ANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES')) {
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
      const defaultConfigPattern = /defaultConfig\s*\{/;
      if (defaultConfigPattern.test(buildGradle)) {
        config.modResults.contents = buildGradle.replace(
          defaultConfigPattern,
          `defaultConfig {\n${nativeBuildBlock}`
        );
      }
    }

    return config;
  });

  return config;
};

module.exports = withAndroid16KBSupport;