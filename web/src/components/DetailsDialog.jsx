import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { findSoftware } from '../data/registry.js'
import { useHub } from '../state/hubContext.js'
import { useCreateFileLinkMutation, useGetItemQuery } from '../store/api.js'

function Section({ title, children }) {
  return (
    <Box>
      <Typography variant="eyebrow" sx={{ color: 'text.secondary', display: 'block', mb: 0.75 }}>
        {title}
      </Typography>
      {children}
    </Box>
  )
}

const rowSx = (first) => ({ py: 1, borderTop: first ? 0 : '1px solid', borderColor: 'hub.line2' })

/* One approval in full: the figures behind it, the note from the desk that
   raised it, the attached documents (each opens in a new tab) and the latest
   activity. Approve and Send back are here too, so the CMD can read the
   paperwork and decide without going back to the list. */
export default function DetailsDialog() {
  const { detail } = useHub()
  if (!detail) return null
  // Keyed so each item starts with a clean slate
  return <Details key={`${detail.swId}:${detail.id}`} />
}

function Details() {
  const { detail, closeDetail, openSheet } = useHub()
  const { data, error, isFetching, refetch } = useGetItemQuery({ swId: detail.swId, id: detail.id })
  const [createFileLink] = useCreateFileLinkMutation()
  const [opening, setOpening] = useState(null) // id of the document being opened
  const [fileError, setFileError] = useState(null)

  const sw = findSoftware(detail.swId)
  const stage = sw.stages.find((x) => x.key === detail.stage)
  // At the release stage the forward action is releasing the payment
  const approveLabel = stage && stage.key === 'rel' ? 'Release payment' : 'Approve'

  const openDocument = async (doc) => {
    setOpening(doc.id)
    setFileError(null)
    // Opened now, while the click still counts, so the browser does not block
    // the new tab; the address is filled in once the link has been made.
    const tab = window.open('', '_blank')
    try {
      const url = await createFileLink({ swId: detail.swId, id: detail.id, docId: doc.id }).unwrap()
      if (tab) tab.location.replace(url)
      else window.location.assign(url)
    } catch (e) {
      if (tab) tab.close()
      setFileError((e && e.message) || 'That document could not be opened.')
    } finally {
      setOpening(null)
    }
  }

  const decide = (type) => {
    const { swId, stage: stageKey, id } = detail
    closeDetail()
    openSheet(type, swId, stageKey, id)
  }

  let body
  if (!data && isFetching) {
    body = <Typography sx={{ color: 'text.secondary' }}>Loading the details…</Typography>
  } else if (!data) {
    body = (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={refetch}>
            Try again
          </Button>
        }
      >
        {(error && error.message) || 'Could not load the details.'}
      </Alert>
    )
  } else {
    body = (
      <Grid container columns={12} spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Section title="Figures">
            {data.facts.map(([label, value], i) => (
              <Stack key={label} direction="row" sx={{ justifyContent: 'space-between', gap: 2, ...rowSx(!i) }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'right' }}>
                  {value}
                </Typography>
              </Stack>
            ))}
          </Section>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={2.5}>
            <Section title="Documents">
              {data.documents.length ? (
                data.documents.map((doc, i) => (
                  <Stack
                    key={doc.id}
                    direction="row"
                    sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1.5, ...rowSx(!i) }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
                        {doc.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {[doc.group, doc.size, doc.source].filter(Boolean).join(' · ')}
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      size="small"
                      disabled={!!opening}
                      onClick={() => openDocument(doc)}
                      sx={{ flexShrink: 0 }}
                    >
                      {opening === doc.id ? 'Opening…' : 'Open'}
                    </Button>
                  </Stack>
                ))
              ) : (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  No documents are attached to this item.
                </Typography>
              )}
              {data.documentsNote ? (
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
                  {data.documentsNote}
                </Typography>
              ) : null}
              {fileError ? (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {fileError}
                </Alert>
              ) : null}
            </Section>

            {data.notes ? (
              <Section title="Note">
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {data.notes}
                </Typography>
              </Section>
            ) : null}

            {data.activity.length ? (
              <Section title="Recent activity">
                {data.activity.map((a, i) => (
                  <Box key={`${a.at}-${i}`} sx={rowSx(!i)}>
                    <Typography variant="body2">{a.msg}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {[a.who, a.at].filter(Boolean).join(' · ')}
                    </Typography>
                  </Box>
                ))}
              </Section>
            ) : null}
          </Stack>
        </Grid>
      </Grid>
    )
  }

  return (
    <Dialog open onClose={closeDetail} maxWidth="md" fullWidth scroll="paper" aria-label="Details">
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="mono" sx={{ display: 'block', fontWeight: 600, color: 'hub.info' }}>
          {detail.id} · {sw.name}
          {data && data.stageName ? ` · ${data.stageName}` : ''}
        </Typography>
        {data ? data.party : 'Details'}
      </DialogTitle>
      <DialogContent dividers>{body}</DialogContent>
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={closeDetail} sx={{ mr: 'auto' }}>
          Close
        </Button>
        {data ? (
          <>
            <Button variant="outlined" color="error" onClick={() => decide('back')}>
              Send back
            </Button>
            <Button variant="contained" color="success" onClick={() => decide('approve')}>
              {approveLabel}
            </Button>
          </>
        ) : null}
      </DialogActions>
    </Dialog>
  )
}
