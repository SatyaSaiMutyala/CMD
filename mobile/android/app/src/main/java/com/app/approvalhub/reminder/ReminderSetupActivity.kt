package com.app.approvalhub.reminder

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.TypedValue
import android.view.Gravity
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast

/**
 * "Full-screen reminder" setup, opened from the Alerts tab.
 *
 * Android does not let an app take over the screen unless the owner of the
 * phone has said yes, in two separate places in Settings. This screen shows
 * where each one stands, opens the right Settings page for it, and has a
 * button to try the reminder.
 *
 * Opened from JavaScript with
 *   Linking.sendIntent("com.app.approvalhub.REMINDER_SETUP")
 */
class ReminderSetupActivity : Activity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    window.statusBarColor = ReminderNotifier.BRAND
  }

  // Redrawn every time the CMD comes back from Settings, so the status is current
  override fun onResume() {
    super.onResume()
    render()
  }

  private fun render() {
    val fullScreen = ReminderNotifier.canUseFullScreen(this)
    val overApps = ReminderNotifier.canDrawOverOtherApps(this)

    val column =
      LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setBackgroundColor(GROUND)
        setPadding(dp(20), dp(28), dp(20), dp(28))
      }

    column.addView(text("Full-screen reminder", 24f, INK, bold = true))
    column.addView(
      text(
        "At the interval you choose, while approvals are waiting, the reminder can take over the " +
          "screen like an alarm. Android needs your permission for that in two places.",
        15f, MUTED,
      ).apply { setPadding(0, dp(8), 0, dp(16)) })

    column.addView(
      card(
        title = "When the phone is locked or asleep",
        about = "Wakes the screen and shows the reminder over the lock screen.",
        allowed = fullScreen,
        onAllow = { openSettings(fullScreenSettings()) },
      ))
    column.addView(
      card(
        title = "While you are using another app",
        about = "Shows the reminder over whatever is on screen. Turn on " +
          "\"Display over other apps\" for CMD Approval Hub.",
        allowed = overApps,
        onAllow = { openSettings(overlaySettings()) },
      ))

    column.addView(
      text(
        if (fullScreen && overApps) "Both are allowed. The reminder will cover the screen."
        else "Until both are allowed, the reminder still arrives as a normal notification with its sound.",
        14f, MUTED,
      ).apply { setPadding(dp(4), dp(4), dp(4), dp(20)) })

    column.addView(
      button("Try it in 5 seconds", Color.WHITE, ReminderNotifier.BRAND) { tryIt() },
      LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(52)))
    column.addView(
      text("Tap, then lock the phone or switch to another app.", 13f, MUTED).apply {
        gravity = Gravity.CENTER
        setPadding(0, dp(8), 0, dp(16))
      })
    column.addView(
      button("Done", INK, Color.WHITE) { finish() },
      LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(52)))

    setContentView(ScrollView(this).apply { setBackgroundColor(GROUND); addView(column) })
  }

  private fun tryIt() {
    Toast.makeText(this, "Reminder in 5 seconds…", Toast.LENGTH_SHORT).show()
    val app = applicationContext
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

  private fun fullScreenSettings(): Intent =
    if (Build.VERSION.SDK_INT >= 34) {
      Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:$packageName"))
    } else {
      appNotificationSettings()
    }

  private fun overlaySettings(): Intent =
    Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName"))

  private fun appNotificationSettings(): Intent =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, packageName)
    } else {
      Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName"))
    }

  // Some phones do not have every Settings page: fall back to the app's own page
  private fun openSettings(intent: Intent) {
    try {
      startActivity(intent)
    } catch (e: Exception) {
      try {
        startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName")))
      } catch (e2: Exception) {
        Toast.makeText(this, "Open Settings → Apps → CMD Approval Hub", Toast.LENGTH_LONG).show()
      }
    }
  }

  private fun card(title: String, about: String, allowed: Boolean, onAllow: () -> Unit) =
    LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      background =
        GradientDrawable().apply {
          cornerRadius = dp(16).toFloat()
          setColor(Color.WHITE)
          setStroke(dp(1), LINE)
        }
      setPadding(dp(16), dp(16), dp(16), dp(16))
      layoutParams =
        LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
          .apply { bottomMargin = dp(12) }
      addView(text(title, 16f, INK, bold = true))
      addView(text(about, 14f, MUTED).apply { setPadding(0, dp(4), 0, dp(12)) })
      if (allowed) {
        addView(text("Allowed", 14f, ReminderNotifier.BRAND, bold = true))
      } else {
        addView(
          button("Allow in Settings", Color.WHITE, ReminderNotifier.BRAND) { onAllow() },
          LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, dp(44)))
      }
    }

  private fun text(value: String, sizeSp: Float, color: Int, bold: Boolean = false) =
    TextView(this).apply {
      text = value
      setTextSize(TypedValue.COMPLEX_UNIT_SP, sizeSp)
      setTextColor(color)
      if (bold) setTypeface(typeface, Typeface.BOLD)
    }

  private fun button(label: String, textColor: Int, fill: Int, onTap: () -> Unit) =
    text(label, 15f, textColor, bold = true).apply {
      gravity = Gravity.CENTER
      isClickable = true
      isFocusable = true
      setPadding(dp(18), 0, dp(18), 0)
      background =
        GradientDrawable().apply {
          cornerRadius = dp(12).toFloat()
          setColor(fill)
          if (fill == Color.WHITE) setStroke(dp(1), LINE)
        }
      setOnClickListener { onTap() }
    }

  private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

  private companion object {
    const val GROUND = 0xFFF4F1EA.toInt()
    const val INK = 0xFF14201D.toInt()
    const val MUTED = 0xFF5F6B67.toInt()
    const val LINE = 0xFFDDD8CC.toInt()
  }
}
