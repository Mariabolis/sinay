// Shared between customer account pages and the order-status stepper.
// Mirrors the backend's allowedTransitions map (admin_orders.go).

export const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending:    { label: 'Pending',    cls: 'bg-amber-50   text-amber-700'   },
  paid:       { label: 'Paid',       cls: 'bg-blue-50    text-blue-700'    },
  processing: { label: 'Processing', cls: 'bg-blue-50    text-blue-700'    },
  shipped:    { label: 'Shipped',    cls: 'bg-purple-50  text-purple-700'  },
  delivered:  { label: 'Delivered',  cls: 'bg-emerald-50 text-emerald-700' },
  cancelled:  { label: 'Cancelled',  cls: 'bg-red-50      text-red-500'    },
}

// The four customer-facing milestones a normal (non-cancelled) order passes
// through. `paid`/`processing` both map to "Confirmed" — card orders go
// pending→paid, COD orders start straight at processing.
export const STATUS_STEPS = ['placed', 'confirmed', 'shipped', 'delivered'] as const

export const STATUS_STEP_LABELS: Record<(typeof STATUS_STEPS)[number], string> = {
  placed:    'Placed',
  confirmed: 'Confirmed',
  shipped:   'Shipped',
  delivered: 'Delivered',
}

// Maps a raw order.status to how far along the 4-step timeline it is.
export function stepIndexForStatus(status: string): number {
  switch (status) {
    case 'pending':              return 0
    case 'paid':
    case 'processing':           return 1
    case 'shipped':              return 2
    case 'delivered':            return 3
    default:                     return 0
  }
}
