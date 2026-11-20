package com.app.approvalhub.reminder

import android.app.Activity
import android.app.KeyguardManager
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * The full-screen reminder: how many approvals are waiting, with two choices.
 *
 * It can appear over the lock screen, so it shows only the count and where the
 * approvals are — never an amount or a supplier, and nothing can be approved
 * from here. "Review now" asks for the phone to be unlocked first and then
 * opens the hub; "Dismiss" just closes it. The reminder comes back in 15
 * minutes for as long as something is still pending.
 */
class ReminderActivity : Activity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    showOverLockScreen()
    render(intent)
  }

  // A newer reminder while this one is still up: show the newer numbers
  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    render(intent)
  }

  private fun showOverLockScreen() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
    }
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    window.statusBarColor = ReminderNotifier.BRAND_DARK
    window.navigationBarColor = ReminderNotifier.BRAND_DARK
  }

  private fun render(intent: Intent) {
    val title = intent.getStringExtra(ReminderNotifier.EXTRA_TITLE).orEmpty()
    val body = intent.getStringExtra(ReminderNotifier.EXTRA_BODY).orEmpty()
    val total = intent.getStringExtra(ReminderNotifier.EXTRA_TOTAL).orEmpty()

    val root =
      LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        gravity = Gravity.CENTER_HORIZONTAL
        setBackgroundColor(ReminderNotifier.BRAND_DARK)
        setPadding(dp(28), dp(72), dp(28), dp(40))
      }

    root.addView(text(SimpleDateFormat("h:mm a", Locale.getDefault()).format(Date()), 15f, 0xB3FFFFFF.toInt()))
    root.addView(
      text("APPROVALS PENDING", 13f, ReminderNotifier.GOLD, bold = true).apply {
        letterSpacing = 0.14f
        setPadding(0, dp(8), 0, 0)
      })

    // The count, in a ring
    root.addView(
      text(total.ifBlank { "!" }, 76f, ReminderNotifier.GOLD, bold = true).apply {
        gravity = Gravity.CENTER
        background =
          GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(Color.TRANSPARENT)
            setStroke(dp(3), ReminderNotifier.GOLD)
          }
        layoutParams =
          LinearLayout.LayoutParams(dp(190), dp(190)).apply {
            topMargin = dp(36)
            bottomMargin = dp(24)
          }
      })

    root.addView(
      text(title.ifBlank { "Approvals are waiting for you" }, 21f, Color.WHITE, bold = true).apply {
        gravity = Gravity.CENTER
      })

    // "LedgerTrace: 22 · PACE: 3" -> one line per software
    val lines = body.split(" · ").map { it.trim() }.filter { it.isNotEmpty() }
    if (lines.isNotEmpty()) {
      val box =
        LinearLayout(this).apply {
          orientation = LinearLayout.VERTICAL
          background =
            GradientDrawable().apply {
              cornerRadius = dp(14).toFloat()
              setColor(0x1FFFFFFF)
            }
          setPadding(dp(18), dp(6), dp(18), dp(6))
          layoutParams =
            LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
              .apply { topMargin = dp(24) }
        }
      lines.forEach { line ->
        val name = line.substringBeforeLast(":").trim()
        val count = if (line.contains(":")) line.substringAfterLast(":").trim() else ""
        box.addView(
          LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(0, dp(12), 0, dp(12))
            addView(
              text(name, 16f, Color.WHITE).apply {
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
              })
            addView(text(count, 17f, ReminderNotifier.GOLD, bold = true))
          })
      }
      root.addView(box)
    }

    // Pushes the buttons to the bottom
    root.addView(View(this), LinearLayout.LayoutParams(0, 0, 1f))

    root.addView(
      button("Review now", ReminderNotifier.BRAND_DARK, Color.WHITE) { review() },
      LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(56)))
    root.addView(
      button("Dismiss", Color.WHITE, 0x24FFFFFF) { dismiss() },
      LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(52)).apply { topMargin = dp(12) })

    setContentView(root)
  }

  private fun review() {
    val open = {
      ReminderNotifier.cancel(this)
      startActivity(ReminderNotifier.reviewIntent(this))
      finish()
    }
    val keyguard = getSystemService(KeyguardManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && keyguard != null && keyguard.isKeyguardLocked) {
      // Locked: the hub opens only after the CMD unlocks the phone
      keyguard.requestDismissKeyguard(
        this,
        object : KeyguardManager.KeyguardDismissCallback() {
          override fun onDismissSucceeded() = open()
        })
    } else {
      open()
    }
  }

  private fun dismiss() {
    ReminderNotifier.cancel(this)
    finish()
  }

  private fun text(value: String, sizeSp: Float, color: Int, bold: Boolean = false) =
    TextView(this).apply {
      text = value
      setTextSize(TypedValue.COMPLEX_UNIT_SP, sizeSp)
      setTextColor(color)
      if (bold) setTypeface(typeface, Typeface.BOLD)
    }

  private fun button(label: String, textColor: Int, fill: Int, onTap: () -> Unit) =
    text(label, 17f, textColor, bold = true).apply {
      gravity = Gravity.CENTER
      isClickable = true
      isFocusable = true
      background =
        GradientDrawable().apply {
          cornerRadius = dp(14).toFloat()
          setColor(fill)
        }
      setOnClickListener { onTap() }
    }

  private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()
}
