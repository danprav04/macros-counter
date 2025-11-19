const { withProjectBuildGradle, withGradleProperties, withAppBuildGradle } = require('@expo/config-plugins');

const withAndroid16KBSupport = (config) => {
  // 1. Enable 16KB support property
  config = withGradleProperties(config, (config) => {
    config.modResults = config.modResults.filter(item => item.key !== 'android.use16KBAlignment');
    config.modResults.push({
      type: 'property',
      key: 'android.use16KBAlignment',
      value: 'true',
    });
    return config;
  });

  // 2. Upgrade AGP to 8.5.2 AND Force Kotlin JVM Target to 17
  config = withProjectBuildGradle(config, (config) => {
    let buildGradle = config.modResults.contents;
    const targetAgpVersion = '8.5.2';

    // Upgrade AGP Version
    const agpDependencyPattern = /(classpath\s+[\('"]com\.android\.tools\.build:gradle:)([^'"\)]+)([\)'"])/;
    if (agpDependencyPattern.test(buildGradle)) {
      const match = buildGradle.match(agpDependencyPattern);
      if (match[2] !== targetAgpVersion) {
        console.log(`[16KB] Upgrading AGP from ${match[2]} to ${targetAgpVersion}`);
        buildGradle = buildGradle.replace(agpDependencyPattern, `$1${targetAgpVersion}$3`);
      }
    }

    // Inject block to force all subprojects to use Java 17.
    // FIX: Using pluginManager.withPlugin instead of afterEvaluate to avoid lifecycle errors.
    const jvmTargetBlock = `
subprojects {
    project.pluginManager.withPlugin('com.android.library') {
        android {
            compileOptions {
                sourceCompatibility JavaVersion.VERSION_17
                targetCompatibility JavaVersion.VERSION_17
            }
        }
    }
    
    project.pluginManager.withPlugin('com.android.application') {
        android {
            compileOptions {
                sourceCompatibility JavaVersion.VERSION_17
                targetCompatibility JavaVersion.VERSION_17
            }
        }
    }

    tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
        kotlinOptions {
            jvmTarget = "17"
        }
    }
}
`;

    if (!buildGradle.includes('tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile)')) {
        console.log('[Fix] Injecting forced JVM 17 target for subprojects (Safely).');
        buildGradle += `\n${jvmTargetBlock}\n`;
    }

    config.modResults.contents = buildGradle;
    return config;
  });

  // 3. Safer injection of NDK flags
  config = withAppBuildGradle(config, (config) => {
    let buildGradle = config.modResults.contents;
    const cmakeFlag = '-DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON';
    const ndkBuildFlag = 'APP_SUPPORT_FLEXIBLE_PAGE_SIZES=true';

    if (!buildGradle.includes('ANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES')) {
       const defaultConfigRegex = /defaultConfig\s*\{/;
       if (defaultConfigRegex.test(buildGradle)) {
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