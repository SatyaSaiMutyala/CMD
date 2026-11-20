/* SOFTWARE REGISTRY — add a software = add one entry.

   This file only describes each software and its CMD stages (names, wording).
   What is actually waiting — counts and items — comes live from the hub
   backend through data/adapter.js.

   A stage's `key` is the one the source project uses for it. The optional
   wording fields on a stage (approveFine, rejectTitle, rejectTo, …) replace
   the default sentences where a software's own words fit better. */
export const REGISTRY = [
  {
    id: 'ledgertrace',
    mono: 'LT',
    name: 'LedgerTrace',
    sub: 'Procure-to-pay · Accounts payable',
    connected: true,
    stages: [
      {
        key: 'inv',
        stage: 3,
        label: 'Invoice Approval',
        short: 'Invoice',
        done: 'Invoice approval is clear',
        next: 'Tally Entry',
        back: 'AP Verification',
        approveTitle: 'APPROVE INVOICE',
        confirm: 'Confirm approval',
        bulk: 'Move all {n} to Tally Entry',
      },
      {
        key: 'pay',
        stage: 6,
        label: 'Pay Approval',
        short: 'Pay',
        done: 'Pay approval is clear',
        next: 'Payment Release',
        back: 'Release Queue',
        approveTitle: 'APPROVE PAYMENT',
        confirm: 'Confirm approval',
        bulk: 'Move all {n} to Payment Release',
      },
      {
        key: 'rel',
        stage: 7,
        label: 'Payment Release',
        short: 'Release',
        done: 'Payment release is clear',
        next: 'Paid · Tally Entry',
        back: 'CMD Pay Approval',
        approveTitle: 'RELEASE PAYMENT',
        confirm: 'Confirm release',
        bulk: 'Release all {n} payments',
      },
    ],
  },
  {
    id: 'edos',
    mono: 'ED',
    name: 'eDOS',
    sub: 'Directory of services · Test catalogue',
    connected: true,
    // eDOS decides a request one way or the other: approve or reject. It has
    // no "send back" and no "move all" (so the stage has no `back` or `bulk`).
    stages: [
      {
        key: 'req',
        stage: 1,
        label: 'Test Approval',
        short: 'Requests',
        done: 'Test approval is clear',
        next: 'Live catalogue',
        approveTitle: 'APPROVE TEST CHANGE',
        confirm: 'Confirm approval',
        approveFine: 'This change is written to the live test catalogue at once. It is logged against your name.',
        approveDone: 'It is live in the catalogue.',
        rejectTitle: 'Reject test change',
        rejectTo: 'The requester',
        rejectFine:
          'The catalogue is left as it is. The person who asked for the change sees your reason. It is logged against your name.',
        rejectDone: 'The catalogue is unchanged.',
        rejectLabel: 'Reject',
      },
    ],
  },
  {
    id: 'sp365',
    mono: 'SP',
    name: 'Sales Pulse 365',
    sub: 'Sales MIS and pricing',
    planned: ['Special-pricing requests', 'Customer commitment changes'],
  },
  {
    id: 'pace',
    mono: 'PA',
    name: 'PACE',
    sub: 'Payroll and payment reconciliation',
    planned: ['Payment reconciliation sign-off', 'Worker category exceptions'],
  },
  {
    id: 'tams',
    mono: 'TA',
    name: 'TAMS',
    sub: 'Asset management',
    planned: ['Asset capitalisation', 'Disposal and write-off'],
  },
  {
    id: 'truflow',
    mono: 'TF',
    name: 'TruFlow',
    sub: 'Accounts receivable',
    planned: ['Credit-limit exceptions', 'Receivable write-offs'],
  },
]

export const findSoftware = (id) => REGISTRY.find((sw) => sw.id === id)
