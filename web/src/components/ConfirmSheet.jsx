import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import SelfieStep from './SelfieStep.jsx'
import { findSoftware } from '../data/registry.js'
import { useHub } from '../state/hubContext.js'
import { stageCount, visibleItems } from '../state/selectors.js'

function Fact({ label, value }) {
  return (
    <Stack
      direction="row"
      sx={{ justifyContent: 'space-between', gap: 1.5, py: 1.25, borderBottom: '1px solid', borderColor: 'hub.line2' }}
    >
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'right' }}>
        {value}
      </Typography>
    </Stack>
  )
}

/* Titles and wording for each kind of single-item decision */
const KINDS = {
  approve: (stage, sw) => ({
    eyebrow: (stage.approveTitle || 'Approve').toLowerCase().replace(/^./, (c) => c.toUpperCase()),
    toLabel: 'Next stage',
    to: stage.next || 'Next stage',
    fine: stage.approveFine || `Your decision is sent to ${sw.name} and logged against your name.`,
    confirmLabel: stage.confirm || 'Confirm approval',
    confirmColor: 'success',
    reason: null,
  }),
  // AIMS only: the first of its two sign-offs
  verify: (stage, sw) => ({
    eyebrow: 'Verify',
    toLabel: 'Then',
    to: stage.verifyTo || 'Waiting for approval',
    fine: stage.verifyFine || `The item is verified in ${sw.name} and then waits for approval. It is logged against your name.`,
    confirmLabel: 'Confirm verification',
    confirmColor: 'primary',
    reason: null,
  }),
  back: (stage) => ({
    eyebrow: 'Send back',
    toLabel: 'Returns to',
    to: stage.back || 'Previous stage',
    fine: 'The item goes back one stage for correction. It is logged against your name.',
    confirmLabel: 'Confirm send back',
    confirmColor: 'error',
    reason: { label: 'Reason (optional)', required: false },
  }),
  reject: (stage) => ({
    eyebrow: stage.rejectTitle || 'Reject',
    toLabel: 'Returns to',
    to: stage.rejectTo || 'Registered',
    fine:
      stage.rejectFine ||
      'The item goes all the way back to the desk that registered it, with your reason shown to them. It is logged against your name.',
    confirmLabel: stage.rejectConfirm || 'Confirm rejection',
    confirmColor: stage.rejectConfirm ? 'primary' : 'error',
    reason: {
      label: stage.rejectReason || 'Reason for rejection',
      required: true,
      missing: stage.rejectMissing || 'Give a reason for the rejection.',
    },
  }),
}

/* Confirms an approve, a verification, a send-back, a rejection or a "move all". Nothing is sent until
   the confirm button is pressed. Bottom sheet on phones, centred dialog on desktop. */
export default function ConfirmSheet() {
  const { sheet } = useHub()
  if (!sheet) return null
  // Keyed so the reason box starts empty for every new sheet
  return <Sheet key={`${sheet.type}:${sheet.id || sheet.stage}`} />
}

function Sheet() {
  const { sheet, sheetBusy, sheetError, store, closeSheet, confirmSheet } = useHub()
  const [reason, setReason] = useState('')
  const [missing, setMissing] = useState(false)
  // The live selfie, for the one decision that needs it (see SelfieStep.jsx)
  const [photo, setPhoto] = useState(null)
  let selfie = false

  const sw = findSoftware(sheet.swId)
  const stage = sw.stages.find((x) => x.key === sheet.stage)

  let eyebrow, headline, line, facts, fine, confirmLabel, confirmColor, reasonField
  if (sheet.type === 'bulk') {
    const n = stageCount(store, sw, stage) || 0
    eyebrow = 'Move all'
    headline = `${n} items`
    line = `to ${stage.next}`
    fine = `All ${n} items waiting in ${stage.label} are approved together and sent to ${sw.name}. This is logged against your name.`
    confirmLabel = sheetBusy ? 'Moving…' : `Move all ${n}`
    confirmColor = 'primary'
  } else {
    const item = visibleItems(store, sw, stage).find((i) => i.id === sheet.id)
    if (!item) return null
    const kind = KINDS[sheet.type](stage, sw)
    eyebrow = kind.eyebrow
    headline = item.decides || item.balance || item.amount
    line = item.party
    facts = [
      ['Reference', item.ref || item.id],
      ['Type', item.type || ''],
      // "Sent 20 Nov" (eDOS) says when it was asked for, not when it is due
      /^Sent /.test(item.due || '') ? ['Sent', item.due.replace(/^Sent /, '')] : ['Due', item.dueLong || item.due],
      [kind.toLabel, kind.to],
    ]
    fine = kind.fine
    confirmLabel = sheetBusy ? 'Sending…' : kind.confirmLabel
    confirmColor = kind.confirmColor
    reasonField = kind.reason
    // Signing a Sales Pulse contract: the selfie first, as its own review
    // window asks, and an optional note for whoever raised the contract
    if (sheet.type === 'approve' && item.needsSelfie) {
      selfie = true
      reasonField = { label: 'Note for the initiator (optional)', required: false, placeholder: 'Anything they should know' }
      if (!sheetBusy) confirmLabel = 'Approve & sign as Party 1'
    }
  }

  const submit = () => {
    const text = reason.trim()
    if (reasonField && reasonField.required && !text) {
      setMissing(true)
      return
    }
    if (selfie && !photo) return
    confirmSheet(text, selfie ? photo : undefined)
  }

  return (
    <Dialog
      open
      onClose={sheetBusy ? undefined : closeSheet}
      maxWidth={false}
      sx={{ '& .MuiDialog-container': { alignItems: { xs: 'flex-end', sm: 'center' } } }}
      slotProps={{
        backdrop: { sx: { bgcolor: 'rgba(16,21,28,.55)' } },
        paper: {
          'aria-label': 'Confirm',
          sx: {
            m: 0,
            width: '100%',
            maxWidth: { xs: '100%', sm: 460 },
            borderRadius: { xs: '18px 18px 0 0', sm: '14px' },
            overflow: 'hidden',
          },
        },
      }}
    >
      <Box sx={{ height: 4, bgcolor: `${confirmColor}.main` }} />
      <Stack spacing={1.75} sx={{ px: 3, pt: 2.5, pb: { xs: 'calc(24px + env(safe-area-inset-bottom))', sm: 3 } }}>
        <Box>
          <Typography variant="eyebrow" sx={{ color: 'text.secondary' }}>
            {eyebrow}
          </Typography>
          <Typography variant="display" sx={{ fontSize: '2.25rem', mt: 0.5 }}>
            {headline}
          </Typography>
          <Typography variant="h3" sx={{ mt: 0.75 }}>
            {line}
          </Typography>
        </Box>
        {facts ? (
          <Box sx={{ borderTop: '1px solid', borderColor: 'hub.line2' }}>
            {facts.map(([label, value]) => (
              <Fact key={label} label={label} value={value} />
            ))}
          </Box>
        ) : null}
        {selfie ? <SelfieStep value={photo} onChange={setPhoto} disabled={sheetBusy} /> : null}
        {reasonField ? (
          <TextField
            label={reasonField.label}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              setMissing(false)
            }}
            placeholder={reasonField.placeholder || 'What should be corrected?'}
            required={reasonField.required}
            error={missing}
            helperText={missing ? reasonField.missing || 'Give a reason for the rejection.' : ' '}
            disabled={sheetBusy}
            multiline
            minRows={2}
            fullWidth
            autoFocus={!selfie}
            slotProps={{ htmlInput: { maxLength: 300 } }}
          />
        ) : null}
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {fine}
        </Typography>
        {sheetError ? <Alert severity="error">{sheetError}</Alert> : null}
        <Stack direction="row" spacing={1.25}>
          <Button variant="outlined" size="large" onClick={closeSheet} disabled={sheetBusy} sx={{ flex: 1 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            size="large"
            color={confirmColor}
            onClick={submit}
            // signing waits for the selfie
            disabled={sheetBusy || (selfie && !photo)}
            sx={{ flex: 2 }}
          >
            {confirmLabel}
          </Button>
        </Stack>
      </Stack>
    </Dialog>
  )
}
