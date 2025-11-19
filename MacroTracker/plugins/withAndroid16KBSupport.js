const { withProjectBuildGradle, withGradleProperties, withAppBuildGradle } = require('@expo/config-plugins');

const withAndroid16KBSupport = (config) => {
  // 1. Gradle Properties: 16KB Support + Suppress Compose Version Check
  config = withGradleProperties(config, (config) => {
    config.modResults = config.modResults.filter(item => 
        item.key !== 'android.use16KBAlignment' && 
        item.key !== 'suppressKotlinVersionCompatibilityCheck'
    );
    
    // Enable 16KB Alignment
    config.modResults.push({
      type: 'property',
      key: 'android.use16KBAlignment',
      value: 'true',
    });

    // Suppress Compose Compiler check (needed for Kotlin 1.9.25)
    config.modResults.push({
      type: 'property',
      key: 'suppressKotlinVersionCompatibilityCheck',
      value: '1.5.14', 
    });

    return config;
  });

  // 2. Upgrade AGP to 8.5.2 and Force JVM 17 Safely
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

    // Inject robust block to force Java 17 on all subprojects
    // Handles both "already evaluated" and "not yet evaluated" states.
    const jvmTargetBlock = `
subprojects {
    def configureAndroid = {
        if (project.hasProperty('android')) {
            project.android {
                compileOptions {
                    sourceCompatibility JavaVersion.VERSION_17
                    targetCompatibility JavaVersion.VERSION_17
                }
            }
        }
    }

    if (state.executed) {
        configureAndroid()
    } else {
        afterEvaluate {
            configureAndroid()
        }
    }

    tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
        kotlinOptions {
            jvmTarget = "17"
        }
    }
}
`;

    if (!buildGradle.includes('def configureAndroid = {')) {
        console.log('[Fix] Injecting robust JVM 17 enforcement.');
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