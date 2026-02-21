const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Expo config plugin to add foregroundServiceType="dataSync" to the
 * RNBackgroundActionsTask service element. The library's own manifest
 * does not declare it, causing a crash on Android 14+ when the service
 * tries to start as a foreground service with FOREGROUND_SERVICE_TYPE_DATA_SYNC.
 */
module.exports = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application?.[0];

    if (!application) {
      console.warn('withBackgroundActions: No application element found in manifest');
      return config;
    }

    // Ensure the service array exists
    if (!application.service) {
      application.service = [];
    }

    const serviceName = 'com.asterinet.react.bgactions.RNBackgroundActionsTask';

    // Find or create the service element
    let service = application.service.find(
      (s) => s.$?.['android:name'] === serviceName
    );

    if (!service) {
      // Create the service element if it doesn't exist yet
      service = {
        $: {
          'android:name': serviceName,
          'android:exported': 'false',
          'android:foregroundServiceType': 'dataSync',
        },
      };
      application.service.push(service);
    } else {
      // Update existing service element
      service.$['android:foregroundServiceType'] = 'dataSync';
    }

    console.log('withBackgroundActions: Set foregroundServiceType=dataSync on RNBackgroundActionsTask');

    return config;
  });
};
