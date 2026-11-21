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
    sub: 'Sales pipeline and pricing',
    connected: true,
    // The two approvals that wait for an admin in Sales Pulse.
    stages: [
      {
        // The pipeline's last tab: the client has signed the contract. It is
        // approved (which signs it as Party One) or sent back for changes.
        key: 'contract',
        label: 'Pending Approval',
        short: 'Contracts',
        done: 'Pending approval is clear',
        next: 'My Accounts',
        back: 'Generate Contract',
        approveTitle: 'APPROVE AND SIGN CONTRACT',
        approveFine:
          'Applies your signature to every page as Party One, executes the contract, emails both parties and issues the client code. Your selfie is kept with the contract as proof of who signed. Logged against your name.',
        approveDone: 'The contract is signed and the client code issued.',
      },
      {
        // A pricing request: approved or rejected, never sent back.
        key: 'quote',
        label: 'Price Quote Approval',
        short: 'Quotes',
        done: 'Price quote approval is clear',
        next: 'Approved pricing',
        approveTitle: 'APPROVE PRICE QUOTE',
        approveFine:
          'Every test still waiting on this request is approved at the price asked, and the salesperson is told. It is logged against your name.',
        approveDone: 'The salesperson has been told.',
        rejectTitle: 'REJECT PRICE QUOTE',
        rejectTo: 'The salesperson',
        rejectFine:
          'Every test still waiting on this request is rejected, and the salesperson sees your reason. It is logged against your name.',
        rejectDone: 'The salesperson has been told.',
      },
    ],
  },
  {
    id: 'prism',
    mono: 'TM',
    name: 'TrustMark',
    sub: 'Brand assets, approvals and governance',
    connected: true,
    // The two places an asset waits there before it is approved: the Version
    // Tracker first, then Approval. Publishing an approved asset is done in
    // TrustMark itself.
    stages: [
      {
        // Work still being revised. Read every revision, say what should
        // change, and send it for approval when it is ready.
        key: 'draft',
        // shown, but not counted as waiting on the CMD
        quiet: true,
        label: 'Version Tracker',
        short: 'Drafts',
        done: 'Nothing is in progress',
        next: 'Approval',
        approveLabel: 'Send for approval',
        approveSlide: 'Slide to send for approval',
        approveBusy: 'Sending…',
        approveTitle: 'SEND FOR APPROVAL',
        approveFine:
          'Sends this asset for approval in TrustMark. It moves to Approval, where you approve it or send it back.',
        approveDone: 'It is now in Approval.',
        rejectTitle: 'LEAVE FEEDBACK',
        rejectTo: 'Stays in the Version Tracker',
        rejectFine:
          'Adds your feedback to the asset’s thread for whoever is revising it. The asset stays a draft.',
        rejectDone: 'Your feedback is on the asset.',
        rejectSlide: 'Slide to send feedback',
        rejectBusy: 'Sending feedback…',
        rejectReason: 'Your feedback · required',
        rejectMissing: 'Write the feedback first.',
      },
      {
        key: 'review',
        label: 'Approval',
        short: 'Approval',
        done: 'Nothing is waiting for approval',
        next: 'Approved',
        back: 'Version Tracker',
        approveLabel: 'Approve',
        approveTitle: 'APPROVE ASSET',
        approveSlide: 'Slide to approve',
        approveBusy: 'Approving…',
        approveFine:
          'Approves this asset in TrustMark. Publishing it is done there. Logged against your name.',
        approveDone: 'It is approved in TrustMark.',
      },
    ],
  },
];

export const findSoftware = id => REGISTRY.find(sw => sw.id === id);
