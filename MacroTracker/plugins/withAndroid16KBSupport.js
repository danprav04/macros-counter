// plugins/withAndroid16KBSupport.js
const { 
  withAppBuildGradle, 
  withProjectBuildGradle, 
  withGradleProperties 
} = require('@expo/config-plugins');

// 1. Inject build flags into the App-level build.gradle
const withAppBuildFlags = (config) => {
  return withAppBuildGradle(config, (config) => {
    const buildGradle = config.modResults.contents;

    // Force NDK version to r27 (specifically 27.0.12077973 or newer)
    // and inject the 16KB page size flags.
    const ndkVersionStr = 'ndkVersion "27.0.12077973"';
    
    // Block to insert for native build flags
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

    let newBuildGradle = buildGradle;

    // Replace or add ndkVersion
    if (newBuildGradle.includes('ndkVersion')) {
        newBuildGradle = newBuildGradle.replace(/ndkVersion\s+".*"/, ndkVersionStr);
    } else {
        // Add it inside the android { } block if missing
        newBuildGradle = newBuildGradle.replace(
            /android\s*{/,
            `android {\n    ${ndkVersionStr}`
        );
    }

    // Inject flags if not present
    if (!newBuildGradle.includes('ANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES')) {
        const defaultConfigPattern = /defaultConfig\s*{/;
        if (defaultConfigPattern.test(newBuildGradle)) {
            newBuildGradle = newBuildGradle.replace(
                defaultConfigPattern,
                `defaultConfig {\n${nativeBuildBlock}`
            );
        }
    }

    config.modResults.contents = newBuildGradle;
    return config;
  });
};

// 2. Update the Android Gradle Plugin (AGP) version in the Project-level build.gradle
const withAgpUpdate = (config) => {
    return withProjectBuildGradle(config, (config) => {
        const buildGradle = config.modResults.contents;
        // Expo SDK 52 might default to 8.1.x or 8.2.x. 
        // We need 8.5.1+ for automatic 16KB alignment support.
        const agpVersion = '8.5.2'; 
        const agpPattern = /com\.android\.tools\.build:gradle:(\d+\.\d+\.\d+)/;
        
        if (agpPattern.test(buildGradle)) {
            config.modResults.contents = buildGradle.replace(
                agpPattern, 
                `com.android.tools.build:gradle:${agpVersion}`
            );
        }
        return config;
    });
};

// 3. Ensure Gradle properties allow for this configuration
const withGradleProps = (config) => {
    return withGradleProperties(config, (config) => {
        // Ensure we are using specific JVM args if needed for newer AGP,
        // though Expo's defaults are usually fine. 
        // We mainly just return config here to keep the chain clean.
        return config;
    });
};

const withAndroid16KBSupport = (config) => {
  config = withAppBuildFlags(config);
  config = withAgpUpdate(config);
  config = withGradleProps(config);
  return config;
};

module.exports = withAndroid16KBSupport;