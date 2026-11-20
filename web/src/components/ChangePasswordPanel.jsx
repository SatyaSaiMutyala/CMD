import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { useAuth } from '../auth/context.js'
import { Panel } from './bits.jsx'

/* Change the sign-in password: the new password, typed twice. Every other
   device and browser signed in to the hub is signed out when it changes. */
export default function ChangePasswordPanel() {
  const { user, changePassword } = useAuth()
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setDone(false)
    if (next !== again) {
      setError('The two passwords do not match.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await changePassword(next)
      setNext('')
      setAgain('')
      setDone(true)
    } catch (err) {
      setError(err.message || 'Could not change the password. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel title="Change password">
      <Stack component="form" onSubmit={submit} noValidate spacing={2}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Signed in as {user.email}. Changing the password signs out every other phone and browser.
        </Typography>
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          size="small"
          helperText="At least 8 characters."
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
        <TextField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          size="small"
          value={again}
          onChange={(e) => setAgain(e.target.value)}
        />
        {error ? <Alert severity="error">{error}</Alert> : null}
        {done ? <Alert severity="success">Password changed.</Alert> : null}
        <Button type="submit" variant="contained" disabled={busy || !next || !again} sx={{ alignSelf: 'flex-start' }}>
          {busy ? 'Saving…' : 'Change password'}
        </Button>
      </Stack>
    </Panel>
  )
}
