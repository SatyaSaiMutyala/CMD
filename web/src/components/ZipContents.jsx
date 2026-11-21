import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { useGetContentsQuery } from '../store/api.js'
import { fonts } from '../theme/tokens.js'

/* What is inside a zip, read where it is stored — the archive itself is never
   downloaded — the way Trust Prism's own zip browser lists it. A picture, a
   PDF or a text file opens in a new tab; anything else is saved. Password-
   protected entries are listed but cannot be opened.

   `onOpen(entryDocId)` opens one entry like any other document. */

// "zip~master~<base64url of the path>" — how one file inside a zip is asked for
const entryId = (docId, path) => {
  const bytes = new TextEncoder().encode(path)
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return `zip~${docId}~${btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`
}

export default function ZipContents({ swId, id, docId, onOpen, opening }) {
  const { data, error, isFetching } = useGetContentsQuery({ swId, id, docId })
  const [filter, setFilter] = useState('')

  if (isFetching && !data) {
    return <Typography variant="body2" sx={{ color: 'text.secondary', py: 1 }}>Reading the archive…</Typography>
  }
  if (error || !data) {
    return (
      <Typography variant="body2" sx={{ color: 'error.main', py: 1 }}>
        {(error && error.message) || 'Could not read this zip.'}
      </Typography>
    )
  }
  const entries = data.entries || []
  if (!entries.length) {
    return <Typography variant="body2" sx={{ color: 'text.secondary', py: 1 }}>This zip is empty.</Typography>
  }
  const needle = filter.trim().toLowerCase()
  const shown = needle ? entries.filter((e) => e.name.toLowerCase().includes(needle)) : entries

  return (
    <Box sx={{ mt: 1, p: 1.25, border: '1px solid', borderColor: 'hub.line2', borderRadius: '8px', bgcolor: 'hub.bg' }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.75 }}>
        <Typography variant="eyebrow" sx={{ color: 'text.secondary' }}>
          Inside this zip · {entries.length} {entries.length === 1 ? 'file' : 'files'}
        </Typography>
        {entries.length > 8 ? (
          <TextField
            size="small"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter files…"
            slotProps={{ htmlInput: { 'aria-label': 'Filter the files in this zip' } }}
            sx={{ width: 180 }}
          />
        ) : null}
      </Stack>
      <Box sx={{ maxHeight: 260, overflowY: 'auto' }}>
        {shown.map((entry) => {
          const cut = entry.name.lastIndexOf('/')
          const eid = entryId(docId, entry.name)
          return (
            <Stack
              key={entry.name}
              direction="row"
              sx={{ alignItems: 'center', gap: 1, py: 0.5, borderTop: '1px solid', borderColor: 'hub.line2' }}
            >
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                  <Box component="span" sx={{ color: 'hub.faint' }}>
                    {cut >= 0 ? entry.name.slice(0, cut + 1) : ''}
                  </Box>
                  <b>{entry.name.slice(cut + 1)}</b>
                </Typography>
              </Box>
              <Typography sx={{ fontFamily: fonts.mono, fontSize: 11.5, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                {entry.size_text}
              </Typography>
              {entry.encrypted ? (
                <LockOutlinedIcon titleAccess="Password-protected inside the zip" sx={{ fontSize: 16, color: 'hub.faint', mx: 1.5 }} />
              ) : (
                <Button variant="outlined" size="small" disabled={!!opening} onClick={() => onOpen(eid)} sx={{ flexShrink: 0, minWidth: 64 }}>
                  {opening === eid ? '…' : entry.opens ? 'Open' : 'Save'}
                </Button>
              )}
            </Stack>
          )
        })}
        {!shown.length ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', py: 1 }}>
            No files match “{filter}”.
          </Typography>
        ) : null}
      </Box>
      {data.truncated ? (
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.75 }}>
          Showing the first {entries.length} of {data.count} entries.
        </Typography>
      ) : null}
    </Box>
  )
}
