/* SOFTWARE REGISTRY — add a software = add one entry.

   This file only describes each software and its CMD stages (names, wording).
   What is actually waiting — counts and items — comes live from the hub
   backend through data/adapter.js.

   A stage's `key` is the one the source project uses for it. The optional
   wording fields on a stage (approveFine, rejectTitle, rejectTo, …) replace
   the app's default sentences where a software's own words fit better. */
// AIMS signs a record off in two steps, Verify then Approve, and the CMD can
// do either: verify only, or approve outright. The same words fit all four queues.
const AIMS_WORDING = {
  next: 'Approved in AIMS',
  approveTitle: 'APPROVE',
  approveFine:
    'Approves this record in AIMS and makes it final. If it was still waiting to be verified, it is verified and approved together. Logged against your name.',
  approveDone: 'It is approved in AIMS.',
  verifyTo: 'Waiting for approval in AIMS',
  verifyFine:
    'Verifies this record in AIMS; it then waits for approval, which you or another approver can give. Logged against your name.',
  verifyDone: 'It now waits for approval.',
  rejectTitle: 'REJECT',
  rejectTo: 'The person who raised it',
  rejectFine:
    'Marks the record rejected in AIMS and returns it to the person who raised it, with your reason. Logged against your name.',
  rejectDone: 'It is back with the person who raised it.',
};

export const REGISTRY = [
  {
    id: 'ledgertrace',
    mono: 'LT',
    name: 'LedgerTrace',
    sub: 'Procure-to-pay, accounts payable',
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
        bulkTitle: 'Approve all {n} invoices',
        bulkSlide: 'Slide to approve all {n}',
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
        bulkTitle: 'Approve all {n} payments',
        bulkSlide: 'Slide to approve all {n}',
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
        bulkTitle: 'Release all {n} payments',
        bulkSlide: 'Slide to release all {n}',
      },
    ],
  },
  {
    id: 'edos',
    mono: 'ED',
    name: 'eDOS',
    sub: 'Directory of services, test catalogue',
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
        next: 'the live catalogue',
        approveTitle: 'APPROVE TEST CHANGE',
        approveFine:
          'Writes this change to the live test catalogue at once. Logged against your name.',
        approveDone: 'It is live in the catalogue.',
        rejectTitle: 'REJECT TEST CHANGE',
        rejectTo: 'The requester',
        rejectFine:
          'Leaves the catalogue as it is. The person who asked for the change sees your reason. Logged against your name.',
        rejectDone: 'The catalogue is unchanged.',
      },
    ],
  },
  {
    id: 'aims',
    mono: 'AI',
    name: 'AIMS',
    sub: 'Inventory, procurement and stores',
    connected: true,
    // What waits for the CMD in AIMS's four approval queues. AIMS has approve
    // and reject only: no "send back" and no "move all".
    stages: [
      {
        key: 'master',
        label: 'Master Approval',
        short: 'Masters',
        done: 'Master approval is clear',
        ...AIMS_WORDING,
      },
      {
        key: 'indent',
        label: 'Indent Approval',
        short: 'Indents',
        done: 'Indent approval is clear',
        ...AIMS_WORDING,
      },
      {
        key: 'doc',
        label: 'Document Approval',
        short: 'Documents',
        done: 'Document approval is clear',
        ...AIMS_WORDING,
      },
      {
        key: 'adj',
        label: 'Adjustment Approval',
        short: 'Adjustments',
        done: 'Adjustment approval is clear',
        ...AIMS_WORDING,
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
    plannedIcons: ['box', 'trash'],
  },
  {
    id: 'truflow',
    mono: 'TF',
    name: 'TruFlow',
    sub: 'Accounts receivable',
    planned: ['Credit-limit exceptions', 'Receivable write-offs'],
  },
];

export const findSoftware = id => REGISTRY.find(sw => sw.id === id);
