// plugins/withAndroidProguard.js
const { withAppBuildGradle } = require('@expo/config-plugins');

const addProguardRules = (buildGradle) => {
  // The search pattern to find the release block
  const pattern = /buildTypes\s*{\s*release\s*{/;

  // The lines to be added
  const newLines = `
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
  `;

  // Check if the lines are already there
  if (buildGradle.includes("minifyEnabled true")) {
    return buildGradle;
  }

  // Inject the new lines into the release block
  return buildGradle.replace(pattern, `buildTypes {\n        release {\n${newLines}`);
};

module.exports = (config) => {
  return withAppBuildGradle(config, (config) => {
    config.modResults.contents = addProguardRules(config.modResults.contents);
    return config;
  });
};