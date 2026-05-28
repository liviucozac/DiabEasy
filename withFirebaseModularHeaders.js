const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withFirebaseModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      const patch = `
  installer.pods_project.targets.each do |target|
    modular_pods = ['FirebaseAuth', 'FirebaseCoreInternal', 'FirebaseFirestore',
      'GoogleUtilities', 'FirebaseAuthInterop', 'FirebaseAppCheckInterop',
      'RecaptchaInterop', 'FirebaseFirestoreInternal', 'FirebaseCore',
      'FirebaseCoreExtension']
    if modular_pods.include?(target.name)
      target.build_configurations.each do |config|
        config.build_settings['DEFINES_MODULE'] = 'YES'
      end
    end
  end`;

      if (!podfile.includes('DEFINES_MODULE')) {
        podfile = podfile.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|\n${patch}`
        );
        fs.writeFileSync(podfilePath, podfile);
      }

      return config;
    },
  ]);
};