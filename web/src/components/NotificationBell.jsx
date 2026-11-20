import AccessAlarmIcon from '@mui/icons-material/AccessAlarm'
import CloseIcon from '@mui/icons-material/Close'
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined'
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import IconButton from '@mui/material/IconButton'
import Popover from '@mui/material/Popover'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { findSoftware } from '../data/registry.js'
import { stamp } from '../lib/format.js'
import { PATHS, softwarePath } from '../lib/paths.js'
import { useHub } from '../state/hubContext.js'
import { Mono } from './bits.jsx'

/* The bell in the top bar and what it opens: the hub's notifications, newest
   first — every new approval and every 15-minute reminder, including the ones
   that arrived while this browser was closed.

   The number on the bell is how many are unread. Opening one marks it read
   and goes to the software it was about. "Remove" and "Clear all" take
   notifications out of this list; the server keeps its record of them. */

function Row({ note, onOpen, onRemove }) {
  const sw = note.swId ? findSoftware(note.swId) : null
  return (
    <Box
      sx={{
        position: 'relative',
        borderBottom: '1px solid',
        borderColor: 'hub.line2',
        bgcolor: note.read ? 'transparent' : 'hub.accentSoft',
        '&:hover .remove, &:focus-within .remove': { opacity: 1 },
      }}
    >
      <ButtonBase
        onClick={onOpen}
        sx={{ display: 'flex', width: '100%', alignItems: 'flex-start', gap: 1.5, textAlign: 'left', pl: 2, pr: 5.5, py: 1.25 }}
      >
        {note.kind === 'reminder' || !sw ? (
          <Box
            aria-hidden
            sx={{
              width: 34,
              height: 34,
              flexShrink: 0,
              borderRadius: '8px',
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'hub.warnSoft',
              color: 'hub.warn',
            }}
          >
            <AccessAlarmIcon sx={{ fontSize: 19 }} />
          </Box>
        ) : (
          <Mono label={sw.mono} size={34} />
        )}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: note.read ? 500 : 700, lineHeight: 1.35 }}>{note.title}</Typography>
          {note.body ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', overflowWrap: 'anywhere' }}>
              {note.body}
            </Typography>
          ) : null}
          <Typography variant="mono" sx={{ display: 'block', mt: 0.25, fontSize: 11, color: 'hub.faint' }}>
            {stamp(note.ts)}
          </Typography>
        </Box>
        {note.read ? null : (
          <Box
            aria-label="Unread"
            role="img"
            sx={{ position: 'absolute', top: 12, right: 14, width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }}
          />
        )}
      </ButtonBase>
      <IconButton
        className="remove"
        size="small"
        aria-label={`Remove: ${note.title}`}
        title="Remove from this list"
        onClick={onRemove}
        sx={{ position: 'absolute', right: 6, bottom: 6, opacity: { xs: 1, md: 0 }, color: 'hub.faint' }}
      >
        <CloseIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Box>
  )
}

/** `sx` styles the bell button itself (its colour differs on the phone's dark bar). */
export default function NotificationBell({ sx }) {
  const {
    store,
    reloadNotifications,
    moreNotifications,
    readNotification,
    readAllNotifications,
    removeNotification,
    removeAllNotifications,
  } = useHub()
  const navigate = useNavigate()
  const [anchor, setAnchor] = useState(null)
  const [loadingMore, setLoadingMore] = useState(false)
  // "Clear all" asks once more before it empties the list
  const [clearing, setClearing] = useState(false)
  const { notifications, notificationsLoaded, notificationsMore, unread } = store

  const close = () => {
    setAnchor(null)
    setClearing(false)
  }
  const openNote = (note) => {
    if (!note.read) readNotification(note.id)
    close()
    navigate(note.swId && findSoftware(note.swId) ? softwarePath(note.swId) : PATHS.overview)
  }
  const more = async () => {
    setLoadingMore(true)
    await moreNotifications()
    setLoadingMore(false)
  }

  const label = unread ? `Notifications, ${unread} unread` : 'Notifications'
  return (
    <>
      <IconButton
        onClick={(e) => {
          setAnchor(e.currentTarget)
          reloadNotifications()
        }}
        aria-label={label}
        title={label}
        aria-haspopup="dialog"
        sx={sx}
      >
        <Badge badgeContent={unread} color="error" max={99}>
          <NotificationsNoneOutlinedIcon />
        </Badge>
      </IconButton>

      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            'aria-label': 'Notifications',
            sx: { mt: 1, width: 400, maxWidth: 'calc(100vw - 24px)', display: 'flex', flexDirection: 'column', maxHeight: 'min(560px, calc(100vh - 96px))' },
          },
        }}
      >
        <Stack
          direction="row"
          sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, px: 2, py: 1.25, borderBottom: '2px solid', borderColor: 'primary.main' }}
        >
          <Box>
            <Typography variant="h3">Notifications</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {unread ? `${unread} unread` : 'All read'}
            </Typography>
          </Box>
          {notifications.length ? (
            <Stack direction="row" spacing={0.5}>
              {clearing ? (
                <>
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    onClick={() => {
                      setClearing(false)
                      removeAllNotifications()
                    }}
                  >
                    Yes, clear all
                  </Button>
                  <Button size="small" variant="text" onClick={() => setClearing(false)}>
                    Keep
                  </Button>
                </>
              ) : (
                <>
                  <Button size="small" variant="text" disabled={!unread} onClick={() => readAllNotifications()}>
                    Mark all read
                  </Button>
                  <Button size="small" variant="text" color="error" onClick={() => setClearing(true)}>
                    Clear all
                  </Button>
                </>
              )}
            </Stack>
          ) : null}
        </Stack>

        <Box sx={{ overflowY: 'auto', flex: 1 }}>
          {notifications.length ? (
            <>
              {notifications.map((note) => (
                <Row key={note.id} note={note} onOpen={() => openNote(note)} onRemove={() => removeNotification(note.id)} />
              ))}
              {notificationsMore ? (
                <Box sx={{ p: 1.25, textAlign: 'center' }}>
                  <Button size="small" variant="outlined" disabled={loadingMore} onClick={more}>
                    {loadingMore ? 'Loading…' : 'Show older'}
                  </Button>
                </Box>
              ) : null}
            </>
          ) : (
            <Box sx={{ px: 3, py: 5, textAlign: 'center' }}>
              <Typography variant="h3" sx={{ mb: 0.5 }}>
                {notificationsLoaded ? 'No notifications' : 'Loading…'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {notificationsLoaded
                  ? 'New approvals and reminders are listed here as they arrive.'
                  : 'Getting your notifications.'}
              </Typography>
            </Box>
          )}
        </Box>
      </Popover>
    </>
  )
}
