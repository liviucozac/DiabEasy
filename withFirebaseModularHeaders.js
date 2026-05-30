const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withFirebaseModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      // Prepend to the file — guaranteed to land before any pod evaluation
      // regardless of plugin order. Required for @react-native-firebase v21
      // with useFrameworks: static so podspecs set static_framework = true.
      if (!podfile.includes('$RNFirebaseAsStaticFramework')) {
        podfile = `$RNFirebaseAsStaticFramework = true\n` + podfile;
      }

      const patch = `
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['DEFINES_MODULE'] = 'YES'
      config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      config.build_settings['OTHER_CFLAGS'] = '$(inherited) -Wno-non-modular-include-in-framework-module -Wno-implicit-int -Wno-implicit-function-declaration -Wno-error=implicit-int -Wno-error=implicit-function-declaration -Wno-error'
      config.build_settings['OTHER_CPLUSplusflags'] = '$(inherited) -Wno-non-modular-include-in-framework-module'
      config.build_settings['GCC_TREAT_IMPLICIT_FUNCTION_DECLARATIONS_AS_ERRORS'] = 'NO'
      config.build_settings['CLANG_WARN_IMPLICIT_FUNCTION_DECLARATION'] = 'NO'
      config.build_settings['GCC_WARN_ABOUT_RETURN_TYPE'] = 'NO'
      config.build_settings['CLANG_WARN_IMPLICIT_INT'] = 'NO'
    end
  end`;

      // Always apply — EAS always starts from a clean generated Podfile.
      podfile = podfile.replace(
        /post_install do \|installer\|/,
        `post_install do |installer|\n${patch}`
      );

      fs.writeFileSync(podfilePath, podfile);

      return config;
    },
  ]);
};