// plugins/withAndroid16KBSupport.js
const { 
  withAppBuildGradle, 
  withProjectBuildGradle, 
  withDangerousMod 
} = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

// 1. Inject build flags into the App-level build.gradle
const withAppBuildFlags = (config) => {
  return withAppBuildGradle(config, (config) => {
    const buildGradle = config.modResults.contents;

    // Force NDK version to r27c (specifically 27.0.12077973)
    const ndkVersionStr = 'ndkVersion "27.0.12077973"';
    
    // Block to insert for native build flags to force 16KB page alignment
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
        // Expo SDK 52 defaults to older AGP. We need 8.5.1+ for automatic alignment.
        // We force 8.5.2 here.
        const agpVersion = '8.5.2'; 
        // Matches things like: classpath('com.android.tools.build:gradle:8.0.1')
        const agpPattern = /classpath\s*\(['"]com\.android\.tools\.build:gradle:(\d+\.\d+\.\d+)['"]\)/;
        
        if (agpPattern.test(buildGradle)) {
            config.modResults.contents = buildGradle.replace(
                agpPattern, 
                `classpath('com.android.tools.build:gradle:${agpVersion}')`
            );
        } else {
            // Fallback for different syntax
            const altPattern = /com\.android\.tools\.build:gradle:(\d+\.\d+\.\d+)/;
            if (altPattern.test(buildGradle)) {
                config.modResults.contents = buildGradle.replace(
                    altPattern,
                    `com.android.tools.build:gradle:${agpVersion}`
                );
            }
        }
        return config;
    });
};

// 3. Update gradle-wrapper.properties to support AGP 8.5.2 (Requires Gradle 8.7+)
const withGradleWrapperUpdate = (config) => {
    return withDangerousMod(config, [
        'android',
        async (config) => {
            const wrapperPath = path.join(
                config.modRequest.platformProjectRoot,
                'gradle',
                'wrapper',
                'gradle-wrapper.properties'
            );
            
            if (fs.existsSync(wrapperPath)) {
                let wrapperContent = fs.readFileSync(wrapperPath, 'utf8');
                // Replace any gradle version with 8.7
                const distributionUrlPattern = /distributionUrl=.*gradle-.*-(all|bin)\.zip/;
                const newDistributionUrl = 'distributionUrl=https\\://services.gradle.org/distributions/gradle-8.7-all.zip';
                
                if (distributionUrlPattern.test(wrapperContent)) {
                    wrapperContent = wrapperContent.replace(distributionUrlPattern, newDistributionUrl);
                    fs.writeFileSync(wrapperPath, wrapperContent);
                }
            }
            return config;
        },
    ]);
};

const withAndroid16KBSupport = (config) => {
  config = withAppBuildFlags(config);
  config = withAgpUpdate(config);
  config = withGradleWrapperUpdate(config);
  return config;
};

module.exports = withAndroid16KBSupport;