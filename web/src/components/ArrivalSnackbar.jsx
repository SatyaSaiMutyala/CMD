import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Snackbar from '@mui/material/Snackbar'
import Typography from '@mui/material/Typography'
import { useHub } from '../state/hubContext.js'
import { Mono } from './bits.jsx'

/* Snackbar at the bottom of the screen when a new approval arrives; click to open it. */
export default function ArrivalSnackbar() {
  const { banner, openBanner } = useHub()
  return (
    <Snackbar
      open={!!banner}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      // clears the bottom tab bar on phones
      sx={{ bottom: { xs: 'calc(76px + env(safe-area-inset-bottom))', md: 24 } }}
    >
      {banner ? (
        <ButtonBase
          onClick={openBanner}
          sx={{
            gap: 1.5,
            justifyContent: 'flex-start',
            textAlign: 'left',
            width: { xs: '100%', sm: 380 },
            px: 1.75,
            py: 1.5,
            borderRadius: '12px',
            bgcolor: 'background.paper',
            border: '1.5px solid',
            borderColor: 'primary.main',
            boxShadow: '0 10px 30px rgba(16,21,28,.25)',
          }}
        >
          <Mono label={banner.mono} size={38} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700 }} noWrap>
              {banner.title}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
              {banner.sub}
            </Typography>
          </Box>
        </ButtonBase>
      ) : undefined}
    </Snackbar>
  )
}
