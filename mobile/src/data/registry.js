/* SOFTWARE REGISTRY — add a software = add one entry.

   This file only describes each software and its CMD stages (names, wording).
   What is actually waiting — counts and items — comes live from the hub
   backend through data/adapter.js.

   A stage's `key` is the one the source project uses for it. */
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
  {
    id: 'lexes',
    mono: 'LX',
    name: 'LEXES',
    sub: 'Legal management',
    planned: ['Contracts for signature', 'Legal case decisions'],
  },
  {
    id: 'caxis',
    mono: 'CX',
    name: 'CAXIS',
    sub: 'Company affairs',
    planned: ['Statutory filings', 'Board and resolution papers'],
  },
];

export const findSoftware = id => REGISTRY.find(sw => sw.id === id);
