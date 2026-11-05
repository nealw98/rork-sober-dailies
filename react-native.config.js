// Local-simulator escape hatch for Google MLKit.
//
// GoogleMLKit ships fat .frameworks with NO arm64-simulator slice, and its
// pods inject `EXCLUDED_ARCHS[sdk=iphonesimulator*] = arm64` into the app
// target. iOS 26+/27 simulators dropped Rosetta, so an x86_64-only sim build
// no longer installs at all ("does not contain code for any platform…").
//
// Setting RN_SIM_NO_MLKIT=1 during `pod install` unlinks the iOS pod so local
// arm64 simulator builds work; lib/meetingOcr.ts lazy-requires the module and
// degrades to "scanner unavailable" when it's absent. Device and EAS builds
// never set the variable and keep MLKit. Android is unaffected either way.
module.exports =
  process.env.RN_SIM_NO_MLKIT === '1'
    ? {
        dependencies: {
          '@react-native-ml-kit/text-recognition': {
            platforms: { ios: null },
          },
        },
      }
    : {};
