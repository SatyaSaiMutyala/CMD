package com.app.approvalhub.reminder

import android.app.ActivityManager
import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.app.approvalhub.MainActivity
import com.app.approvalhub.R

/**
 * Shows the 15-minute "approvals are waiting" reminder on Android.
 *
 * Two things happen, so the reminder covers the screen whatever the phone is
 * doing:
 *
 *   1. A notification with a full-screen intent. On a locked or sleeping
 *      phone Android wakes the screen and opens [ReminderActivity] over the
 *      lock screen — the way an alarm or an incoming call does. Its channel
 *      plays the reminder sound.
 *   2. If the CMD has allowed "Display over other apps", the reminder screen
 *      is also opened directly, so it covers whatever app is in use. Without
 *      that permission Android only allows a heads-up banner while the phone
 *      is unlocked and in use.
 *
 * When the hub itself is open in front, nothing is shown from here: the app
 * shows its own in-app reminder (driven by the live socket) and two reminders
 * at once would be noise.
 */
object ReminderNotifier {
  /** Must match the channel created in MainApplication and used by the backend. */
  const val CHANNEL_ID = "reminders_v1"
  const val EXTRA_TITLE = "title"
  const val EXTRA_BODY = "body"
  const val EXTRA_TOTAL = "total"

  /** What opening the hub from a reminder looks like to the JavaScript side. */
  const val REVIEW_URL = "cmdhub://review"

  private const val TAG = "cmd-hub-reminder"
  private const val ID = 1501

  fun show(context: Context, title: String, body: String, total: String, evenIfOpen: Boolean = false) {
    if (!evenIfOpen && isAppInFront()) return
    val manager = context.getSystemService(NotificationManager::class.java) ?: return

    val screen = reminderIntent(context, title, body, total)
    val fullScreen =
      PendingIntent.getActivity(
        context, 1, screen, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val tap =
      PendingIntent.getActivity(
        context, 2, reviewIntent(context), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

    val builder =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        Notification.Builder(context, CHANNEL_ID)
      } else {
        @Suppress("DEPRECATION")
        Notification.Builder(context).setPriority(Notification.PRIORITY_MAX)
      }
    val notification =
      builder
        .setSmallIcon(R.drawable.ic_stat_hub)
        .setColor(BRAND)
        .setContentTitle(title)
        .setContentText(body)
        .setStyle(Notification.BigTextStyle().bigText(body))
        .setCategory(Notification.CATEGORY_ALARM)
        .setVisibility(Notification.VISIBILITY_PUBLIC)
        .setAutoCancel(true)
        .setContentIntent(tap)
        .setFullScreenIntent(fullScreen, true)
        .build()
    // Same tag every time: a new reminder replaces the last, they never pile up
    manager.notify(TAG, ID, notification)

    if (canDrawOverOtherApps(context)) {
      try {
        context.startActivity(screen)
      } catch (e: Exception) {
        // The notification above is still there
      }
    }
  }

  fun cancel(context: Context) {
    context.getSystemService(NotificationManager::class.java)?.cancel(TAG, ID)
  }

  fun reminderIntent(context: Context, title: String, body: String, total: String): Intent =
    Intent(context, ReminderActivity::class.java)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      .putExtra(EXTRA_TITLE, title)
      .putExtra(EXTRA_BODY, body)
      .putExtra(EXTRA_TOTAL, total)

  /** Opens the hub and tells it (through a link) to go to what is pending. */
  fun reviewIntent(context: Context): Intent =
    Intent(Intent.ACTION_VIEW, Uri.parse(REVIEW_URL))
      .setClass(context, MainActivity::class.java)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)

  /** Android 14+ asks the user to allow full-screen notifications for most apps. */
  fun canUseFullScreen(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < 34) return true
    return context.getSystemService(NotificationManager::class.java)?.canUseFullScreenIntent() ?: false
  }

  fun canDrawOverOtherApps(context: Context): Boolean =
    Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context)

  private fun isAppInFront(): Boolean {
    val state = ActivityManager.RunningAppProcessInfo()
    ActivityManager.getMyMemoryState(state)
    return state.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
  }

  // The colours of the app's design (src/theme/colors.js)
  const val BRAND = 0xFF27B198.toInt()
  const val INK = 0xFF053A32.toInt()
  const val MUTED = 0xFF3D6B63.toInt()
  const val YELLOW = 0xFFFFED00.toInt()
  const val MINT = 0xFFEAF8F5.toInt()
  // Older names, still used by the setup screen kept for older builds
  const val BRAND_DARK = BRAND
  const val GOLD = YELLOW
}
