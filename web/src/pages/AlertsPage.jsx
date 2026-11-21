import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { PageHeader, Panel, ToneChip } from '../components/bits.jsx'
import ChangePasswordPanel from '../components/ChangePasswordPanel.jsx'
import { REMINDER_CHOICES, clockLabel, everyLabel, everyShort, quietStatus } from '../lib/quiet.js'
import { useHub } from '../state/hubContext.js'
import { useState } from 'react'

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

/* How often the reminder comes: one tap for the usual choices, or any number
   of minutes typed in. Kept on the account, so the phone follows it too, and
   the server itself times the reminder by it. */
function HowOften() {
  const { store, saveReminderMinutes } = useHub()
  const { minutes, min, max } = store.reminder
  // what is being typed in the "other" box, until it is set
  const [typed, setTyped] = useState('')
  const custom = Number(typed)
  const usable = typed !== '' && Number.isInteger(custom) && custom >= min && custom <= max
  const set = () => {
    if (!usable) return
    saveReminderMinutes(custom)
    setTyped('')
  }

  return (
    <Box sx={{ px: 2, pb: 2 }}>
      <Typography variant="eyebrow" sx={{ color: 'text.secondary', mb: 0.75 }}>
        How often
      </Typography>
      <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          color="primary"
          value={minutes}
          onChange={(_, next) => (next ? saveReminderMinutes(next) : null)}
          aria-label="How often the reminder comes"
        >
          {REMINDER_CHOICES.map((choice) => (
            <ToggleButton key={choice} value={choice} sx={{ px: 1.5, textTransform: 'none', fontWeight: 600 }}>
              {everyShort(choice)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Stack
          direction="row"
          component="form"
          spacing={1}
          sx={{ alignItems: 'center' }}
          onSubmit={(e) => {
            e.preventDefault()
            set()
          }}
        >
          <TextField
            size="small"
            type="number"
            label="Other (minutes)"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            error={typed !== '' && !usable}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min, max, step: 1, inputMode: 'numeric' } }}
            sx={{ width: 140 }}
          />
          <Button type="submit" variant="outlined" size="small" disabled={!usable}>
            Set
          </Button>
        </Stack>
      </Stack>
      <Typography variant="body2" sx={{ color: typed !== '' && !usable ? 'error.main' : 'text.secondary', mt: 0.75 }}>
        {typed !== '' && !usable
          ? `Between ${min} minutes and ${everyLabel(max)}.`
          : `Now every ${everyLabel(minutes)}, counted from midnight${
              REMINDER_CHOICES.includes(minutes) ? '' : ' (your own setting)'
            }.`}
      </Typography>
    </Box>
  )
}

/** One end of the quiet hours: a time the CMD can type or pick. */
function TimeField({ label, value, disabled, onChange }) {
  return (
    <TextField
      type="time"
      size="small"
      label={label}
      value={value}
      disabled={disabled}
      // a time being typed is incomplete until both parts are there
      onChange={(e) => (/^\d\d:\d\d$/.test(e.target.value) ? onChange(e.target.value) : null)}
      slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 300, 'aria-label': `${label} ${clockLabel(value)}` } }}
      sx={{ width: 132 }}
    />
  )
}

/* Do not disturb for the 15-minute reminder: pause it now, and set the hours
   it keeps quiet every day. Kept on the account, so it is the same on the
   phone, and the server itself holds the reminder back. */
function DoNotDisturb() {
  const { store, saveDnd } = useHub()
  const { dnd } = store
  const [tone, text] = quietStatus(dnd)

  return (
    <Panel title="Do not disturb" flush sx={{ mt: 2.5 }}>
      {/* where things stand right now, in a sentence */}
      <Alert severity={tone === 'warn' ? 'warning' : 'success'} sx={{ borderRadius: 0, py: 0.25 }}>
        {text}
      </Alert>
      <SettingRow first title="Do not disturb now" text="Pauses the reminder everywhere, on this browser and on your phone, until you turn it off.">
        <Switch
          checked={!!dnd.on}
          onChange={() => saveDnd({ on: !dnd.on })}
          slotProps={{ input: { 'aria-label': 'Do not disturb now' } }}
        />
      </SettingRow>
      <SettingRow title="Quiet hours every day" text="No reminder between these times, every day. Change either time whenever you like.">
        <Switch
          checked={!!dnd.daily}
          onChange={() => saveDnd({ daily: !dnd.daily })}
          slotProps={{ input: { 'aria-label': 'Quiet hours every day' } }}
        />
      </SettingRow>
      <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1.5, px: 2, pb: 2 }}>
        <TimeField label="From" value={dnd.from} disabled={!dnd.daily} onChange={(from) => saveDnd({ from })} />
        <TimeField label="To" value={dnd.to} disabled={!dnd.daily} onChange={(to) => saveDnd({ to })} />
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {clockLabel(dnd.from)} to {clockLabel(dnd.to)}
          {dnd.from > dnd.to ? ' the next morning' : ''}
        </Typography>
      </Stack>
      <Typography variant="body2" sx={{ color: 'hub.faint', px: 2, pb: 1.75 }}>
        Only the reminder is paused. A new approval still notifies you the moment it arrives.
      </Typography>
    </Panel>
  )
}

/* How the hub gets the user's attention, plus two "try it" actions. */
export function AlertsPage() {
  const { store, push, toggleSetting, enablePush, previewArrival, previewReminder } = useHub()
  const { settings } = store
  const every = everyLabel(store.reminder.minutes)
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
              title={`Reminder every ${every}`}
              text={`Every ${every} this browser reminds you of what is pending: full screen in an open tab, a notification otherwise. Skipped when nothing is pending.`}
            >
              <Switch
                checked={!!settings.hourly}
                onChange={() => toggleSetting('hourly')}
                slotProps={{ input: { 'aria-label': `Reminder every ${every}` } }}
              />
            </SettingRow>
            <HowOften />
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
          <DoNotDisturb />
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
