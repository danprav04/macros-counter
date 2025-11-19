const { withAppBuildGradle } = require('@expo/config-plugins');

const enableProguard = (buildGradle) => {
  let newGradle = buildGradle;

  // Regex to match the release block
  const releaseBlockRegex = /buildTypes\s*{[\s\S]*?release\s*{/;

  if (!releaseBlockRegex.test(newGradle)) {
    return newGradle;
  }

  // 1. Ensure minifyEnabled is true in release buildType
  // Matches 'minifyEnabled' followed by any value (boolean or variable) until the end of the line
  const minifyEnabledRegex = /(buildTypes\s*{[\s\S]*?release\s*{[\s\S]*?minifyEnabled\s+)[^\n]+/;

  if (minifyEnabledRegex.test(newGradle)) {
    console.log("withAndroidProguard: Found existing minifyEnabled. Setting to true.");
    newGradle = newGradle.replace(minifyEnabledRegex, '$1true');
  } else {
    console.log("withAndroidProguard: Injecting minifyEnabled true.");
    newGradle = newGradle.replace(
      /(buildTypes\s*{\s*release\s*{)/,
      '$1\n            minifyEnabled true'
    );
  }

  // 2. Ensure shrinkResources is true in release buildType
  const shrinkResourcesRegex = /(buildTypes\s*{[\s\S]*?release\s*{[\s\S]*?shrinkResources\s+)[^\n]+/;

  if (shrinkResourcesRegex.test(newGradle)) {
    console.log("withAndroidProguard: Found existing shrinkResources. Setting to true.");
    newGradle = newGradle.replace(shrinkResourcesRegex, '$1true');
  } else {
    console.log("withAndroidProguard: Injecting shrinkResources true.");
    newGradle = newGradle.replace(
      /(buildTypes\s*{\s*release\s*{)/,
      '$1\n            shrinkResources true'
    );
  }

  // 3. Ensure proguard rules file is included
  const proguardFilesRegex = /(buildTypes\s*{[\s\S]*?release\s*{[\s\S]*?proguardFiles\s+)[^\n]+/;
  
  if (proguardFilesRegex.test(newGradle)) {
    const match = newGradle.match(proguardFilesRegex);
    if (match && !match[0].includes('proguard-rules.pro')) {
        console.log("withAndroidProguard: Appending proguard-rules.pro.");
        newGradle = newGradle.replace(proguardFilesRegex, (fullMatch) => {
            return `${fullMatch}, "proguard-rules.pro"`;
        });
    }
  } else {
    console.log("withAndroidProguard: Injecting proguardFiles.");
    newGradle = newGradle.replace(
      /(buildTypes\s*{\s*release\s*{)/,
      '$1\n            proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"'
    );
  }

  return newGradle;
};

module.exports = (config) => {
  return withAppBuildGradle(config, (config) => {
    config.modResults.contents = enableProguard(config.modResults.contents);
    return config;
  });
};