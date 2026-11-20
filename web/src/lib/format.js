// "Thu, 19 Nov 2026"
export const shortDate = (d) =>
  d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })

// "19 Nov, 03:41 pm"
export const stamp = (iso) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

// "3:41 pm"
export const clockTime = (d) => d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })

// "Venkata Rao" -> "VR"
export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
