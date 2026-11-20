package com.app.approvalhub.reminder

import com.google.firebase.messaging.RemoteMessage
import io.invertase.firebase.messaging.ReactNativeFirebaseMessagingService

/**
 * Receives push messages from the hub backend.
 *
 * Everything the Firebase library for React Native does is kept (it is the
 * parent class). One thing is added: the 15-minute reminder. The backend sends
 * it to Android as a data message — { kind: "reminder", title, body, total } —
 * with no notification of its own, precisely so that this code runs and can
 * show it full screen, even when the app is closed. A new-approval message
 * carries its own notification and is shown by the phone as usual.
 *
 * Registered in AndroidManifest.xml in place of the library's service.
 */
class HubMessagingService : ReactNativeFirebaseMessagingService() {
  override fun onMessageReceived(remoteMessage: RemoteMessage) {
    super.onMessageReceived(remoteMessage)
    val data = remoteMessage.data
    if (data["kind"] != "reminder") return
    ReminderNotifier.show(
      applicationContext,
      title = data["title"].orEmpty().ifBlank { "Approvals are waiting for you" },
      body = data["body"].orEmpty(),
      total = data["total"].orEmpty(),
    )
  }
}
