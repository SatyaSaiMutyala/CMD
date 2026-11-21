package com.app.approvalhub.reminder

import android.app.Activity
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowInsets
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import com.app.approvalhub.R
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
 *
 * Drawn to the app's design ("Android lock-screen reminder"): teal, with the
 * time inside a yellow ring and a white card at the bottom.
 *
 * The ring is not at a fixed place on the screen. The time and date sit in
 * the middle of whatever room is left between the name at the top and the
 * card at the bottom, and the ring is drawn around that exact point and sized
 * to that room — so on a short phone, a tall one, or with a longer card, the
 * time is always in the centre of the ring and the ring never runs under the
 * card.
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

    // Edge to edge: the teal runs behind the status bar, the navigation bar
    // and the camera cut-out, so the reminder covers the whole screen
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      window.setDecorFitsSystemWindows(false)
    } else {
      @Suppress("DEPRECATION")
      window.decorView.systemUiVisibility =
        View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
          View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
          View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      window.attributes =
        window.attributes.apply {
          layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
        }
    }
    window.statusBarColor = Color.TRANSPARENT
    window.navigationBarColor = Color.TRANSPARENT
  }

  private fun render(intent: Intent) {
    val body = intent.getStringExtra(ReminderNotifier.EXTRA_BODY).orEmpty()
    val total = intent.getStringExtra(ReminderNotifier.EXTRA_TOTAL).orEmpty()
    val now = Date()

    val column =
      LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        gravity = Gravity.CENTER_HORIZONTAL
        setPadding(dp(22), dp(70), dp(22), dp(30))
        // the card's shadow falls into the padding; cutting it there left a
        // dark band under the card's corners
        clipToPadding = false
        clipChildren = false
        // The words keep clear of the bars the background now runs behind
        setOnApplyWindowInsetsListener { view, insets ->
          val top: Int
          val bottom: Int
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val bars =
              insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout())
            top = bars.top
            bottom = bars.bottom
          } else {
            @Suppress("DEPRECATION")
            top = insets.systemWindowInsetTop
            @Suppress("DEPRECATION")
            bottom = insets.systemWindowInsetBottom
          }
          view.setPadding(dp(22), dp(46) + top, dp(22), dp(24) + bottom)
          insets
        }
      }

    // "CMD Approval Hub", with the padlock
    column.addView(
      text("CMD Approval Hub", 12.5f, ReminderNotifier.INK, EXTRA_BOLD).apply {
        gravity = Gravity.CENTER_VERTICAL
        background = pill(Color.WHITE, 17)
        setPadding(dp(14), 0, dp(14), 0)
        compoundDrawablePadding = dp(7)
        setCompoundDrawablesRelativeWithIntrinsicBounds(R.drawable.ic_lock, 0, 0, 0)
      },
      LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, dp(34)))

    val clock =
      text(SimpleDateFormat("h:mm", Locale.getDefault()).format(now), CLOCK_DP, Color.WHITE, DISPLAY).apply {
        // The clock is a picture, not reading text: it does not grow with the font setting
        setTextSize(TypedValue.COMPLEX_UNIT_DIP, CLOCK_DP)
        letterSpacing = -0.04f
        includeFontPadding = false
        gravity = Gravity.CENTER
        maxLines = 1
      }
    val date =
      text(SimpleDateFormat("EEE, d MMM", Locale.getDefault()).format(now), 15f, Color.WHITE, BOLD).apply {
        setTextSize(TypedValue.COMPLEX_UNIT_DIP, 15f)
        gravity = Gravity.CENTER
        maxLines = 1
        setPadding(0, dp(4), 0, 0)
      }
    // The time over the date, as one block
    val face =
      LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        gravity = Gravity.CENTER_HORIZONTAL
        addView(clock, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT))
        addView(date, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT))
      }
    // All the room between the name and the card, with that block dead centre
    val stage =
      FrameLayout(this).apply {
        addView(
          face,
          FrameLayout.LayoutParams(FrameLayout.LayoutParams.WRAP_CONTENT, FrameLayout.LayoutParams.WRAP_CONTENT, Gravity.CENTER))
      }
    column.addView(stage, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f))
    column.addView(
      card(total, body),
      LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))

    val rings = Rings(this)
    val root = FrameLayout(this).apply { setBackgroundColor(ReminderNotifier.BRAND) }
    root.addView(rings, FrameLayout.LayoutParams(MATCH, MATCH))
    root.addView(column, FrameLayout.LayoutParams(MATCH, MATCH))

    // Once the room is known: the ring goes round the centre of it, as large
    // as fits (never under the card, never off the sides), and the time is
    // sized to sit inside the ring.
    var clockDp = CLOCK_DP
    stage.addOnLayoutChangeListener { _, _, top, _, bottom, _, _, _, _ ->
      val room = bottom - top
      if (room <= 0 || root.width <= 0) return@addOnLayoutChangeListener
      val radius =
        minOf(dp(RING_DP), room / 2 - dp(RING_STROKE_DP / 2 + 14), root.width / 2 - dp(RING_STROKE_DP / 2 + 16))
          .coerceAtLeast(dp(52))
      rings.place(root.width / 2f, column.top + top + room / 2f, radius.toFloat())
      val wanted = radius / resources.displayMetrics.density * CLOCK_PER_RADIUS
      if (Math.abs(wanted - clockDp) > 0.5f) {
        clockDp = wanted
        // after this layout pass, not in the middle of it
        clock.post { clock.setTextSize(TypedValue.COMPLEX_UNIT_DIP, wanted) }
      }
    }
    setContentView(root)
  }

  /** The white card: the count, where the approvals are, and the two buttons. */
  private fun card(total: String, body: String): View {
    val card =
      LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        background = pill(Color.WHITE, 34)
        setPadding(dp(22), dp(22), dp(22), dp(22))
        elevation = dp(12).toFloat()
      }

    // "LedgerTrace: 22 · PACE: 3" -> "LedgerTrace · 22", one line per software
    val where =
      body.split(" · ").map { it.trim() }.filter { it.isNotEmpty() }.joinToString("\n") { line ->
        if (line.contains(":")) "${line.substringBeforeLast(":").trim()} · ${line.substringAfterLast(":").trim()}"
        else line
      }

    val words =
      LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(14), 0, 0, 0)
        addView(text(if (total == "1") "approval waiting" else "approvals waiting", 18f, ReminderNotifier.INK, EXTRA_BOLD))
        if (where.isNotEmpty()) {
          addView(text(where, 13.5f, ReminderNotifier.MUTED, SEMI_BOLD).apply { setPadding(0, dp(3), 0, 0) })
        }
      }
    card.addView(
      LinearLayout(this).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity = Gravity.CENTER_VERTICAL
        addView(
          text(total.ifBlank { "!" }, 34f, ReminderNotifier.INK, DISPLAY).apply {
            setTextSize(TypedValue.COMPLEX_UNIT_DIP, if (total.length > 2) 26f else 34f)
            gravity = Gravity.CENTER
            includeFontPadding = false
            background = pill(ReminderNotifier.YELLOW, 38)
          },
          LinearLayout.LayoutParams(dp(76), dp(76)))
        addView(words, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
      })

    card.addView(
      LinearLayout(this).apply {
        orientation = LinearLayout.HORIZONTAL
        addView(
          button("Dismiss", 15f, BOLD, ReminderNotifier.MINT, lock = false) { dismiss() },
          LinearLayout.LayoutParams(0, dp(58), 1f))
        addView(
          button("Review now", 15.5f, EXTRA_BOLD, ReminderNotifier.YELLOW, lock = true) { review() },
          LinearLayout.LayoutParams(0, dp(58), 1.6f).apply { marginStart = dp(10) })
      },
      LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
        .apply { topMargin = dp(16) })

    card.addView(
      text("Unlock your phone to open the hub", 12.5f, ReminderNotifier.MUTED, SEMI_BOLD).apply {
        gravity = Gravity.CENTER
        setPadding(0, dp(16), 0, 0)
      },
      LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))
    return card
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

  private fun text(value: String, sizeSp: Float, color: Int, font: String) =
    TextView(this).apply {
      text = value
      setTextSize(TypedValue.COMPLEX_UNIT_SP, sizeSp)
      setTextColor(color)
      typeface = typefaceOf(font)
    }

  private fun button(label: String, sizeSp: Float, font: String, fill: Int, lock: Boolean, onTap: () -> Unit): View {
    val words =
      text(label, sizeSp, ReminderNotifier.INK, font).apply {
        gravity = Gravity.CENTER
        if (lock) {
          compoundDrawablePadding = dp(8)
          setCompoundDrawablesRelativeWithIntrinsicBounds(R.drawable.ic_lock, 0, 0, 0)
        }
      }
    // A frame around the words keeps the padlock and the label centred together
    return FrameLayout(this).apply {
      background = pill(fill, 29)
      isClickable = true
      isFocusable = true
      contentDescription = label
      setOnClickListener { onTap() }
      addView(
        words,
        FrameLayout.LayoutParams(FrameLayout.LayoutParams.WRAP_CONTENT, FrameLayout.LayoutParams.WRAP_CONTENT, Gravity.CENTER))
    }
  }

  private fun pill(fill: Int, radiusDp: Int) =
    GradientDrawable().apply {
      cornerRadius = dp(radiusDp).toFloat()
      setColor(fill)
    }

  // The app's own fonts (linked into assets/fonts); the phone's bold if one is missing
  private fun typefaceOf(name: String): Typeface =
    try {
      Typeface.createFromAsset(assets, "fonts/$name.ttf")
    } catch (e: Exception) {
      Typeface.DEFAULT_BOLD
    }

  private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

  /**
   * The yellow ring round the time, and two faint ones outside it. It fills
   * the screen so the outer rings can run off the edges; where the centre is
   * and how big the ring is are given by [place], from where the time sits.
   */
  private class Rings(context: Context) : View(context) {
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
    private var cx = 0f
    private var cy = 0f
    private var radius = 0f

    fun place(x: Float, y: Float, r: Float) {
      if (x == cx && y == cy && r == radius) return
      cx = x
      cy = y
      radius = r
      invalidate()
    }

    override fun onDraw(canvas: Canvas) {
      if (radius <= 0f) return
      val d = resources.displayMetrics.density
      paint.color = ReminderNotifier.YELLOW
      paint.alpha = 255
      paint.strokeWidth = RING_STROKE_DP * d
      canvas.drawCircle(cx, cy, radius, paint)
      paint.color = Color.WHITE
      paint.strokeWidth = 2 * d
      paint.alpha = 115
      canvas.drawCircle(cx, cy, radius + 52 * d, paint)
      paint.alpha = 64
      canvas.drawCircle(cx, cy, radius + 104 * d, paint)
    }
  }

  private companion object {
    const val MATCH = FrameLayout.LayoutParams.MATCH_PARENT
    // The ring: the most its radius may be (to the middle of the band), and
    // how thick the band is
    const val RING_DP = 138
    const val RING_STROKE_DP = 22
    // The time's height for a ring of a given radius: "12:45" then spans about
    // three quarters of the inside of the ring, with the date under it
    const val CLOCK_PER_RADIUS = 0.6f
    // Where the time starts before the room has been measured
    const val CLOCK_DP = 68f
    const val DISPLAY = "BricolageGrotesque-ExtraBold"
    const val EXTRA_BOLD = "Inter-ExtraBold"
    const val BOLD = "Inter-Bold"
    const val SEMI_BOLD = "Inter-SemiBold"
  }
}
