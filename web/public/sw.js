/* Service worker for CMD Approval Hub — its only job is push notifications.

   The hub backend sends a push for a new approval and for the 15-minute
   reminder. The browser wakes this file to show it, even when no hub tab is
   open (the browser itself must still be running; on a phone, the site must
   be installed to the home screen for iPhone to allow it).

   If a hub tab is open and in front, nothing is shown from here: that tab is
   already showing the snackbar or the reminder, with sound. */

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let message = {}
  try {
    message = event.data ? event.data.json() : {}
  } catch {
    message = { title: 'CMD Approval Hub', body: event.data ? event.data.text() : '' }
  }
  const reminder = message.kind === 'reminder'

  event.waitUntil(
    (async () => {
      const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      if (tabs.some((tab) => tab.visibilityState === 'visible' && tab.focused)) return
      await self.registration.showNotification(message.title || 'CMD Approval Hub', {
        body: message.body || '',
        icon: '/trustlab-logo.png',
        badge: '/trustlab-logo.png',
        // One reminder at a time: a newer one replaces the older
        tag: reminder ? 'cmd-hub-reminder' : `cmd-hub-${(message.data && message.data.ref) || Date.now()}`,
        renotify: reminder,
        // The reminder stays on screen until it is dealt with
        requireInteraction: reminder,
        data: message.data || {},
      })
    })(),
  )
})

// Clicking a notification opens the hub on the software it was about
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const software = event.notification.data && event.notification.data.software
  const path = software ? `/software/${encodeURIComponent(software)}` : '/'

  event.waitUntil(
    (async () => {
      const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const tab = tabs[0]
      if (tab) {
        await tab.focus()
        if ('navigate' in tab) await tab.navigate(path).catch(() => {})
        return
      }
      await self.clients.openWindow(path)
    })(),
  )
})
