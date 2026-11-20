import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import { PageHeader, Panel, ToneChip } from '../components/bits.jsx'
import ChangePasswordPanel from '../components/ChangePasswordPanel.jsx'
import { useHub } from '../state/hubContext.js'

/** A titled row with a short explanation and one control on the right. */
function SettingRow({ title, text, first, children }) {
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        px: 2,
        py: 1.75,
        borderTop: first ? 0 : '1px solid',
        borderColor: 'hub.line2',
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {text}
        </Typography>
      </Box>
      <Box sx={{ flexShrink: 0 }}>{children}</Box>
    </Stack>
  )
}

// What to show for each push status (see lib/push.js); null = offer the button
const PUSH_TEXT = {
  on: ['ok', 'On'],
  blocked: ['warn', 'Blocked in browser settings'],
  unsupported: ['warn', 'Not supported in this browser'],
  'server-off': ['warn', 'Not set up on the server'],
}

/* How the hub gets the user's attention, plus two "try it" actions. */
export function AlertsPage() {
  const { store, push, toggleSetting, enablePush, previewArrival, previewReminder } = useHub()
  const { settings } = store
  const pushText = PUSH_TEXT[push]

  return (
    <>
      <PageHeader eyebrow="How the hub gets your attention" title="Alerts" />
      <Grid container columns={12} spacing={2.5}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Panel title="Alert settings" flush>
            <SettingRow first title="Sound on new approval" text="A sound plays the moment a new approval arrives, and another with the reminder.">
              <Switch
                checked={!!settings.sound}
                onChange={() => toggleSetting('sound')}
                slotProps={{ input: { 'aria-label': 'Chime on new approval' } }}
              />
            </SettingRow>
            <SettingRow
              title="Reminder every 15 minutes"
              text="Every 15 minutes this browser reminds you of what is pending: full screen in an open tab, a notification otherwise. Skipped when nothing is pending."
            >
              <Switch
                checked={!!settings.hourly}
                onChange={() => toggleSetting('hourly')}
                slotProps={{ input: { 'aria-label': 'Reminder every 15 minutes' } }}
              />
            </SettingRow>
            <SettingRow
              title="Browser notifications"
              text="Notifies you of new approvals and the reminder even when no hub tab is open."
            >
              {pushText ? (
                <ToneChip tone={pushText[0]}>{pushText[1]}</ToneChip>
              ) : (
                <Button variant="contained" size="small" onClick={enablePush}>
                  Turn on
                </Button>
              )}
            </SettingRow>
          </Panel>
          <Typography variant="body2" sx={{ color: 'hub.faint', mt: 1.5, px: 0.5 }}>
            Sounds and the full-screen reminder need a hub tab open. With browser notifications on, you are still
            notified when no tab is open, as long as the browser itself is running.
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Panel title="Try it" flush>
            <SettingRow first title="Preview a new-approval alert" text="Plays the sound and shows the snackbar. Nothing is changed.">
              <Button variant="contained" size="small" onClick={previewArrival}>
                Preview
              </Button>
            </SettingRow>
            <SettingRow title="Preview the reminder" text="Shows the full-screen reminder now.">
              <Button variant="outlined" size="small" onClick={previewReminder}>
                Preview
              </Button>
            </SettingRow>
          </Panel>
          <Box sx={{ mt: 2.5 }}>
            <ChangePasswordPanel />
          </Box>
        </Grid>
      </Grid>
    </>
  )
}
