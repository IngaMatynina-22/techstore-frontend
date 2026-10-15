import { Box, Button, Typography } from '@mui/material'
import type { ReactNode } from 'react'

export function EmptyState({
  title = 'Немає даних',
  description,
  actionLabel,
  onAction,
}: {
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <Box sx={{ py: 6, textAlign: 'center' }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      {description && (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
      )}
      {actionLabel && onAction && (
        <Button variant="contained" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Box>
  )
}

export function QueryError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Box sx={{ py: 4, textAlign: 'center' }}>
      <Typography color="error" gutterBottom>
        {message}
      </Typography>
      {onRetry && (
        <Button onClick={onRetry} sx={{ mt: 1 }}>
          Повторити
        </Button>
      )}
    </Box>
  )
}

export function LoadingBlock({ children }: { children?: ReactNode }) {
  return (
    <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
      {children ?? 'Завантаження…'}
    </Box>
  )
}
