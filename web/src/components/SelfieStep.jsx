import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useEffect, useRef, useState } from 'react'

/* The live selfie Sales Pulse asks for before a contract is signed as Party
   One — the same identity check the client goes through, taken the same way
   its own review window takes it:

     Take selfie  ->  the camera, live  ->  Capture  ->  the photo, with Retake

   The photo is a JPEG data URL handed to `onChange` (null while there is
   none). It is only ever a fresh capture from the camera: there is no way to
   pick a file. The camera is switched off as soon as it is not needed. */
export default function SelfieStep({ value, onChange, disabled }) {
  const [live, setLive] = useState(false)
  const [error, setError] = useState(null)
  const video = useRef(null)
  const stream = useRef(null)

  const stop = () => {
    if (stream.current) stream.current.getTracks().forEach((track) => track.stop())
    stream.current = null
  }
  // Leaving the sheet must not leave the camera on
  useEffect(() => stop, [])

  // The <video> only exists once `live` is set, so the stream is attached here
  useEffect(() => {
    if (live && video.current && stream.current) video.current.srcObject = stream.current
  }, [live])

  const start = async () => {
    setError(null)
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('no camera')
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      setLive(true)
    } catch {
      setError('Camera access is required to take your selfie. Please allow it and try again.')
    }
  }

  const cancel = () => {
    stop()
    setLive(false)
  }

  const capture = () => {
    const v = video.current
    if (!v) return
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth || 480
    canvas.height = v.videoHeight || 360
    canvas.getContext('2d').drawImage(v, 0, 0, canvas.width, canvas.height)
    onChange(canvas.toDataURL('image/jpeg', 0.9))
    cancel()
  }

  const retake = () => {
    onChange(null)
    start()
  }

  const frame = { width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: '8px', display: 'block' }
  return (
    <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'hub.accentSoft', borderRadius: '10px', bgcolor: 'background.paper' }}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 1, color: 'hub.accentDark' }}>
        <CameraAltOutlinedIcon sx={{ fontSize: 16 }} />
        <Typography variant="eyebrow" sx={{ color: 'inherit' }}>
          Selfie verification{' '}
          <Box component="span" sx={{ color: 'error.main' }}>
            *
          </Box>
        </Typography>
      </Stack>

      {value ? (
        <>
          <Box component="img" src={value} alt="Captured selfie" sx={{ ...frame, border: '2px solid', borderColor: 'primary.main' }} />
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'hub.accentDark' }}>
              <CheckCircleIcon sx={{ fontSize: 16 }} />
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'inherit' }}>
                Selfie captured
              </Typography>
            </Stack>
            <Button variant="outlined" size="small" onClick={retake} disabled={disabled}>
              Retake
            </Button>
          </Stack>
        </>
      ) : live ? (
        <>
          <Box component="video" ref={video} autoPlay playsInline muted sx={{ ...frame, bgcolor: '#000' }} />
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Button variant="contained" size="small" startIcon={<CameraAltOutlinedIcon />} onClick={capture} sx={{ flex: 1 }}>
              Capture
            </Button>
            <Button variant="outlined" size="small" onClick={cancel}>
              Cancel
            </Button>
          </Stack>
        </>
      ) : (
        <>
          <Button variant="outlined" color="primary" fullWidth startIcon={<CameraAltOutlinedIcon />} onClick={start} disabled={disabled}>
            Take selfie
          </Button>
          <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: 'text.secondary' }}>
            Allow camera access when prompted.
          </Typography>
        </>
      )}
      {error ? (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      ) : null}
    </Box>
  )
}
