import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { ToneChip } from './bits.jsx'

/* One item waiting for a decision, with Send back and Approve.
   `onReject` adds the Reject link (only some stages allow it);
   `onDetails` adds the link to the full details and attached documents.
   A software with no "send back" (eDOS) gives no `onSendBack`: Reject then
   takes its place beside Approve. `rejectLabel` words that button. */
export default function ApprovalCard({ item, onApprove, onSendBack, onReject, onDetails, rejectLabel }) {
  // "Due in 2d" for a payment; "Sent 20 Nov" as it is; nothing when there is none
  const due = !item.due ? '' : item.overdue || /^Sent /.test(item.due) ? item.due : `Due ${item.due}`
  return (
    <Paper
      variant="outlined"
      component="article"
      sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', gap: 1.25, borderLeft: '3px solid', borderLeftColor: 'primary.main' }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography variant="mono" sx={{ fontWeight: 600, color: 'hub.info' }}>
          {item.ref || item.id}
        </Typography>
        {due ? <ToneChip tone={item.overdue ? 'bad' : 'neutral'}>{due}</ToneChip> : null}
      </Stack>

      <Box>
        <Typography variant="h3">{item.party}</Typography>
        {item.note ? (
          <Typography variant="body2" sx={{ color: 'hub.warn', fontWeight: 600 }}>
            {item.note}
          </Typography>
        ) : null}
      </Box>

      <Stack direction="row" sx={{ alignItems: 'flex-end', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
        {item.balance ? (
          <>
            <Box>
              <Typography variant="eyebrow" sx={{ color: 'hub.faint' }}>
                Total
              </Typography>
              <Typography variant="mono" sx={{ fontSize: '1.05rem', color: 'text.secondary' }}>
                {item.amount}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="eyebrow" sx={{ color: 'hub.faint' }}>
                Balance
              </Typography>
              <Typography variant="display" sx={{ fontSize: '1.5rem', color: 'hub.accentDark' }}>
                {item.balance}
              </Typography>
            </Box>
          </>
        ) : (
          <>
            <Typography variant="display" sx={{ fontSize: '1.5rem' }}>
              {item.amount}
            </Typography>
            <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {item.tags.map((tag) => (
                <ToneChip key={tag} tone="warn">
                  {tag}
                </ToneChip>
              ))}
            </Stack>
          </>
        )}
      </Stack>

      {item.auto ? (
        <Box sx={{ px: 1.5, py: 1, borderRadius: '6px', bgcolor: 'hub.okSoft', color: 'hub.ok', fontSize: 13, fontWeight: 500 }}>
          {item.auto}
        </Box>
      ) : null}

      {onDetails ? (
        <Button variant="text" size="small" onClick={onDetails} sx={{ alignSelf: 'flex-start', px: 0.5, mt: 'auto' }}>
          Details and documents
        </Button>
      ) : null}

      <Stack direction="row" spacing={1.25} sx={{ mt: onDetails ? 0 : 'auto', pt: 0.5 }}>
        {onSendBack ? (
          <Button variant="outlined" color="error" onClick={onSendBack} sx={{ flex: 1 }}>
            Send back
          </Button>
        ) : onReject ? (
          <Button variant="outlined" color="error" onClick={onReject} sx={{ flex: 1 }}>
            {rejectLabel || 'Reject'}
          </Button>
        ) : null}
        <Button variant="contained" color="success" onClick={onApprove} sx={{ flex: 1.4, fontWeight: 600 }}>
          {item.approve}
        </Button>
      </Stack>
      {onReject && onSendBack ? (
        <Button variant="text" color="error" size="small" onClick={onReject} sx={{ alignSelf: 'center' }}>
          {rejectLabel || 'Reject and return to Registered'}
        </Button>
      ) : null}
    </Paper>
  )
}
