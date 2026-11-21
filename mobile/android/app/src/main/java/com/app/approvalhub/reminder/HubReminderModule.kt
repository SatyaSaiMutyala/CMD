package com.app.approvalhub.reminder

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * What the app's "Full-screen reminder" screen (src/screens/ReminderSetupScreen.js)
 * needs from Android: where the two permissions stand, the Settings page for
 * each, and a way to try the reminder.
 *
 * It also says which version of the app is installed (`versionName`), read
 * from Android itself. The update check compares that with Google Play, so it
 * can never be a version the JavaScript only believes it is.
 *
 * JavaScript reaches it as NativeModules.HubReminder.
 */
class HubReminderModule(private val context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context) {

  override fun getName(): String = NAME

  /** { versionName }: the version of the app that is actually installed. */
  override fun getConstants(): Map<String, Any> {
    val version =
      try {
        context.packageManager.getPackageInfo(context.packageName, 0).versionName
      } catch (e: Exception) {
        null
      }
    return mapOf("versionName" to (version ?: ""))
  }

  /** { fullScreen, overApps }: true where the CMD has already said yes. */
  @ReactMethod
  fun status(promise: Promise) {
    val map = Arguments.createMap()
    map.putBoolean("fullScreen", ReminderNotifier.canUseFullScreen(context))
    map.putBoolean("overApps", ReminderNotifier.canDrawOverOtherApps(context))
    promise.resolve(map)
  }

  /** which = "fullScreen" (locked or asleep) or "overApps" (another app in use). */
  @ReactMethod
  fun openSettings(which: String) {
    val pkg = context.packageName
    val wanted =
      if (which == "overApps") {
        Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$pkg"))
      } else if (Build.VERSION.SDK_INT >= 34) {
        Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:$pkg"))
      } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, pkg)
      } else {
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$pkg"))
      }
    // Some phones do not have every Settings page: fall back to the app's own page
    try {
      context.startActivity(wanted.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    } catch (e: Exception) {
      try {
        context.startActivity(
          Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$pkg"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      } catch (e2: Exception) {
        // Nothing more to try; the screen keeps showing "not allowed"
      }
    }
  }

  /** Shows the reminder in five seconds, with made-up numbers. Nothing is changed. */
  @ReactMethod
  fun tryIt() {
    val app = context.applicationContext
    Handler(Looper.getMainLooper()).postDelayed(
      {
        ReminderNotifier.show(
          app,
          title = "3 approvals are waiting for you",
          body = "LedgerTrace: 3",
          total = "3",
          evenIfOpen = true,
        )
      },
      5000,
    )
  }

  companion object {
    const val NAME = "HubReminder"
  }
}
