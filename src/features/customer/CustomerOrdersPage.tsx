import { useMemo, useState } from 'react'
import { FormControl, InputLabel, MenuItem, Select, Stack, TextField } from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/feedback/PageHeader'
import { DataTable, type Column } from '@/components/tables/DataTable'
import { StatusChip } from '@/components/feedback/StatusChip'
import { useUrlState } from '@/hooks/useUrlState'
import { getErrorMessage } from '@/api/client'
import { ordersApi, type OrderSummary } from '@/api/orders.api'

const fmt = (n: number) =>
  `${n.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴`
const fmtDt = (s: string) => new Date(s).toLocaleString('uk-UA')

const STATUS_OPTIONS = [
  { value: '', label: 'Усі' },
  { value: 'New', label: 'Нове' },
  { value: 'Confirmed', label: 'Підтверджено' },
  { value: 'Processing', label: 'В обробці' },
  { value: 'ReadyForShipment', label: 'До відправки' },
  { value: 'Shipped', label: 'Відправлено' },
  { value: 'Delivered', label: 'Доставлено' },
  { value: 'Completed', label: 'Завершено' },
  { value: 'Cancelled', label: 'Скасовано' },
]

export function CustomerOrdersPage() {
  const navigate = useNavigate()
  const { get, page, pageSize, setMany } = useUrlState()
  const statusCode = get('statusCode')
  const orderNumber = get('orderNumber')
  const [draftNumber, setDraftNumber] = useState(orderNumber)

  const listParams = useMemo(
    () => ({
      page,
      pageSize,
      statusCode: statusCode || undefined,
      orderNumber: orderNumber || undefined,
    }),
    [page, pageSize, statusCode, orderNumber],
  )

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['customer-orders', listParams],
    queryFn: () => ordersApi.list(listParams),
  })

  const columns: Column<OrderSummary>[] = [
    {
      id: 'num',
      label: 'Номер',
      render: (r) => (
        <RouterLink to={`/app/orders/${r.id}`} style={{ color: 'inherit' }}>
          {r.orderNumber}
        </RouterLink>
      ),
    },
    { id: 'status', label: 'Статус', render: (r) => <StatusChip label={r.statusName} status={r.statusCode} /> },
    { id: 'total', label: 'Сума', align: 'right', render: (r) => fmt(r.totalAmount) },
    { id: 'created', label: 'Створено', render: (r) => fmtDt(r.createdAt) },
  ]

  return (
    <>
      <PageHeader title="Мої замовлення" description="Історія та статус ваших замовлень" />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          size="small"
          label="Номер"
          value={draftNumber}
          onChange={(e) => setDraftNumber(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setMany({ orderNumber: draftNumber || undefined, page: 1 })
          }}
          sx={{ minWidth: 160 }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Статус</InputLabel>
          <Select
            label="Статус"
            value={statusCode}
            onChange={(e) => setMany({ statusCode: e.target.value || undefined, page: 1 })}
          >
            {STATUS_OPTIONS.map((o) => (
              <MenuItem key={o.value || 'all'} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(r) => r.id}
        loading={isLoading}
        error={error ? getErrorMessage(error) : null}
        onRetry={() => void refetch()}
        emptyTitle="Замовлень не знайдено"
        page={page}
        pageSize={pageSize}
        totalCount={data?.totalCount ?? 0}
        onPageChange={(p) => setMany({ page: p })}
        onPageSizeChange={(s) => setMany({ pageSize: s, page: 1 })}
        onRowClick={(r) => navigate(`/app/orders/${r.id}`)}
      />
    </>
  )
}
