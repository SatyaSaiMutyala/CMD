import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import HistoryIcon from '@mui/icons-material/History'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import LogoutIcon from '@mui/icons-material/Logout'
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined'
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined'
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined'
import AppBar from '@mui/material/AppBar'
import Badge from '@mui/material/Badge'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/context.js'
import { REGISTRY } from '../data/registry.js'
import { initials, shortDate } from '../lib/format.js'
import { PATHS, softwarePath } from '../lib/paths.js'
import { useHub } from '../state/hubContext.js'
import { swPending, totalPending } from '../state/selectors.js'
import { fonts, RAIL_BG, RAIL_COLLAPSED, RAIL_WIDTH, TOPBAR_HEIGHT } from '../theme/tokens.js'

/* App frame: dark sidebar + top bar on desktop, app bar + bottom tabs on phones. */

const BRAND = 'Approval Hub'
const BRAND_SUB = 'CMD · Trustlab'

/** Trustlab mark on a white rounded tile (its colours would disappear on the dark rail). */
function LogoTile({ size }) {
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        borderRadius: `${Math.round(size * 0.24)}px`,
        bgcolor: '#fff',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
      }}
    >
      <Box component="img" src="/trustlab-logo.png" alt="" sx={{ width: '82%', height: '82%', objectFit: 'contain' }} />
    </Box>
  )
}

/** Wordmark: product name over the company line. */
function Brand({ compact = false }) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
      <LogoTile size={compact ? 32 : 40} />
      <Box sx={{ minWidth: 0 }}>
        <Typography
          noWrap
          sx={{ fontWeight: 800, letterSpacing: '0.02em', fontSize: compact ? 17 : 19, lineHeight: 1, color: '#fff' }}
        >
          {BRAND}
        </Typography>
        <Typography
          noWrap
          sx={{
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.155em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,.58)',
            mt: 0.5,
          }}
        >
          {BRAND_SUB}
        </Typography>
      </Box>
    </Stack>
  )
}

/** Count pill in the rail: gold when something is pending. */
function CountBadge({ count }) {
  if (count === null || count === undefined) return null
  const on = count > 0
  return (
    <Box
      component="span"
      sx={{
        fontFamily: fonts.mono,
        fontSize: 11,
        fontWeight: 600,
        px: 0.875,
        py: '1px',
        borderRadius: '20px',
        flexShrink: 0,
        bgcolor: on ? 'rgba(255,200,31,.2)' : 'rgba(255,255,255,0.08)',
        color: on ? '#FFD45C' : 'hub.railMuted',
      }}
    >
      {count}
    </Box>
  )
}

/** Small dot on a collapsed rail icon when its count is above zero. */
function CountDot({ count }) {
  if (!count) return null
  return (
    <Box
      component="span"
      sx={{
        position: 'absolute',
        top: 4,
        right: 4,
        width: 8,
        height: 8,
        borderRadius: '50%',
        bgcolor: 'hub.gold',
        boxShadow: '0 0 0 2px #0E3529',
      }}
    />
  )
}

function RailGroup({ label, open }) {
  if (!open) return <Box sx={{ mx: 1.5, my: 1.25, borderTop: '1px solid rgba(255,255,255,.09)' }} />
  return (
    <Typography
      sx={{
        px: 1.25,
        pt: 2,
        pb: 0.75,
        fontFamily: fonts.mono,
        fontWeight: 600,
        fontSize: 10,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'hub.railMuted',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </Typography>
  )
}

/**
 * Rail row: coloured icon tile + uppercase label + count. Active = tinted row with a bar in the item's own
 * colour on the left. Collapsed (`open` false): the icon tile only.
 */
function RailLink({ to, icon, label, color, count, end, open }) {
  return (
    <ListItemButton
      component={NavLink}
      to={to}
      end={end}
      aria-label={open ? undefined : label}
      title={open ? undefined : label}
      sx={{
        '--ic': color,
        position: 'relative',
        gap: 1.5,
        px: open ? 1.25 : 0,
        py: open ? 0.75 : 0.5,
        mb: '3px',
        minHeight: 44,
        justifyContent: open ? 'flex-start' : 'center',
        borderRadius: '10px',
        border: '1px solid transparent',
        color: '#E2EDE8',
        transition: 'background-color .12s ease',
        '&:hover': { backgroundColor: 'rgba(255,255,255,.07)' },
        '&.active': open
          ? {
              backgroundColor: 'rgba(34,169,145,.22)',
              borderColor: 'rgba(34,169,145,.5)',
              color: '#fff',
              '&::before': {
                content: '""',
                position: 'absolute',
                left: -9,
                top: 6,
                bottom: 6,
                width: 4,
                borderRadius: '0 4px 4px 0',
                backgroundColor: 'var(--ic)',
              },
            }
          : {
              backgroundColor: 'transparent',
              '& .rail-ico': { backgroundColor: 'color-mix(in srgb, var(--ic) 26%, transparent)' },
            },
      }}
    >
      <Box
        className="rail-ico"
        sx={{
          position: 'relative',
          width: 34,
          height: 34,
          flexShrink: 0,
          borderRadius: '9px',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--ic)',
          backgroundColor: 'rgba(255,255,255,.06)',
          fontFamily: fonts.mono,
          fontSize: 11.5,
          fontWeight: 700,
          '& .MuiSvgIcon-root': { fontSize: 19 },
        }}
      >
        {icon}
        {!open ? <CountDot count={count} /> : null}
      </Box>
      {open ? (
        <>
          <Typography
            noWrap
            sx={{ flex: 1, fontSize: 11, fontWeight: 600, letterSpacing: '0.9px', textTransform: 'uppercase', color: 'inherit' }}
          >
            {label}
          </Typography>
          <CountBadge count={count} />
        </>
      ) : null}
    </ListItemButton>
  )
}

// Icon colours for the software rows, cycled in registry order
const SOFTWARE_COLORS = ['#5EEAD4', '#FFD45C', '#93C5FD', '#F9A8D4', '#C4B5FD', '#FDBA74', '#86EFAC']

/** Menu groups: `[group label, items]`. Software rows come straight from the registry. */
function useRailItems() {
  const { store } = useHub()
  return [
    [
      'Approvals',
      [
        {
          to: PATHS.overview,
          end: true,
          label: 'Overview',
          icon: <DashboardOutlinedIcon />,
          color: '#5EEAD4',
          count: totalPending(store),
        },
      ],
    ],
    [
      'Software',
      REGISTRY.map((sw, i) => ({
        to: softwarePath(sw.id),
        label: sw.name,
        icon: sw.mono,
        color: SOFTWARE_COLORS[i % SOFTWARE_COLORS.length],
        count: sw.connected ? swPending(store, sw) : undefined,
      })),
    ],
    [
      'Account',
      [
        { to: PATHS.history, label: 'History', icon: <HistoryIcon />, color: '#93C5FD' },
        { to: PATHS.alerts, label: 'Alerts', icon: <NotificationsNoneOutlinedIcon />, color: '#FFD45C' },
      ],
    ],
  ]
}

const PIN_KEY = 'cmd-hub.rail.pinned'

/** Remembered pin; without one, the menu starts open on wide screens and as icons below 1200px. */
function readPinned() {
  const wide = typeof window === 'undefined' || window.innerWidth >= 1200
  try {
    const v = localStorage.getItem(PIN_KEY)
    return v === null ? wide : v === '1'
  } catch {
    return wide
  }
}

/**
 * Desktop sidebar: dark green gradient, 258px; unpinned it collapses to 66px of icons and opens over the
 * page while hovered. The pin is remembered on this browser.
 */
function DesktopRail() {
  const groups = useRailItems()
  const [pinned, setPinned] = useState(readPinned)
  const [hover, setHover] = useState(false)
  const open = pinned || hover

  const togglePin = () => {
    setPinned((p) => {
      try {
        localStorage.setItem(PIN_KEY, p ? '0' : '1')
      } catch {
        /* storage blocked: keep it for this visit only */
      }
      return !p
    })
    setHover(false)
  }

  return (
    <Box sx={{ width: pinned ? RAIL_WIDTH : RAIL_COLLAPSED, flexShrink: 0, transition: 'width .16s ease' }}>
      <Box
        component="nav"
        aria-label="Main menu"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 1200,
          width: open ? RAIL_WIDTH : RAIL_COLLAPSED,
          transition: 'width .16s ease',
          overflow: 'hidden',
          background: RAIL_BG,
          color: 'hub.railInk',
          display: 'flex',
          flexDirection: 'column',
          boxShadow:
            hover && !pinned
              ? '6px 0 24px rgba(16,21,28,.22)'
              : '2px 0 16px -8px rgba(0,0,0,.45), inset -1px 0 0 rgba(255,255,255,.055)',
        }}
      >
        <Stack
          direction="row"
          sx={{
            height: TOPBAR_HEIGHT + 6,
            px: open ? 1.75 : 1.5,
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            flexShrink: 0,
            background: 'linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.018))',
            borderBottom: '1px solid rgba(255,255,255,.09)',
          }}
        >
          {open ? <Brand /> : <LogoTile size={40} />}
          {open ? (
            <IconButton
              size="small"
              onClick={togglePin}
              aria-pressed={pinned}
              aria-label={pinned ? 'Unpin menu (collapse to icons)' : 'Pin menu open'}
              title={pinned ? 'Collapse menu' : 'Keep menu open'}
              sx={{
                color: pinned ? 'hub.gold' : 'hub.railMuted',
                transform: pinned ? 'rotate(45deg)' : 'none',
                transition: 'transform .15s ease, color .12s ease',
                '&:hover': { color: 'hub.gold', bgcolor: 'rgba(255,255,255,.07)' },
              }}
            >
              <PushPinOutlinedIcon fontSize="small" />
            </IconButton>
          ) : null}
        </Stack>

        <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', px: 1.25, pt: 0.5, pb: 1 }}>
          {groups.map(([group, items]) => (
            <Box key={group}>
              <RailGroup label={group} open={open} />
              <List disablePadding>
                {items.map((item) => (
                  <RailLink key={item.to} {...item} open={open} />
                ))}
              </List>
            </Box>
          ))}
        </Box>

        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: 'center',
            justifyContent: open ? 'flex-start' : 'center',
            px: 2,
            py: 1.5,
            borderTop: '1px solid rgba(255,255,255,.09)',
            color: 'hub.railMuted',
            fontFamily: fonts.mono,
            fontSize: 11,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <VerifiedUserOutlinedIcon sx={{ fontSize: 15 }} />
          {open ? <span>CMD Approval Hub</span> : null}
        </Stack>
      </Box>
    </Box>
  )
}

/** Top bar breadcrumb for the current page: `[group, page]`. */
function useCrumbs() {
  const { pathname } = useLocation()
  if (pathname === PATHS.history) return ['Account', 'History']
  if (pathname === PATHS.alerts) return ['Account', 'Alerts']
  const sw = REGISTRY.find((x) => pathname === softwarePath(x.id))
  if (sw) return ['Software', sw.name]
  return ['Approvals', 'Overview']
}

function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [anchor, setAnchor] = useState(null)

  const go = (to) => {
    setAnchor(null)
    navigate(to)
  }
  const avatar = (size) => (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        bgcolor: 'primary.main',
        color: '#fff',
        display: 'grid',
        placeItems: 'center',
        fontWeight: 700,
        fontSize: size * 0.38,
        flexShrink: 0,
        boxShadow: '0 0 0 2px #fff, 0 0 0 3.5px #FFC81F',
      }}
    >
      {initials(user.name) || '?'}
    </Box>
  )

  return (
    <>
      <ButtonBase
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={anchor ? 'true' : undefined}
        aria-label={`Account menu, ${user.name}`}
        sx={{
          gap: 1,
          pl: 0.75,
          pr: 1.5,
          py: 0.5,
          borderRadius: '14px',
          bgcolor: 'hub.accentSoft',
          border: '1px solid rgba(34,169,145,.35)',
          '&:hover': { borderColor: 'primary.main' },
        }}
      >
        {avatar(30)}
        <Box sx={{ textAlign: 'left', display: { xs: 'none', lg: 'block' } }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }} noWrap>
            {user.name}
          </Typography>
          <Typography sx={{ fontSize: 11, color: 'hub.faint', lineHeight: 1.2 }} noWrap>
            {user.role}
          </Typography>
        </Box>
        <KeyboardArrowDownIcon sx={{ fontSize: 18, color: 'hub.muted' }} />
      </ButtonBase>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: { sx: { mt: 1, width: 300, borderRadius: '18px', boxShadow: '0 18px 46px rgba(16,21,28,.16)' } },
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ px: 2.5, py: 2, alignItems: 'center' }}>
          {avatar(48)}
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 700 }} noWrap>
              {user.name}
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'hub.faint' }} noWrap>
              {user.email}
            </Typography>
          </Box>
        </Stack>
        <Divider />
        <MenuItem onClick={() => go(PATHS.history)} sx={{ py: 1.25, px: 2.5, gap: 1.5 }}>
          <HistoryIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          History
        </MenuItem>
        <MenuItem onClick={() => go(PATHS.alerts)} sx={{ py: 1.25, px: 2.5, gap: 1.5 }}>
          <NotificationsNoneOutlinedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          Alerts
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchor(null)
            logout()
          }}
          sx={{ py: 1.25, px: 2.5, gap: 1.5, color: 'hub.bad', '&:hover': { bgcolor: 'hub.badSoft' } }}
        >
          <LogoutIcon sx={{ fontSize: 18 }} />
          Sign out
        </MenuItem>
      </Menu>
    </>
  )
}

/** Desktop top bar: breadcrumb, date, pending count, user chip. */
function TopBar() {
  const [group, page] = useCrumbs()
  const { store } = useHub()
  const navigate = useNavigate()
  const [today] = useState(() => shortDate(new Date()))
  const pending = totalPending(store)

  return (
    <Box
      component="header"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 1100,
        height: TOPBAR_HEIGHT,
        px: 2.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 4px 12px -8px rgba(16,21,28,.22)',
      }}
    >
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'baseline', minWidth: 0 }}>
        <Typography sx={{ fontSize: 12.5, color: 'hub.faint' }} noWrap>
          {group}
        </Typography>
        <Typography sx={{ fontSize: 12.5, color: 'hub.faint' }}>›</Typography>
        <Typography sx={{ fontSize: 14, fontWeight: 600 }} noWrap>
          {page}
        </Typography>
      </Stack>
      <Box sx={{ flex: 1 }} />
      <Typography variant="mono" sx={{ fontSize: 11.5, color: 'hub.muted', display: { xs: 'none', lg: 'block' } }}>
        {today}
      </Typography>
      <IconButton
        onClick={() => navigate(PATHS.overview)}
        aria-label={`${pending} approvals pending`}
        title={`${pending} approvals pending`}
        sx={{ color: 'hub.muted' }}
      >
        <Badge badgeContent={pending} color="error" max={99}>
          <NotificationsNoneOutlinedIcon />
        </Badge>
      </IconButton>
      <Box sx={{ width: '1px', height: 26, bgcolor: 'divider' }} />
      <UserMenu />
    </Box>
  )
}

const PHONE_TABS = [
  { value: PATHS.overview, label: 'Approvals', icon: <DashboardOutlinedIcon /> },
  { value: PATHS.history, label: 'History', icon: <HistoryIcon /> },
  { value: PATHS.alerts, label: 'Alerts', icon: <NotificationsNoneOutlinedIcon /> },
]

/** Phone layout: brand app bar on top, three tabs at the bottom. Software opens from the overview. */
function PhoneChrome() {
  const { store } = useHub()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const pending = totalPending(store)
  const current = pathname === PATHS.history || pathname === PATHS.alerts ? pathname : PATHS.overview

  return (
    <>
      <AppBar position="sticky" elevation={0} sx={{ background: RAIL_BG, color: 'hub.railInk' }}>
        <Toolbar sx={{ gap: 1.5, justifyContent: 'space-between', minHeight: 60, px: 2 }}>
          <Brand compact />
          <IconButton onClick={logout} aria-label="Sign out" title="Sign out" sx={{ color: 'hub.railInk' }}>
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        aria-label="Main menu"
        sx={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: (theme) => theme.zIndex.appBar,
          background: 'linear-gradient(180deg, #134A38 0%, #0A2620 100%)',
          pb: 'env(safe-area-inset-bottom)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <BottomNavigation
          showLabels
          value={current}
          onChange={(_, value) => navigate(value)}
          sx={{
            bgcolor: 'transparent',
            height: 64,
            '& .MuiBottomNavigationAction-root': { color: 'hub.railMuted' },
            '& .MuiBottomNavigationAction-root.Mui-selected': { color: 'hub.gold' },
          }}
        >
          {PHONE_TABS.map((tab) => (
            <BottomNavigationAction
              key={tab.value}
              value={tab.value}
              label={tab.label}
              icon={
                tab.value === PATHS.overview ? (
                  <Badge badgeContent={pending} color="error" max={99}>
                    {tab.icon}
                  </Badge>
                ) : (
                  tab.icon
                )
              }
            />
          ))}
        </BottomNavigation>
      </Box>
    </>
  )
}

export function AppShell() {
  const desktop = useMediaQuery((theme) => theme.breakpoints.up('md'))
  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh', bgcolor: 'background.default' }}>
      {desktop ? <DesktopRail /> : null}
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {desktop ? <TopBar /> : <PhoneChrome />}
        <Box
          component="main"
          sx={{
            flex: 1,
            width: '100%',
            maxWidth: 1600,
            mx: 'auto',
            px: { xs: 1.75, md: 2.5 },
            pt: { xs: 2, md: 2.5 },
            pb: { xs: 'calc(96px + env(safe-area-inset-bottom))', md: 3 },
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
