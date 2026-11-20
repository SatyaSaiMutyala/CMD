/* Browser push — notifications when no hub tab is open.

   The browser gives this site a "subscription" (an address the server can
   push to). It is sent to the hub backend after sign-in and removed on
   sign-out. Showing the notification is the service worker's job (public/sw.js).

   This file talks to the browser only. The server calls are passed in by the
   caller (getKey / sendSubscription / removeSubscription), which go through
   the store's API layer (store/api.js).

   Push is an extra: every call here fails quietly and reports a status. */

export const PUSH = {
  on: 'on',
  off: 'off', // not asked yet, or not registered
  blocked: 'blocked', // refused in the browser's settings
  unsupported: 'unsupported', // this browser cannot do it
  serverOff: 'server-off', // the backend has no push keys configured
}

const supported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

// The server's public key arrives as base64url; the browser wants bytes
const toBytes = (base64url) => {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}

const worker = () => navigator.serviceWorker.register('/sw.js')

/** Where push stands right now, without asking the user anything */
export async function pushStatus() {
  if (!supported()) return PUSH.unsupported
  if (Notification.permission === 'denied') return PUSH.blocked
  if (Notification.permission !== 'granted') return PUSH.off
  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js')
    const subscription = registration && (await registration.pushManager.getSubscription())
    return subscription ? PUSH.on : PUSH.off
  } catch {
    return PUSH.off
  }
}

/** Subscribe this browser and hand the subscription to the backend.
      ask               may show the browser's permission prompt
      getKey()          -> the server's public push key, or null
      sendSubscription(json) saves the subscription on the server
    Returns one of PUSH.*. */
export async function registerForPush({ ask = false, getKey, sendSubscription }) {
  if (!supported()) return PUSH.unsupported
  try {
    if (Notification.permission === 'default' && ask) await Notification.requestPermission()
    if (Notification.permission === 'denied') return PUSH.blocked
    if (Notification.permission !== 'granted') return PUSH.off

    const publicKey = await getKey()
    if (!publicKey) return PUSH.serverOff

    const registration = await worker()
    await navigator.serviceWorker.ready
    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toBytes(publicKey),
      })
    }
    await sendSubscription(subscription.toJSON())
    return PUSH.on
  } catch {
    return PUSH.off
  }
}

/** Stop pushing to this browser. `removeSubscription(endpoint)` deletes it on
    the server. Call BEFORE the session is cleared: that needs the login. */
export async function unregisterFromPush(removeSubscription) {
  if (!supported()) return
  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js')
    const subscription = registration && (await registration.pushManager.getSubscription())
    if (!subscription) return
    await Promise.resolve(removeSubscription(subscription.endpoint)).catch(() => {})
    await subscription.unsubscribe()
  } catch {
    /* the backend drops dead subscriptions by itself on the next send */
  }
}
