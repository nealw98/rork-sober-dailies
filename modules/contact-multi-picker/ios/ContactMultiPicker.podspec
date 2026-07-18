Pod::Spec.new do |s|
  s.name           = 'ContactMultiPicker'
  s.version        = '1.0.0'
  s.summary        = 'Permissionless multi-select contact picker (CNContactPickerViewController)'
  s.description    = 'Presents the iOS system contact picker in multi-select mode. No contacts permission required — the app receives only the contacts the user checks off.'
  s.author         = 'Sober Dailies'
  s.homepage       = 'https://soberdailies.com'
  s.license        = 'MIT'
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = '**/*.swift'
end
