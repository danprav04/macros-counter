// plugins/withAndroidProguard.js
const { withAppBuildGradle } = require('@expo/config-plugins');

const enableProguard = (buildGradle) => {
  // 1. Find the release buildType block
  const releaseBlockPattern = /buildTypes\s*{[\s\S]*?release\s*{/;
  
  if (!releaseBlockPattern.test(buildGradle)) {
    console.warn("withAndroidProguard: Could not find 'buildTypes { release {' block.");
    return buildGradle;
  }

  let newGradle = buildGradle;

  // 2. Ensure minifyEnabled is set to true.
  // We look for an existing definition of minifyEnabled within the release block context specifically.
  // Since simple regex replacement can be tricky with nested braces, we use a more targeted approach
  // assuming standard formatting or we replace the whole line if found.
  
  const minifyEnabledPattern = /(buildTypes\s*{[\s\S]*?release\s*{[\s\S]*?)minifyEnabled\s+(?:false|true|\(.*\))([^\n]*)/;
  
  if (minifyEnabledPattern.test(newGradle)) {
    console.log("withAndroidProguard: Updating existing minifyEnabled to true.");
    newGradle = newGradle.replace(minifyEnabledPattern, '$1minifyEnabled true$2');
  } else {
    // If not found, inject it at the start of the release block
    console.log("withAndroidProguard: Injecting minifyEnabled true.");
    newGradle = newGradle.replace(
      /buildTypes\s*{\s*release\s*{/,
      'buildTypes {\n        release {\n            minifyEnabled true'
    );
  }

  // 3. Ensure shrinkResources is set to true (usually goes hand-in-hand with minify for release)
  const shrinkResourcesPattern = /(buildTypes\s*{[\s\S]*?release\s*{[\s\S]*?)shrinkResources\s+(?:false|true|\(.*\))([^\n]*)/;
  
  if (shrinkResourcesPattern.test(newGradle)) {
     newGradle = newGradle.replace(shrinkResourcesPattern, '$1shrinkResources true$2');
  } else {
     // Inject after the release block start (and potentially after our injected minifyEnabled)
     newGradle = newGradle.replace(
      /buildTypes\s*{\s*release\s*{/,
      'buildTypes {\n        release {\n            shrinkResources true'
     );
  }

  // 4. Ensure proguard rules file is included
  if (!newGradle.includes("'proguard-rules.pro'")) {
    console.log("withAndroidProguard: Adding proguard-rules.pro reference.");
    // We look for the proguardFiles line
    const proguardFilesPattern = /proguardFiles\s+getDefaultProguardFile\s*\(['"]proguard-android(?:-optimize)?\.txt['"]\)(?:,\s*['"][^'"]*['"])*/;
    
    if (proguardFilesPattern.test(newGradle)) {
        // Append our rule file to existing line
        newGradle = newGradle.replace(proguardFilesPattern, (match) => {
            return `${match}, 'proguard-rules.pro'`;
        });
    } else {
        // Inject the whole line if missing
        newGradle = newGradle.replace(
            /buildTypes\s*{\s*release\s*{/,
            `buildTypes {\n        release {\n            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'`
        );
    }
  }

  return newGradle;
};

module.exports = (config) => {
  return withAppBuildGradle(config, (config) => {
    config.modResults.contents = enableProguard(config.modResults.contents);
    return config;
  });
};