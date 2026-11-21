import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { EmptyState, PageHeader, Panel, ToneChip } from '../components/bits.jsx'
import { REGISTRY } from '../data/registry.js'
import { stamp } from '../lib/format.js'
import { makeXlsx, saveBlob } from '../lib/xlsx.js'
import { useHub } from '../state/hubContext.js'

const TONE = { Approved: 'ok', Verified: 'ok', Released: 'ok', Published: 'ok', 'Sent for approval': 'accent', Commented: 'info', 'Sent back': 'bad', Rejected: 'bad', Moved: 'accent' }

// The applications the hub decides in, for the filter and the export
const APPLICATIONS = REGISTRY.filter((sw) => sw.connected)
const ALL = 'all'

// The sheet's columns, and one decision as a row of it
const COLUMNS = [
  { title: 'When', width: 22 },
  { title: 'Application', width: 18 },
  { title: 'Reference', width: 24 },
  { title: 'Party', width: 42 },
  { title: 'Amount', width: 14 },
  { title: 'Decision', width: 18 },
  { title: 'Reason', width: 50 },
]
const sheetRow = (h) => [stamp(h.ts), h.sw, h.id, h.party, h.amount, h.verb, h.reason]
// "2026-11-21", for the file's name
const today = () => new Date().toLocaleDateString('en-CA')

/* Decisions made so far, newest first. One application can be picked out,
   and what is shown can be saved as an Excel sheet: the whole history of that
   application, or of all of them with a sheet for each. */
export function HistoryPage() {
  const { store, historyForExport } = useHub()
  const { history } = store
  const [app, setApp] = useState(ALL)
  const [exporting, setExporting] = useState(false)
  const [problem, setProblem] = useState(null)

  const chosen = APPLICATIONS.find((sw) => sw.id === app) || null
  const shown = chosen ? history.filter((h) => h.swId === chosen.id) : history

  const exportSheet = async () => {
    setExporting(true)
    setProblem(null)
    try {
      // the whole history, not just the latest rows this page holds
      const rows = await historyForExport(chosen ? chosen.id : '')
      if (!rows.length) {
        setProblem(`There are no decisions${chosen ? ` in ${chosen.name}` : ''} to export yet.`)
        return
      }
      const sheets = chosen
        ? [{ name: chosen.name, columns: COLUMNS, rows: rows.map(sheetRow) }]
        : [
            { name: 'All applications', columns: COLUMNS, rows: rows.map(sheetRow) },
            // then a sheet for each application that has any
            ...APPLICATIONS.map((sw) => ({
              name: sw.name,
              columns: COLUMNS,
              rows: rows.filter((h) => h.swId === sw.id).map(sheetRow),
            })).filter((sheet) => sheet.rows.length),
          ]
      const slug = (chosen ? chosen.name : 'all applications').toLowerCase().replace(/[^a-z0-9]+/g, '-')
      saveBlob(makeXlsx(sheets), `approval-history-${slug}-${today()}.xlsx`)
    } catch (e) {
      setProblem(e.message || 'Could not export the history. Try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Your decisions, newest first"
        title="History"
        right={
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
            <TextField
              select
              size="small"
              label="Application"
              value={app}
              onChange={(e) => {
                setApp(e.target.value)
                setProblem(null)
              }}
              sx={{ minWidth: 190 }}
            >
              <MenuItem value={ALL}>All applications</MenuItem>
              {APPLICATIONS.map((sw) => (
                <MenuItem key={sw.id} value={sw.id}>
                  {sw.name}
                </MenuItem>
              ))}
            </TextField>
            <Button variant="contained" startIcon={<FileDownloadOutlinedIcon />} onClick={exportSheet} disabled={exporting}>
              {exporting ? 'Exporting…' : 'Export to Excel'}
            </Button>
          </Stack>
        }
      />
      {problem ? (
        <Alert severity="warning" onClose={() => setProblem(null)} sx={{ mb: 2 }}>
          {problem}
        </Alert>
      ) : null}
      <Panel title={`${chosen ? chosen.name : 'Decisions'} · ${shown.length}`} flush={shown.length > 0}>
        {shown.length ? (
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
                {shown.map((h) => (
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
            <EmptyState
              title="No decisions yet"
              text={
                chosen
                  ? `Nothing has been decided in ${chosen.name} among your latest decisions. The export looks through your whole history.`
                  : 'Approvals and send-backs you make appear here.'
              }
            />
          </Box>
        )}
      </Panel>
    </>
  )
}
