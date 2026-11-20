import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { ToneChip } from './bits.jsx'

/* The items waiting in one stage as a table: one line each, with its
   decisions at the end of the line. The wide-screen form of ApprovalCard,
   showing the same things in a fraction of the height.

   Each handler is called with the item. `onSendBack` and `onReject` are asked
   per item (`item.canSendBack`, `item.canReject`), as on the card. */
export default function ApprovalTable({ items, onApprove, onSendBack, onReject, onDetails, rejectLabel }) {
  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Reference</TableCell>
            <TableCell>For</TableCell>
            <TableCell>Due</TableCell>
            <TableCell align="right">Amount</TableCell>
            <TableCell align="right">Decision</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => {
            // "Due in 2d" for a payment; "Sent 20 Nov" as it is; nothing when there is none
            const due = !item.due ? '' : item.overdue || /^Sent /.test(item.due) ? item.due : `Due ${item.due}`
            const canSendBack = item.canSendBack !== false
            return (
              <TableRow key={item.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <Typography variant="mono" sx={{ fontWeight: 600, color: 'hub.info' }}>
                    {item.ref || item.id}
                  </Typography>
                </TableCell>

                <TableCell sx={{ minWidth: 220 }}>
                  <Typography sx={{ fontWeight: 600, lineHeight: 1.35 }}>{item.party}</Typography>
                  {item.note || item.auto || item.tags.length ? (
                    <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', columnGap: 1, rowGap: 0.5, mt: 0.25 }}>
                      {item.note ? (
                        <Typography variant="body2" sx={{ color: 'hub.warn', fontWeight: 600 }}>
                          {item.note}
                        </Typography>
                      ) : null}
                      {item.auto ? (
                        <Typography variant="body2" sx={{ color: 'hub.ok' }}>
                          {item.auto}
                        </Typography>
                      ) : null}
                      {item.tags.map((tag) => (
                        <ToneChip key={tag} tone="warn">
                          {tag}
                        </ToneChip>
                      ))}
                    </Stack>
                  ) : null}
                </TableCell>

                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {due ? <ToneChip tone={item.overdue ? 'bad' : 'neutral'}>{due}</ToneChip> : null}
                </TableCell>

                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  {/* Part already released: what is left, and the total it is part of */}
                  <Typography
                    variant="mono"
                    sx={{ display: 'block', fontSize: '0.9375rem', fontWeight: 600, color: item.balance ? 'hub.accentDark' : 'text.primary' }}
                  >
                    {item.balance || item.amount}
                  </Typography>
                  {item.balance ? (
                    <Typography variant="body2" sx={{ color: 'hub.faint' }}>
                      of {item.amount}
                    </Typography>
                  ) : null}
                </TableCell>

                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
                    {onDetails ? (
                      <Tooltip title="Details and documents">
                        <IconButton
                          size="small"
                          aria-label={`Details and documents of ${item.ref || item.id}`}
                          onClick={() => onDetails(item)}
                          sx={{ color: 'hub.accentDark' }}
                        >
                          <DescriptionOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {item.canReject ? (
                      <Button variant={canSendBack ? 'text' : 'outlined'} color="error" size="small" onClick={() => onReject(item)}>
                        {canSendBack ? 'Reject' : rejectLabel || 'Reject'}
                      </Button>
                    ) : null}
                    {canSendBack ? (
                      <Button variant="outlined" color="error" size="small" onClick={() => onSendBack(item)}>
                        Send back
                      </Button>
                    ) : null}
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      onClick={() => onApprove(item)}
                      sx={{ fontWeight: 600, minWidth: 96 }}
                    >
                      {item.approve}
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

/* Kept beside the table so both read the same way. */
export function ListSummary({ count, valueText }) {
  return (
    <Box component="span" sx={{ color: 'text.secondary', fontSize: 13 }}>
      <b>{count}</b> waiting{valueText ? ' · ' : ''}
      {valueText ? <b>{valueText}</b> : null}
    </Box>
  )
}
