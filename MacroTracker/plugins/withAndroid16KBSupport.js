const { withProjectBuildGradle, withGradleProperties, withAppBuildGradle } = require('@expo/config-plugins');

const withAndroid16KBSupport = (config) => {
  // 1. Set the Gradle Property to explicitly enable 16KB support logic.
  // This instructs AGP 8.5+ to post-process and realign all native libraries 
  // (including those found in node_modules) to 16KB boundaries.
  config = withGradleProperties(config, (config) => {
    // Remove existing property if present to avoid duplicates/conflicts
    config.modResults = config.modResults.filter(item => item.key!== 'android.use16KBAlignment');
    
    config.modResults.push({
      type: 'property',
      key: 'android.use16KBAlignment',
      value: 'true',
    });
    return config;
  });

  // 2. Robustly update AGP version in android/build.gradle.
  // AGP 8.5.1+ is REQUIRED for the 'android.use16KBAlignment' property to function correctly.
  config = withProjectBuildGradle(config, (config) => {
    const buildGradle = config.modResults.contents;
    // Target a stable version known to handle 16KB alignment reliably
    const targetAgpVersion = '8.5.2';

    // Regex to find the classpath definition. 
    // Matches various formats: classpath('...'), classpath "...", or classpath '...'
    // Captures the group prefix and suffix to preserve original formatting.
    const agpDependencyPattern = /(classpath\s+[\('"]com\.android\.tools\.build:gradle:)([^'"\)]+)([\)'"])/;

    if (agpDependencyPattern.test(buildGradle)) {
      const match = buildGradle.match(agpDependencyPattern);
      const currentVersion = match;
      
      if (currentVersion!== targetAgpVersion) {
        console.log(` Upgrading AGP from ${currentVersion} to ${targetAgpVersion}`);
        config.modResults.contents = buildGradle.replace(
          agpDependencyPattern,
          `$1${targetAgpVersion}$3`
        );
      } else {
        console.log(` AGP is already at target version ${targetAgpVersion}`);
      }
    } else {
      console.warn(" WARNING: Could not find AGP classpath to upgrade. Ensure your project uses AGP 8.5.2+ manually.");
    }

    return config;
  });

  // 3. Inject Native Build Flags (NDK r27) into app/build.gradle.
  // This ensures that any C++ code compiled specifically by THIS project (via CMake/NDK) is aligned.
  config = withAppBuildGradle(config, (config) => {
    let buildGradle = config.modResults.contents;
    const cmakeFlag = '-DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON';
    const ndkBuildFlag = 'APP_SUPPORT_FLEXIBLE_PAGE_SIZES=true';

    // Only add the block if it is not already present to prevent duplication errors
    if (!buildGradle.includes('ANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES')) {
      console.log(' Injecting NDK build flags into defaultConfig.');
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
      
      // Inject inside defaultConfig block
      const defaultConfigPattern = /defaultConfig\s*\{/;
      if (defaultConfigPattern.test(buildGradle)) {
        config.modResults.contents = buildGradle.replace(
          defaultConfigPattern,
          `defaultConfig {\n${nativeBuildBlock}`
        );
      } else {
        console.warn(" WARNING: Could not find defaultConfig block in app/build.gradle. Flags not injected.");
      }
    }

    return config;
  });

  return config;
};

module.exports = withAndroid16KBSupport;