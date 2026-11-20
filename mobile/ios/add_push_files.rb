# One-off project edit: adds the Firebase config file and the two notification
# sounds to the app bundle, and turns on the push-notification entitlement.
# Safe to run again — it skips anything already in the project.
#   ruby add_push_files.rb
require 'xcodeproj'

project = Xcodeproj::Project.open(File.join(__dir__, 'CmdMobile.xcodeproj'))
target = project.targets.find { |t| t.name == 'CmdMobile' }
group = project.main_group['CmdMobile']

%w[GoogleService-Info.plist approval.wav reminder.wav].each do |name|
  ref = group.files.find { |f| File.basename(f.path.to_s) == name } || group.new_file("CmdMobile/#{name}")
  if target.resources_build_phase.files_references.include?(ref)
    puts "already in bundle: #{name}"
  else
    target.resources_build_phase.add_file_reference(ref)
    puts "added to bundle:   #{name}"
  end
end

entitlements = 'CmdMobile/CmdMobile.entitlements'
group.new_file(entitlements) unless group.files.any? { |f| File.basename(f.path.to_s) == 'CmdMobile.entitlements' }
target.build_configurations.each do |config|
  config.build_settings['CODE_SIGN_ENTITLEMENTS'] = entitlements
end
puts "entitlements:      #{entitlements}"

project.save
