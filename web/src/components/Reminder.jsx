import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { keyframes } from '@mui/material/styles'
import { REGISTRY } from '../data/registry.js'
import { clockTime } from '../lib/format.js'
import { useHub } from '../state/hubContext.js'
import { swPending, totalPending } from '../state/selectors.js'
import { fonts, RAIL_BG } from '../theme/tokens.js'

const pulse = keyframes({
  from: { transform: 'scale(.7)', opacity: 0.6 },
  to: { transform: 'scale(1.25)', opacity: 0 },
})

const ring = {
  content: '""',
  position: 'absolute',
  inset: 0,
  borderRadius: '50%',
  border: '2px solid #FFC81F',
  opacity: 0.5,
  animation: `${pulse} 2.4s ease-out infinite`,
}

/* Full-screen reminder every 15 minutes of what is still pending. */
export default function Reminder() {
  const { remindOpen, store, reviewNow, snoozeReminder, dismissReminder } = useHub()
  if (!remindOpen) return null

  const total = totalPending(store)
  let rows = REGISTRY.filter((sw) => sw.connected && swPending(store, sw) > 0)
  if (!rows.length) rows = REGISTRY.filter((sw) => sw.connected)
  const time = clockTime(new Date())

  return (
    <Dialog
      open
      fullScreen
      hideBackdrop
      onClose={dismissReminder}
      transitionDuration={250}
      sx={{ zIndex: (theme) => theme.zIndex.modal + 100 }}
      slotProps={{
        paper: {
          role: 'alertdialog',
          'aria-label': `${total} approvals pending`,
          sx: { background: RAIL_BG, bgcolor: 'hub.rail', color: '#fff', alignItems: 'center', px: 3, py: 6, overflowY: 'auto' },
        },
      }}
    >
      <Stack sx={{ width: '100%', maxWidth: 440, flex: 1, alignItems: 'center' }}>
        <Typography variant="mono" sx={{ color: 'hub.railMuted' }}>
          {time}
        </Typography>
        <Typography variant="eyebrow" sx={{ color: 'hub.gold', letterSpacing: '0.14em', mt: 0.75 }}>
          Approvals pending
        </Typography>
        <Box
          sx={{
            position: 'relative',
            width: 170,
            height: 170,
            flexShrink: 0,
            mt: 4,
            mb: 1.5,
            display: 'grid',
            placeItems: 'center',
            '&::before': ring,
            '&::after': { ...ring, animationDelay: '1.2s' },
          }}
        >
          <Box sx={{ fontFamily: fonts.mono, fontSize: 88, fontWeight: 600, lineHeight: 1, color: 'hub.gold' }}>{total}</Box>
        </Box>
        <Typography sx={{ fontSize: 21, fontWeight: 600, mb: 3, textAlign: 'center' }}>
          {total === 1 ? 'approval is' : 'approvals are'} waiting for you
        </Typography>
        <Box sx={{ width: '100%', bgcolor: 'rgba(255,255,255,.08)', borderRadius: '12px', px: 2, py: 0.5, mb: 'auto' }}>
          {rows.map((sw, i) => (
            <Stack
              key={sw.id}
              direction="row"
              sx={{ justifyContent: 'space-between', gap: 1.5, py: 1.5, borderTop: i ? '1px solid rgba(255,255,255,.14)' : 0 }}
            >
              <Typography sx={{ fontSize: 15 }}>{sw.name}</Typography>
              <Typography variant="mono" sx={{ fontSize: 16, fontWeight: 600, color: 'hub.gold' }}>
                {swPending(store, sw) || 0}
              </Typography>
            </Stack>
          ))}
        </Box>
        <Button
          fullWidth
          size="large"
          variant="contained"
          color="secondary"
          onClick={reviewNow}
          sx={{ mt: 3, minHeight: 52, fontWeight: 700, borderRadius: '12px' }}
        >
          Review now
        </Button>
        <Button
          fullWidth
          size="large"
          onClick={snoozeReminder}
          sx={{ mt: 1.5, minHeight: 48, color: '#fff', bgcolor: 'rgba(255,255,255,.12)', borderRadius: '12px', '&:hover': { bgcolor: 'rgba(255,255,255,.2)' } }}
        >
          Remind me in 15 minutes
        </Button>
        <Button onClick={dismissReminder} sx={{ mt: 1.5, color: 'hub.railMuted', textDecoration: 'underline', '&:hover': { bgcolor: 'transparent', color: '#fff' } }}>
          Dismiss
        </Button>
      </Stack>
    </Dialog>
  )
}
