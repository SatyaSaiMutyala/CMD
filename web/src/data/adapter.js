import { REGISTRY } from './registry.js'

/* DATA ADAPTER — turns what the hub backend sends into what the screens show.

   The requests themselves are made by RTK Query (src/store/api.js); every
   answer passes through one of the functions here on its way into the store.
   The screens work with one item shape, so connecting a new software only
   needs a mapping in this file. */

const SOFTWARE_NAMES = Object.fromEntries(REGISTRY.map((sw) => [sw.id, sw.name]))

// "in 18d" -> "in 18 days", "4d overdue" -> "4 days overdue"
const longDue = (text) => String(text || '').replace(/\b(\d+)d\b/, (_, n) => `${n} ${n === '1' ? 'day' : 'days'}`)

// Drop a leading symbol ("⏱ Auto-moved …"): the app fonts have no glyph for it
const plain = (text) => String(text || '').replace(/^[^A-Za-z0-9₹]+/, '')

const titleCase = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase())

/* One LedgerTrace board card -> one approval item */
const fromLedgerTrace = (card) => {
  const tags = (card.tags || []).map(plain).filter(Boolean)
  if (card.process === 'ADVANCE') tags.push('ADVANCE')
  const split = !!card.balance_text // part already released: show what is left
  const actions = card.actions || []
  const approve = actions.find((a) => a.k === 'approve')
  return {
    id: card.code,
    stage: card.stage,
    note: card.part_label || '',
    party: card.vendor,
    amount: split ? card.invoice_total_text : card.amount_text,
    balance: split ? card.balance_text : '',
    // The figure a decision is about
    decides: card.payable_now_text || card.amount_text,
    auto: plain(card.pill),
    tags,
    type: [titleCase(card.process), card.category].filter(Boolean).join(' · '),
    due: card.due_text,
    dueLong: longDue(card.due_text),
    overdue: card.due_state === 'over',
    approve: approve ? approve.label : 'Approve',
    canReject: actions.some((a) => a.k === 'reject'),
  }
}

const MAPPERS = { ledgertrace: fromLedgerTrace }

/** One software's pending answer ->
    { total, stages: { [key]: { count, valueText, items } } } */
export function pendingFrom(swId, data) {
  const map = MAPPERS[swId] || ((card) => card)
  const stages = {}
  const list = (data && data.stages) || []
  list.forEach((st) => {
    stages[st.key] = {
      count: st.count,
      valueText: st.value_text || '',
      items: (st.items || []).map(map),
    }
  })
  return {
    total: (data && data.pending && data.pending.total) || 0,
    stages,
  }
}

// "2026-11-21" -> "21 Nov 2026"
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const niceDate = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''))
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : ''
}

/* One LedgerTrace document in full -> what the details view shows */
const detailFromLedgerTrace = (inv) => {
  const tds = (inv.tds || []).reduce((n, row) => n + (Number(row.amount) || 0), 0)
  const rows = [
    ['Reference', inv.code],
    ["Supplier's document no.", inv.supplier_ref],
    ['Order reference', inv.po && inv.po !== '—' ? inv.po : ''],
    ['Invoice date', niceDate(inv.inv_date)],
    ['Due', [niceDate(inv.due_date), inv.due_text].filter(Boolean).join(' · ')],
    ['Base amount', inv.taxable_text],
    [inv.gst_label || 'GST', inv.gst_text],
    ['Invoice total', inv.invoice_total_text],
    ['TDS withheld', tds ? `₹${Math.round(tds).toLocaleString('en-IN')}` : ''],
    ['Net payable', inv.net_payable_text],
    ['Already paid', inv.paid_text && inv.paid_text !== '₹0' ? inv.paid_text : ''],
    ['To approve now', inv.payable_now_text],
    ['Category', inv.category],
    ['Department', inv.department],
    ['Came from', inv.source],
  ]
  return {
    id: inv.code,
    party: inv.vendor,
    stageName: inv.stage_name,
    facts: rows.filter(([, value]) => value),
    notes: inv.notes || '',
    // Each can be opened by its id
    documents: (inv.documents || []).map((d) => ({
      id: d.id,
      name: d.name,
      group: d.group || '',
      size: d.size || '',
      source: d.source || '',
    })),
    documentsNote: inv.documents_note || '',
    activity: (inv.activity || []).slice(0, 8).map((a) => ({ at: a.at, who: a.who, msg: a.msg })),
  }
}

const DETAIL_MAPPERS = { ledgertrace: detailFromLedgerTrace }

/** One item's full answer -> { id, party, facts, notes, documents, activity } */
export function detailFrom(swId, data) {
  const map = DETAIL_MAPPERS[swId]
  return map && data && data.invoice ? map(data.invoice) : null
}

/** The saved decisions answer -> rows for the History tab, newest first */
export function historyFrom(data) {
  return ((data && data.items) || []).map((d) => ({
    ts: d.at,
    sw: SOFTWARE_NAMES[d.software] || d.software,
    id: d.ref,
    party: d.party,
    amount: d.amount,
    verb: d.verb,
    reason: d.reason || '',
  }))
}

/** A login / me answer -> the session kept in the store */
export function sessionFrom(token, user) {
  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: 'Chairman & Managing Director',
    },
  }
}
