import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import TablePagination from '@mui/material/TablePagination'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import SearchIcon from '@mui/icons-material/Search'
import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import ApprovalCard from '../components/ApprovalCard.jsx'
import ApprovalTable, { ListSummary } from '../components/ApprovalTable.jsx'
import { EmptyState, PageHeader, Panel } from '../components/bits.jsx'
import { findSoftware } from '../data/registry.js'
import { PATHS } from '../lib/paths.js'
import { useHub } from '../state/hubContext.js'
import { defaultStage, isLoaded, loadError, stageCount, stageValue, visibleItems } from '../state/selectors.js'
import { fonts } from '../theme/tokens.js'

/* Shown for software whose approvals are not shared with the hub yet. */
function NotConnected({ sw }) {
  return (
    <Stack spacing={2.5}>
      <EmptyState
        title="Approval page not connected yet"
        text={`Once ${sw.name} shares its CMD-level approvals, they show up here the same way LedgerTrace's do: one tab per stage, each item with Approve and Send back.`}
        action={
          <Button component={Link} to={PATHS.overview} variant="contained">
            Back to overview
          </Button>
        }
      />
      <Panel title="Planned approvals" flush>
        {sw.planned.map((line, i) => (
          <Box key={line} sx={{ px: 2, py: 1.5, borderTop: i ? '1px solid' : 0, borderColor: 'hub.line2' }}>
            <Typography>{line}</Typography>
          </Box>
        ))}
      </Panel>
    </Stack>
  )
}

function StageTabLabel({ label, count, selected }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <span>{label}</span>
      <Box
        component="span"
        sx={{
          px: 1,
          borderRadius: '20px',
          fontFamily: fonts.mono,
          fontSize: 11.5,
          fontWeight: 700,
          bgcolor: selected && count ? 'primary.main' : 'hub.sunk',
          color: selected && count ? '#fff' : 'hub.muted',
        }}
      >
        {count === null ? '—' : count}
      </Box>
    </Stack>
  )
}

// How many items a page can show; the first is the default
const PAGE_SIZES = [10, 25, 50]

/* The connected view: stage tabs and the approvals waiting in the chosen stage. */
function Stages({ sw }) {
  const { store, toast, openSheet, openDetail, clearToast, reload } = useHub()
  // Until a tab is picked, show the first stage that has something pending
  const [picked, setPicked] = useState(null)
  const stageKey = picked || defaultStage(store, sw)
  // The source sends a stage's whole list in one answer, so it is searched
  // and paged here, in the browser
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [perPage, setPerPage] = useState(PAGE_SIZES[0])
  // A table needs the width; narrower screens keep the cards
  const wide = useMediaQuery((theme) => theme.breakpoints.up('lg'))

  // Fresh data on every visit; the confirmation message belongs to this visit only
  useEffect(() => {
    reload(sw.id)
    return clearToast
  }, [reload, clearToast, sw.id])

  const stage = sw.stages.find((x) => x.key === stageKey) || sw.stages[0]
  const loaded = isLoaded(store, sw)
  const error = loadError(store, sw)
  const count = stageCount(store, sw, stage)
  const items = visibleItems(store, sw, stage)
  const open = (type, id) => openSheet(type, sw.id, stage.key, id)

  const words = query.trim().toLowerCase()
  const found = words
    ? items.filter((item) => `${item.ref} ${item.party} ${item.note} ${item.amount}`.toLowerCase().includes(words))
    : items
  // The list shrinks as items are decided: never stay on a page that is gone
  const at = Math.min(page, Math.max(0, Math.ceil(found.length / perPage) - 1))
  const shown = found.slice(at * perPage, (at + 1) * perPage)
  const listed = loaded && count > 0

  let body
  if (!loaded) {
    body = error ? (
      <EmptyState
        title={`Could not load ${sw.name}`}
        text={error}
        action={
          <Button variant="contained" onClick={() => reload(sw.id)}>
            Try again
          </Button>
        }
      />
    ) : (
      <EmptyState title="Loading…" text={`Getting what is waiting for you in ${sw.name}.`} />
    )
  } else if (count === 0) {
    body = <EmptyState title={stage.done} text="Nothing is waiting for your decision in this stage." />
  } else {
    body = (
      <>
        <Stack
          direction="row"
          sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, px: 2, py: 1.25, borderBottom: '1px solid', borderColor: 'hub.line2' }}
        >
          <ListSummary count={count} valueText={stageValue(store, sw, stage)} />
          {items.length > PAGE_SIZES[0] || words ? (
            <TextField
              size="small"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(0)
              }}
              placeholder="Search name or reference"
              slotProps={{
                htmlInput: { 'aria-label': 'Search this stage' },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ width: { xs: '100%', sm: 280 } }}
            />
          ) : null}
        </Stack>

        {!found.length ? (
          <Box sx={{ p: 2 }}>
            <EmptyState title="Nothing matches" text={`No item in ${stage.label} matches "${query.trim()}".`} />
          </Box>
        ) : wide ? (
          <ApprovalTable
            items={shown}
            rejectLabel={stage.rejectLabel}
            onApprove={(item) => open('approve', item.id)}
            onVerify={(item) => open('verify', item.id)}
            onSendBack={(item) => open('back', item.id)}
            onReject={(item) => open('reject', item.id)}
            onDetails={(item) => openDetail(sw.id, stage.key, item.id)}
          />
        ) : (
          <Grid container columns={12} spacing={2} sx={{ p: 2 }}>
            {shown.map((item) => (
              <Grid key={item.id} size={{ xs: 12, md: 6 }}>
                <ApprovalCard
                  item={item}
                  onApprove={() => open('approve', item.id)}
                  onVerify={item.canVerify ? () => open('verify', item.id) : undefined}
                  onSendBack={item.canSendBack === false ? undefined : () => open('back', item.id)}
                  rejectLabel={stage.rejectLabel}
                  onDetails={() => openDetail(sw.id, stage.key, item.id)}
                  onReject={item.canReject ? () => open('reject', item.id) : undefined}
                />
              </Grid>
            ))}
          </Grid>
        )}

        {found.length > PAGE_SIZES[0] ? (
          <TablePagination
            component="div"
            count={found.length}
            page={at}
            onPageChange={(_, next) => setPage(next)}
            rowsPerPage={perPage}
            onRowsPerPageChange={(e) => {
              setPerPage(Number(e.target.value))
              setPage(0)
            }}
            rowsPerPageOptions={PAGE_SIZES}
            labelRowsPerPage="Per page"
            showFirstButton
            showLastButton
            sx={{ borderTop: '1px solid', borderColor: 'hub.line2' }}
          />
        ) : null}
        {count > items.length ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 1.5, borderTop: '1px solid', borderColor: 'hub.line2' }}>
            + {count - items.length} more in this stage
          </Typography>
        ) : null}
      </>
    )
  }

  return (
    <>
      <Tabs
        value={stage.key}
        onChange={(_, key) => {
          setPicked(key)
          setQuery('')
          setPage(0)
          clearToast()
        }}
        variant="scrollable"
        scrollButtons={false}
        aria-label="Approval stages"
        sx={{ mb: 2, borderBottom: '1px solid', borderColor: 'divider' }}
      >
        {sw.stages.map((st) => (
          <Tab
            key={st.key}
            value={st.key}
            label={<StageTabLabel label={st.label} count={stageCount(store, sw, st)} selected={st.key === stage.key} />}
          />
        ))}
      </Tabs>

      {loaded && error ? (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => reload(sw.id)}>
              Try again
            </Button>
          }
        >
          Could not refresh — showing the last list.
        </Alert>
      ) : null}

      {toast && toast.swId === sw.id ? (
        <Alert severity="success" onClose={clearToast} sx={{ mb: 2 }}>
          {toast.text}
        </Alert>
      ) : null}

      <Panel
        title={stage.label}
        flush={listed}
        action={
          stage.bulk && count > 1 ? (
            <Button variant="outlined" size="small" onClick={() => open('bulk')}>
              {stage.bulk.replace('{n}', count)}
            </Button>
          ) : null
        }
      >
        {body}
      </Panel>
    </>
  )
}

/* One software's approvals. */
export function SoftwarePage() {
  const { id } = useParams()
  const sw = findSoftware(id)
  if (!sw) return <Navigate to={PATHS.overview} replace />

  return (
    <>
      <PageHeader eyebrow={sw.sub} title={sw.name} />
      {/* keyed so the stage choice resets when switching software */}
      {sw.connected ? <Stages key={sw.id} sw={sw} /> : <NotConnected sw={sw} />}
    </>
  )
}
