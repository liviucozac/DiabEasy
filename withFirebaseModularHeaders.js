const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withFirebaseModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      // Required for @react-native-firebase v21 + useFrameworks: static
      if (!podfile.includes('$RNFirebaseAsStaticFramework')) {
        podfile = podfile.replace(
          /use_frameworks!/,
          `$RNFirebaseAsStaticFramework = true\nuse_frameworks!`
        );
      }

      const patch = `
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['DEFINES_MODULE'] = 'YES'
      config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      config.build_settings['OTHER_CFLAGS'] = '$(inherited) -Wno-non-modular-include-in-framework-module'
      config.build_settings['OTHER_CPLUSPLUSFLAGS'] = '$(inherited) -Wno-non-modular-include-in-framework-module'
    end
  end`;

      if (!podfile.includes('DEFINES_MODULE')) {
        podfile = podfile.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|\n${patch}`
        );
      }

      fs.writeFileSync(podfilePath, podfile);

      return config;
    },
  ]);
};