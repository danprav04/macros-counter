const { withProjectBuildGradle, withGradleProperties, withAppBuildGradle } = require('@expo/config-plugins');

const withAndroid16KBSupport = (config) => {
  config = withGradleProperties(config, (config) => {
    config.modResults = config.modResults.filter(item => item.key !== 'android.use16KBAlignment');
    config.modResults.push({
      type: 'property',
      key: 'android.use16KBAlignment',
      value: 'true',
    });
    return config;
  });

  config = withProjectBuildGradle(config, (config) => {
    const buildGradle = config.modResults.contents;
    const targetAgpVersion = '8.5.2';

    // Regex matches: classpath('...'), classpath "...", classpath variable
    const agpDependencyPattern = /(classpath\s+[\('"]com\.android\.tools\.build:gradle:)([^'"\)]+)([\)'"])/;

    if (agpDependencyPattern.test(buildGradle)) {
      const match = buildGradle.match(agpDependencyPattern);
      const currentVersion = match[2];
      
      if (currentVersion !== targetAgpVersion) {
        console.log(`[16KB] Upgrading AGP from ${currentVersion} to ${targetAgpVersion}`);
        config.modResults.contents = buildGradle.replace(
          agpDependencyPattern,
          `$1${targetAgpVersion}$3`
        );
      }
    } else {
      console.warn("[16KB] WARNING: Could not find AGP classpath to upgrade.");
    }

    return config;
  });

  // Safer injection of NDK flags
  config = withAppBuildGradle(config, (config) => {
    let buildGradle = config.modResults.contents;
    const cmakeFlag = '-DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON';
    const ndkBuildFlag = 'APP_SUPPORT_FLEXIBLE_PAGE_SIZES=true';

    if (!buildGradle.includes('ANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES')) {
       // Inject only if defaultConfig exists to avoid syntax errors
       const defaultConfigRegex = /defaultConfig\s*\{/;
       if (defaultConfigRegex.test(buildGradle)) {
           console.log('[16KB] Injecting NDK build flags.');
           const nativeBuildBlock = `
        externalNativeBuild {
            cmake { arguments "${cmakeFlag}" }
            ndkBuild { arguments "${ndkBuildFlag}" }
        }`;
           config.modResults.contents = buildGradle.replace(
             defaultConfigRegex,
             `defaultConfig {\n${nativeBuildBlock}`
           );
       }
    }
    return config;
  });

  return config;
};

module.exports = withAndroid16KBSupport;