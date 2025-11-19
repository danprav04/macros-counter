const { withProjectBuildGradle, withGradleProperties, withAppBuildGradle } = require('@expo/config-plugins');

const withAndroid16KBSupport = (config) => {
  // 1. Set the Gradle Property to explicitly enable 16KB support logic.
  // This instructs AGP 8.5+ to post-process and realign all native libraries 
  // (including those found in node_modules) to 16KB boundaries.
  config = withGradleProperties(config, (config) => {
    // Remove existing property if present to avoid duplicates/conflicts
    config.modResults = config.modResults.filter(item => item.key !== 'android.use16KBAlignment');
    
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
    // Improved to match both:
    // classpath 'com.android.tools.build:gradle:x.y.z' (space separator)
    // classpath('com.android.tools.build:gradle:x.y.z') (function call style)
    // matches: 1=prefix, 2=version, 3=suffix
    const agpDependencyPattern = /(classpath\s*[\('"]com\.android\.tools\.build:gradle:)([^'"\)]+)([\)'"])/;

    if (agpDependencyPattern.test(buildGradle)) {
      const match = buildGradle.match(agpDependencyPattern);
      const currentVersion = match ? match[2] : null;
      
      if (currentVersion && currentVersion !== targetAgpVersion) {
        console.log(`[16KB Support] Upgrading AGP from ${currentVersion} to ${targetAgpVersion}`);
        config.modResults.contents = buildGradle.replace(
          agpDependencyPattern,
          `$1${targetAgpVersion}$3`
        );
      } else {
        console.log(`[16KB Support] AGP is already at target version ${targetAgpVersion}`);
      }
    } else {
      console.warn("[16KB Support] WARNING: Could not find AGP classpath to upgrade. Ensure your project uses AGP 8.5.2+ manually. If the default AGP is older than 8.5, the build WILL fail.");
    }

    return config;
  });

  // 3. Inject Native Build Flags (NDK r27) into app/build.gradle.
  // This ensures that any C++ code compiled specifically by THIS project (via CMake/NDK) is aligned.
  config = withAppBuildGradle(config, (config) => {
    let buildGradle = config.modResults.contents;
    const cmakeFlag = '-DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON';
    const ndkBuildFlag = 'APP_SUPPORT_FLEXIBLE_PAGE_SIZES=true';

    // Check if flags are already present to avoid duplication
    if (!buildGradle.includes('ANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES')) {
      console.log('[16KB Support] Injecting NDK build flags into defaultConfig.');
      
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
      
      // Inject inside defaultConfig block.
      // We look for the closing brace of defaultConfig to insert before it, 
      // or simply replace 'defaultConfig {' to append immediately after opening.
      const defaultConfigPattern = /(defaultConfig\s*\{)/;
      
      if (defaultConfigPattern.test(buildGradle)) {
        config.modResults.contents = buildGradle.replace(
          defaultConfigPattern,
          `$1\n${nativeBuildBlock}`
        );
      } else {
        console.warn("[16KB Support] WARNING: Could not find defaultConfig block in app/build.gradle. Flags not injected.");
      }
    }

    return config;
  });

  return config;
};

module.exports = withAndroid16KBSupport;