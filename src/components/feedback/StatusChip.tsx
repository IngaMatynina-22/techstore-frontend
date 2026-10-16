import { Chip } from '@mui/material'

const colorMap: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary'> = {
  active: 'success',
  inactive: 'default',
  New: 'info',
  Confirmed: 'primary',
  Processing: 'warning',
  ReadyForShipment: 'warning',
  Shipped: 'info',
  Delivered: 'success',
  Completed: 'success',
  Cancelled: 'error',
  Draft: 'default',
  PartiallyReceived: 'warning',
  Received: 'success',
  Requested: 'info',
  Approved: 'primary',
  Rejected: 'error',
  Restocked: 'success',
  Closed: 'default',
  InProgress: 'warning',
  InReview: 'warning',
  PendingReview: 'warning',
  Applied: 'success',
  low: 'warning',
  out: 'error',
  ok: 'success',
}

export function StatusChip({
  label,
  status,
}: {
  label: string
  status?: string
}) {
  const key = status ?? label
  return <Chip size="small" label={label} color={colorMap[key] ?? 'default'} variant="outlined" />
}

export function BoolChip({ value, trueLabel = 'Активний', falseLabel = 'Неактивний' }: { value: boolean; trueLabel?: string; falseLabel?: string }) {
  return <StatusChip label={value ? trueLabel : falseLabel} status={value ? 'active' : 'inactive'} />
}
