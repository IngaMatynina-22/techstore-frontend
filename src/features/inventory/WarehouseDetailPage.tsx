import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/feedback/PageHeader'
import { BoolChip } from '@/components/feedback/StatusChip'
import { QueryError } from '@/components/feedback/EmptyState'
import { getErrorMessage } from '@/api/client'
import { warehousesApi } from '@/api/inventory.api'

const fmtMoney = (n?: number | null) =>
  n == null || typeof n !== 'number'
    ? '—'
    : `${n.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴`

const summaryLabels: Record<string, string> = {
  skuCount: 'Кількість SKU',
  totalOnHand: 'Всього на складі',
  totalReserved: 'У резерві',
  totalAvailable: 'Доступно',
  lowStockSkuCount: 'Низький залишок (SKU)',
  outOfStockSkuCount: 'Немає в наявності (SKU)',
  itemCount: 'Позицій',
  totalQuantity: 'Загальна кількість',
  notes: 'Примітки',
}

function MetricsGrid({ data, title }: { data: Record<string, unknown>; title: string }) {
  const entries = Object.entries(data).filter(([k, v]) => k !== 'warehouseId' && v != null && v !== '')
  if (!entries.length) {
    return (
      <Paper sx={{ p: 2, flex: 1 }}>
        <Typography variant="subtitle1" sx={{  mb: 1 , fontWeight: 600 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Дані недоступні
        </Typography>
      </Paper>
    )
  }
  return (
    <Paper sx={{ p: 2, flex: 1 }}>
      <Typography variant="subtitle1" sx={{  mb: 2 , fontWeight: 600 }}>
        {title}
      </Typography>
      <Stack spacing={1.5}>
        {entries.map(([key, value]) => (
          <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {summaryLabels[key] ?? key}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {typeof value === 'number' && (key.includes('Total') || key.includes('valuation') || key.includes('Valuation') || key.includes('Amount') || key.includes('Price'))
                ? fmtMoney(value)
                : String(value)}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Paper>
  )
}

export function WarehouseDetailPage() {
  const { id } = useParams()
  const warehouseId = Number(id)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['warehouse', warehouseId],
    queryFn: () => warehousesApi.get(warehouseId),
    enabled: Number.isFinite(warehouseId),
  })

  const summaryQuery = useQuery({
    queryKey: ['warehouse-summary', warehouseId],
    queryFn: () => warehousesApi.summary(warehouseId) as Promise<Record<string, unknown>>,
    enabled: Number.isFinite(warehouseId),
  })

  const valuationQuery = useQuery({
    queryKey: ['warehouse-valuation', warehouseId],
    queryFn: () => warehousesApi.valuation(warehouseId) as Promise<Record<string, unknown>>,
    enabled: Number.isFinite(warehouseId),
  })

  if (error) return <QueryError message={getErrorMessage(error)} onRetry={() => void refetch()} />
  if (isLoading || !data) return null

  const valuationTotal =
    (valuationQuery.data?.valuationByPurchasePrice as number | undefined) ??
    (valuationQuery.data?.totalValue as number | undefined) ??
    (valuationQuery.data?.totalAmount as number | undefined)

  return (
    <>
      <PageHeader
        title={data.name}
        crumbs={[
          { label: 'Склади', to: '/inventory/warehouses' },
          { label: data.name },
        ]}
        actions={
          <Button variant="outlined" component={RouterLink} to={`/inventory?warehouseId=${data.id}`}>
            Залишки складу
          </Button>
        }
      />
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack  spacing={3} sx={{ flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Код
            </Typography>
            <Typography>{data.code}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Адреса
            </Typography>
            <Typography>{data.address ?? '—'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Статус
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <BoolChip value={data.isActive} />
            </Box>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Створено
            </Typography>
            <Typography>{new Date(data.createdAt).toLocaleString('uk-UA')}</Typography>
          </Box>
        </Stack>
      </Paper>

      <Stack sx={{ flexDirection: { xs: 'column', lg: 'row' } }} spacing={2}>
        <MetricsGrid
          title="Підсумок"
          data={(summaryQuery.data as Record<string, unknown>) ?? {}}
        />
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="subtitle1" sx={{  mb: 2 , fontWeight: 600 }}>
            Оцінка за закупівельною ціною
          </Typography>
          {valuationQuery.error ? (
            <QueryError
              message={getErrorMessage(valuationQuery.error)}
              onRetry={() => void valuationQuery.refetch()}
            />
          ) : valuationQuery.isLoading ? (
            <Typography variant="body2" color="text.secondary">
              Завантаження…
            </Typography>
          ) : (
            <>
              <Typography variant="h5" sx={{  mb: 2 , fontWeight: 700 }}>
                {fmtMoney(valuationTotal)}
              </Typography>
              {valuationQuery.data && Object.keys(valuationQuery.data).length > 1 && (
                <Stack spacing={1}>
                  {Object.entries(valuationQuery.data)
                    .filter(([k]) => k !== 'valuationByPurchasePrice' && k !== 'totalValue' && k !== 'totalAmount')
                    .map(([key, value]) => (
                      <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          {summaryLabels[key] ?? key}
                        </Typography>
                        <Typography variant="body2">{String(value)}</Typography>
                      </Box>
                    ))}
                </Stack>
              )}
            </>
          )}
        </Paper>
      </Stack>
      {summaryQuery.error && (
        <Box sx={{ mt: 2 }}>
          <QueryError message={getErrorMessage(summaryQuery.error)} onRetry={() => void summaryQuery.refetch()} />
        </Box>
      )}
    </>
  )
}
