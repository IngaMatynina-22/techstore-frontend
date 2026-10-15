import type { ReactNode } from 'react'
import { Box, Link, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/feedback/PageHeader'
import { QueryError } from '@/components/feedback/EmptyState'
import { getErrorMessage } from '@/api/client'
import { MOVEMENT_LABELS, movementsApi } from '@/api/inventory.api'

const fmtDate = (s: string) => new Date(s).toLocaleString('uk-UA')
const fmtMoney = (n?: number | null) =>
  n == null ? '—' : `${n.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴`

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2">{children}</Typography>
    </Box>
  )
}

export function MovementDetailPage() {
  const { id } = useParams()
  const movementId = Number(id)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['stock-movement', movementId],
    queryFn: () => movementsApi.get(movementId),
    enabled: Number.isFinite(movementId),
  })

  if (error) return <QueryError message={getErrorMessage(error)} onRetry={() => void refetch()} />
  if (isLoading || !data) return null

  return (
    <>
      <PageHeader
        title={`Рух №${data.id}`}
        crumbs={[
          { label: 'Рухи', to: '/inventory/movements' },
          { label: `№${data.id}` },
        ]}
      />
      <Paper sx={{ p: 3 }}>
        <Stack  spacing={4} sx={{ flexWrap: 'wrap' }}>
          <Field label="Тип">{MOVEMENT_LABELS[data.movementType] ?? data.movementType}</Field>
          <Field label="Дата">{fmtDate(data.createdAt)}</Field>
          <Field label="Склад">
            <Link component={RouterLink} to={`/inventory/warehouses/${data.warehouseId}`}>
              {data.warehouseName}
            </Link>
          </Field>
          <Field label="SKU">{data.sku}</Field>
          <Field label="Товар">{data.productName}</Field>
          <Field label="Варіант">{data.variantName}</Field>
          <Field label="Кількість">{data.quantity}</Field>
          <Field label="Залишок до">{data.quantityBefore}</Field>
          <Field label="Залишок після">{data.quantityAfter}</Field>
          <Field label="Собівартість одиниці">{fmtMoney(data.unitCost)}</Field>
          {data.referenceType && (
            <Field label="Посилання">
              {data.referenceType}
              {data.referenceId != null ? ` #${data.referenceId}` : ''}
            </Field>
          )}
          {data.transferGroupId && <Field label="Група переміщення">{data.transferGroupId}</Field>}
          {data.comment && <Field label="Коментар">{data.comment}</Field>}
        </Stack>
      </Paper>
    </>
  )
}
