// plugins/withAndroidImageCropperFix.js
const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = (config) => {
  return withAppBuildGradle(config, (config) => {
    const buildGradle = config.modResults.contents;

    const fix = `
configurations.all {
    resolutionStrategy {
        force 'com.github.CanHub:Android-Image-Cropper:4.3.2'
    }
}
`;

    // Check if the fix is already there to prevent duplication
    if (buildGradle.includes("force 'com.github.CanHub:Android-Image-Cropper:4.3.2'")) {
      return config;
    }

    // Append the fix to the end of the file
    config.modResults.contents = buildGradle + fix;

    return config;
  });
};