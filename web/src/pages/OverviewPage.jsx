import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import { Link } from 'react-router'
import { useAuth } from '../auth/context.js'
import { CountPill, Mono, PageHeader, Panel, StatTile, ToneChip } from '../components/bits.jsx'
import { REGISTRY } from '../data/registry.js'
import { softwarePath } from '../lib/paths.js'
import { useHub } from '../state/hubContext.js'
import { swPending, totalPending } from '../state/selectors.js'

function SoftwareCard({ sw, pending }) {
  return (
    <ButtonBase
      component={Link}
      to={softwarePath(sw.id)}
      aria-label={`Open ${sw.name}, ${pending === null ? 'not connected' : `${pending} pending`}`}
      sx={{
        width: '100%',
        height: '100%',
        gap: 1.5,
        p: 1.75,
        justifyContent: 'flex-start',
        textAlign: 'left',
        borderRadius: '6px',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        transition: 'border-color .12s ease, box-shadow .12s ease',
        '&:hover': { borderColor: 'primary.main', boxShadow: '0 6px 18px rgba(16,21,28,.10)' },
      }}
    >
      <Mono label={sw.mono} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="h3" noWrap>
          {sw.name}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
          {sw.sub}
        </Typography>
        <Box sx={{ mt: 0.75 }}>
          <ToneChip tone={sw.connected ? 'ok' : 'neutral'}>{sw.connected ? 'Connected' : 'Not connected'}</ToneChip>
        </Box>
      </Box>
      <CountPill count={pending} />
      <ChevronRightIcon sx={{ color: 'hub.faint', fontSize: 20 }} />
    </ButtonBase>
  )
}

/* Hub: totals and every software with its pending count. */
export function OverviewPage() {
  const { store } = useHub()
  const { user } = useAuth()
  const total = totalPending(store)
  const connected = REGISTRY.filter((sw) => sw.connected).length

  return (
    <>
      <PageHeader eyebrow={`Welcome, ${user.name}`} title="Overview" />

      <Grid container columns={12} spacing={2} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatTile
            accent
            label="Pending decisions"
            value={total}
            hint={total === 1 ? 'item needs your decision' : 'items need your decision'}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <StatTile label="Connected software" value={`${connected} / ${REGISTRY.length}`} hint="sharing approvals with the hub" />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <StatTile label="Decisions logged" value={store.history.length} hint="approved, sent back or moved" />
        </Grid>
      </Grid>

      <Panel title="Software">
        <Grid container columns={12} spacing={1.5}>
          {REGISTRY.map((sw) => (
            <Grid key={sw.id} size={{ xs: 12, sm: 6, xl: 4 }}>
              <SoftwareCard sw={sw} pending={sw.connected ? swPending(store, sw) : null} />
            </Grid>
          ))}
        </Grid>
      </Panel>
    </>
  )
}
