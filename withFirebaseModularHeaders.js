const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withFirebaseModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      if (!podfile.includes('$RNFirebaseAsStaticFramework')) {
        podfile = `$RNFirebaseAsStaticFramework = true\n` + podfile;
      }

      // Use prebuilt FirebaseFirestore to avoid gRPC compilation issues
      if (!podfile.includes('firestore-ios-sdk-frameworks')) {
        podfile = podfile.replace(
          /(platform :ios)/,
          `pod 'FirebaseFirestore', :git => 'https://github.com/invertase/firestore-ios-sdk-frameworks.git', :tag => '11.11.0'\npod 'GoogleUtilities', :modular_headers => true\npod 'FirebaseCore', :modular_headers => true\npod 'FirebaseCoreExtension', :modular_headers => true\npod 'FirebaseCoreInternal', :modular_headers => true\npod 'FirebaseSharedSwift', :modular_headers => true\n\n$1`
        );
      }

      const patch = `
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      config.build_settings['GCC_TREAT_IMPLICIT_FUNCTION_DECLARATIONS_AS_ERRORS'] = 'NO'
      config.build_settings['CLANG_WARN_IMPLICIT_FUNCTION_DECLARATION'] = 'NO'
      config.build_settings['CLANG_WARN_IMPLICIT_INT'] = 'NO'
      config.build_settings['GCC_WARN_ABOUT_RETURN_TYPE'] = 'NO'
      config.build_settings['OTHER_CFLAGS'] = '$(inherited) -Wno-non-modular-include-in-framework-module -Wno-implicit-int -Wno-implicit-function-declaration -Wno-error'
      config.build_settings['OTHER_CPLUSPLUSFLAGS'] = '$(inherited) -Wno-non-modular-include-in-framework-module'
    end
  end`;

      podfile = podfile.replace(
        /post_install do \|installer\|/,
        `post_install do |installer|\n${patch}`
      );

      fs.writeFileSync(podfilePath, podfile);

      return config;
    },
  ]);
};