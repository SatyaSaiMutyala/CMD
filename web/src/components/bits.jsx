import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { fonts } from '../theme/tokens.js'

/* Small shared building blocks used on every page. */

/** Page title with an optional eyebrow above and content on the right; teal rule below. */
export function PageHeader({ eyebrow, title, right }) {
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 2,
        pb: 1.5,
        mb: { xs: 2, md: 2.5 },
        borderBottom: '2px solid',
        borderColor: 'primary.main',
        flexWrap: 'wrap',
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        {eyebrow ? (
          <Typography variant="eyebrow" sx={{ color: 'text.secondary', mb: 0.25 }}>
            {eyebrow}
          </Typography>
        ) : null}
        <Typography variant="h1">{title}</Typography>
      </Box>
      {right ? <Box sx={{ flexShrink: 0 }}>{right}</Box> : null}
    </Stack>
  )
}

/** Buttons sitting on the dark panel title bar. */
const onBar = {
  '& .MuiButton-outlined': { bgcolor: 'rgba(255,255,255,.94)', borderColor: 'transparent', color: 'hub.ink' },
  '& .MuiButton-outlined:hover': { bgcolor: '#fff', borderColor: 'transparent' },
  '& .MuiButton-text': { color: '#fff' },
  '& .MuiButton-text:hover': { bgcolor: 'rgba(255,255,255,.12)' },
}

/** Card: white, 1px border, soft shadow. With a `title` it gets the teal title bar and `action` on its right. */
export function Panel({ title, action, children, flush, sx }) {
  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', ...sx }}>
      {title || action ? (
        <Stack
          direction="row"
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
            minHeight: 48,
            px: 1.875,
            py: 1,
            bgcolor: 'hub.head',
            color: '#fff',
            borderBottom: '2px solid',
            borderColor: 'hub.headRule',
            ...onBar,
          }}
        >
          <Typography variant="h4" component="h2" sx={{ color: 'inherit', fontSize: '0.84rem', letterSpacing: '0.02em' }}>
            {title}
          </Typography>
          {action}
        </Stack>
      ) : null}
      <Box sx={{ px: flush ? 0 : 2, py: flush ? 0 : 1.75, flex: 1, minWidth: 0 }}>{children}</Box>
    </Paper>
  )
}

/** Empty state: dashed border on the canvas colour, muted text. */
export function EmptyState({ title, text, action }) {
  return (
    <Box
      sx={{
        px: 3,
        py: 4,
        textAlign: 'center',
        border: '1.5px dashed',
        borderColor: 'divider',
        borderRadius: '6px',
        bgcolor: 'background.default',
      }}
    >
      <Typography variant="h3" sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 520, mx: 'auto' }}>
        {text}
      </Typography>
      {action ? <Box sx={{ mt: 2 }}>{action}</Box> : null}
    </Box>
  )
}

/** Two-letter software monogram on a tinted tile. */
export function Mono({ label, size = 40 }) {
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: `${Math.round(size * 0.24)}px`,
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'primary.main',
        color: '#fff',
        fontFamily: fonts.mono,
        fontWeight: 700,
        fontSize: size * 0.34,
        letterSpacing: '0.02em',
      }}
    >
      {label}
    </Box>
  )
}

const TONES = {
  ok: ['hub.okSoft', 'hub.ok'],
  bad: ['hub.badSoft', 'hub.bad'],
  warn: ['hub.warnSoft', 'hub.warn'],
  info: ['hub.infoSoft', 'hub.info'],
  accent: ['hub.accentSoft', 'hub.accentDark'],
  neutral: ['hub.sunk', 'hub.muted'],
}

/** Small tinted status label. */
export function ToneChip({ tone = 'neutral', children }) {
  const [bg, fg] = TONES[tone]
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        px: 1,
        py: '2px',
        borderRadius: '20px',
        bgcolor: bg,
        color: fg,
        fontFamily: fonts.mono,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </Box>
  )
}

/** Count pill: solid brand colour when there is something pending. `null` shows a dash. */
export function CountPill({ count }) {
  const on = count > 0
  return (
    <Box
      component="span"
      sx={{
        minWidth: 34,
        px: 1,
        py: '3px',
        borderRadius: '20px',
        textAlign: 'center',
        fontFamily: fonts.mono,
        fontSize: 13,
        fontWeight: 700,
        bgcolor: on ? 'primary.main' : 'hub.sunk',
        color: on ? '#fff' : 'hub.faint',
        flexShrink: 0,
      }}
    >
      {count === null ? '—' : count}
    </Box>
  )
}

/** Headline number with a label, for the overview row. */
export function StatTile({ label, value, hint, accent }) {
  return (
    <Paper
      variant="outlined"
      sx={{ px: 2, py: 1.75, height: '100%', borderTop: '3px solid', borderTopColor: accent ? 'primary.main' : 'hub.line' }}
    >
      <Typography variant="eyebrow" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="display" sx={{ mt: 0.75, color: accent ? 'hub.accentDark' : 'text.primary' }}>
        {value}
      </Typography>
      {hint ? (
        <Typography variant="body2" sx={{ color: 'hub.faint', mt: 0.5 }}>
          {hint}
        </Typography>
      ) : null}
    </Paper>
  )
}
