package com.app.approvalhub

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    createNotificationChannels()
    loadReactNative(this)
  }

  /**
   * The two kinds of notification the hub sends, each with its own sound
   * (res/raw/approval.wav and res/raw/reminder.wav).
   *
   * On Android the sound belongs to the channel, not to the notification, and
   * a channel's sound cannot be changed once it exists on a phone. The ids
   * therefore carry a version: to change a sound later, add "_v2" channels
   * here and in the backend (src/services/push.js) rather than editing these.
   *
   * Created at app start, before any notification can arrive, so a push that
   * comes in while the app is closed already finds its channel.
   */
  private fun createNotificationChannels() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(NotificationManager::class.java) ?: return
    val audio =
      AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build()

    fun channel(id: String, name: String, about: String, sound: Int) =
      NotificationChannel(id, name, NotificationManager.IMPORTANCE_HIGH).apply {
        description = about
        setSound(Uri.parse("android.resource://$packageName/$sound"), audio)
        enableVibration(true)
        setShowBadge(true)
      }

    manager.createNotificationChannel(
      channel("approvals_v1", "New approvals", "When a new approval arrives for you", R.raw.approval)
    )
    manager.createNotificationChannel(
      channel(
        "reminders_v1",
        "Pending reminders",
        "Every 15 minutes while approvals are waiting",
        R.raw.reminder,
      )
    )
  }
}
