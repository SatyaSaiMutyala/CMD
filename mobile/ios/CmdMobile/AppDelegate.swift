import FirebaseCore
import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // Firebase (push notifications). Reads GoogleService-Info.plist from the app bundle.
    FirebaseApp.configure()
    return true
  }
}
