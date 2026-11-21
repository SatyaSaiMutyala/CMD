import OpenInFullIcon from '@mui/icons-material/OpenInFull'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

/* The file itself, shown in place — the way the TrustMark drawer shows it:
     image   the picture (click for full size)
     pdf     the document, paged in an embedded viewer, with "Open full screen"
     video   a player, with the still as its poster
     audio   a player
   Anything else (a zip, a Word or design file) has no viewer of its own: a zip
   is looked inside and the rest are downloaded, from the Files list below.

   `preview` is { kind, url, poster }. The link goes straight to the source's
   storage and is short-lived; nothing passes through the hub. */
export default function AssetPreview({ preview, name }) {
  if (!preview || !preview.url) return null
  const full = () => window.open(preview.url, '_blank', 'noopener')
  const frame = { display: 'block', width: '100%', border: '1px solid', borderColor: 'divider', borderRadius: '8px', bgcolor: 'hub.sunk' }

  if (preview.kind === 'image') {
    return (
      <Box
        component="img"
        src={preview.url}
        alt={name}
        title="Click to view full size"
        onClick={full}
        sx={{ ...frame, maxHeight: 420, objectFit: 'contain', cursor: 'zoom-in' }}
      />
    )
  }
  if (preview.kind === 'pdf') {
    return (
      <Box>
        <Box component="iframe" title={name} src={preview.url} sx={{ ...frame, height: { xs: 360, md: 480 } }} />
        <Button variant="outlined" size="small" startIcon={<OpenInFullIcon />} onClick={full} sx={{ mt: 1 }}>
          Open full screen
        </Button>
      </Box>
    )
  }
  if (preview.kind === 'video') {
    return (
      <Box
        component="video"
        src={preview.url}
        poster={preview.poster || undefined}
        controls
        preload="metadata"
        sx={{ ...frame, maxHeight: 420, bgcolor: '#000' }}
      />
    )
  }
  if (preview.kind === 'audio') {
    return (
      <Box sx={{ ...frame, p: 2 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
          {name}
        </Typography>
        <Box component="audio" src={preview.url} controls sx={{ width: '100%' }} />
      </Box>
    )
  }
  return null
}
