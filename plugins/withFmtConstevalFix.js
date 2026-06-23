// Config plugin: force the vendored `fmt` (pulled in by React Native 0.79 /
// RCT-Folly) to use constexpr instead of consteval.
//
// Why: fmt 11.0.2's base.h UNCONDITIONALLY sets FMT_USE_CONSTEVAL based on
// __cpp_consteval (no #ifndef guard), so a -D define can't override it. Xcode
// 16+/clang 21 enforce consteval strictly and fmt's FMT_STRING constructor then
// trips "call to consteval function ... is not a constant expression", failing
// the iOS build. We patch the freshly-installed fmt/base.h in the Podfile's
// post_install (runs on every `pod install`) to define FMT_USE_CONSTEVAL 0,
// which makes FMT_CONSTEVAL empty (plain constexpr) and compiles cleanly.
// Remove once RN ships an fmt that builds under the newer toolchain.
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = 'withFmtConstevalFix';
const SNIPPET = [
  '    # withFmtConstevalFix: fmt 11 consteval vs clang 21 (plugins/withFmtConstevalFix.js)',
  "    fmt_base = File.join(installer.sandbox.root.to_s, 'fmt', 'include', 'fmt', 'base.h')",
  '    if File.exist?(fmt_base)',
  '      txt = File.read(fmt_base)',
  "      patched = txt.gsub('#  define FMT_USE_CONSTEVAL 1', '#  define FMT_USE_CONSTEVAL 0')",
  '      File.write(fmt_base, patched) if patched != txt',
  '    end',
].join('\n');

module.exports = function withFmtConstevalFix(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let src = fs.readFileSync(podfile, 'utf8');
      if (!src.includes(MARKER)) {
        src = src.replace(/(post_install do \|installer\|\n)/, `$1${SNIPPET}\n`);
        fs.writeFileSync(podfile, src);
      }
      return cfg;
    },
  ]);
};
