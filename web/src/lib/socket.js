import { io } from 'socket.io-client'
import { API_URL } from './api.js'

/* The live line to the hub backend. The server pushes four things:
     hub:changed  { software, stage }        something moved — refetch that list
     hub:arrival  { title, body, software }  a new approval — chime and snackbar
     hub:reminder { total, bySoftware }      the 15-minute reminder
     hub:settings { at }                     a setting changed on another device
   The connection re-opens by itself; `onReconnect` lets the app catch up on
   whatever it missed while it was down. */

export function openHubSocket(token, handlers) {
  const socket = io(`${API_URL}/hub`, {
    path: '/socket.io',
    transports: ['websocket'],
    reconnectionDelay: 1000,
    reconnectionDelayMax: 15000,
  })
  let connectedBefore = false

  socket.on('connect', () => {
    socket.emit('hub:subscribe', { token })
    if (connectedBefore && handlers.onReconnect) handlers.onReconnect()
    connectedBefore = true
  })
  socket.on('hub:changed', (p) => handlers.onChanged && handlers.onChanged(p || {}))
  socket.on('hub:arrival', (p) => handlers.onArrival && handlers.onArrival(p || {}))
  socket.on('hub:reminder', (p) => handlers.onReminder && handlers.onReminder(p || {}))
  socket.on('hub:settings', (p) => handlers.onSettings && handlers.onSettings(p || {}))

  return () => {
    socket.removeAllListeners()
    socket.close()
  }
}
