import Box from '@mui/material/Box'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { EmptyState, PageHeader, Panel, ToneChip } from '../components/bits.jsx'
import { stamp } from '../lib/format.js'
import { useHub } from '../state/hubContext.js'

const TONE = { Approved: 'ok', Released: 'ok', 'Sent back': 'bad', Rejected: 'bad', Moved: 'accent' }

/* Decisions made so far, newest first. */
export function HistoryPage() {
  const { store } = useHub()
  const { history } = store

  return (
    <>
      <PageHeader eyebrow="Your decisions, newest first" title="History" />
      <Panel
        title={`Decisions · ${history.length}`}
        flush={history.length > 0}
      >
        {history.length ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>When</TableCell>
                  <TableCell>Software</TableCell>
                  <TableCell>Reference</TableCell>
                  <TableCell>Party</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Decision</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={`${h.ts}-${h.id}-${h.verb}`} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>{stamp(h.ts)}</TableCell>
                    <TableCell>{h.sw}</TableCell>
                    <TableCell>
                      <Typography variant="mono" sx={{ color: 'hub.info', fontWeight: 600 }}>
                        {h.id}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{h.party}</TableCell>
                    <TableCell align="right">
                      <Typography variant="mono" sx={{ fontWeight: 600 }}>
                        {h.amount}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <ToneChip tone={TONE[h.verb] || 'neutral'}>{h.verb}</ToneChip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ py: 0.5 }}>
            <EmptyState title="No decisions yet" text="Approvals and send-backs you make appear here." />
          </Box>
        )}
      </Panel>
    </>
  )
}
